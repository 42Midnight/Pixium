import type { WorkData, Collection } from '../types';

// =========================================================================
// Types
// =========================================================================

export interface TrieEntry {
  /** The full text that was indexed (e.g. the complete title or prompt value) */
  fullText: string;
  /** Which field this entry came from */
  field: string;
  /** The item ID this entry belongs to */
  itemId: string;
}

interface TrieNode {
  children: Map<string, TrieNode>;
  entries: TrieEntry[];
}

export interface DateRange {
  start: number; // YYYYMMDD integer
  end: number;   // YYYYMMDD integer
}

export interface ParsedQuery {
  /** Title keywords (split by spaces, AND logic) */
  keywords: string[];
  /** Parsed date ranges (OR logic) */
  dateRanges?: DateRange[];
  /** Tags extracted from #tagName patterns (AND logic) */
  tagFilter?: string[];
}

export interface Suggestion {
  /** The matching text to display */
  text: string;
  /** Which item this suggestion belongs to */
  itemId: string;
  /** Which field matched (e.g. 'title', 'prompt.Positive') */
  field: string;
}

export interface SearchIndex {
  trie: Trie;
  /** token → set of item IDs (includes all prefixes of length ≥ 2 for substring search) */
  invertedIndex: Map<string, Set<string>>;
  /** All unique tags across all items (for # suggestions) */
  allTags: string[];
}

// =========================================================================
// Tokenization
// =========================================================================

/**
 * Split text into word tokens.
 * Handles both whitespace-separated English and CJK text by also
 * generating character bigrams for CJK ranges.
 */
const CJK_RE = /[一-鿿㐀-䶿]/;

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  // Split on whitespace and common punctuation
  const tokens = lower
    .split(/[\s,./;:'"!?()\[\]{}<>，。、；：！？（）【】《》""''…—\-+|=*&^%$#@~`\\]+/)
    .filter(t => t.length > 0);

  // For tokens containing CJK characters, also generate bigrams
  // so partial-character searches work (e.g. typing 2 chars of a 4-char word)
  const result: string[] = [...tokens];
  for (const token of tokens) {
    if (CJK_RE.test(token) && token.length >= 2) {
      for (let i = 0; i < token.length - 1; i++) {
        result.push(token.substring(i, i + 2));
      }
      // Also add individual characters for single-char search
      for (let i = 0; i < token.length; i++) {
        result.push(token.charAt(i));
      }
    }
  }
  return result;
}

// =========================================================================
// Trie (Prefix Tree) — for fast prefix-based suggestions
// =========================================================================

class Trie {
  private root: TrieNode = { children: new Map(), entries: [] };

  /** Insert a word with its source metadata */
  insert(word: string, entry: TrieEntry): void {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map(), entries: [] });
      }
      node = node.children.get(char)!;
    }
    // Avoid duplicate entries at the same node
    if (!node.entries.some(e => e.itemId === entry.itemId && e.field === entry.field)) {
      node.entries.push(entry);
    }
  }

  /** Search for all entries under a given prefix */
  search(prefix: string): TrieEntry[] {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children.has(char)) return [];
      node = node.children.get(char)!;
    }
    return this.collectEntries(node);
  }

  /** Collect all entries in the subtree rooted at node (BFS) */
  private collectEntries(node: TrieNode): TrieEntry[] {
    const results: TrieEntry[] = [];
    const seen = new Set<string>(); // deduplicate by itemId+field+text
    const queue: TrieNode[] = [node];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const entry of current.entries) {
        const key = `${entry.itemId}|${entry.field}|${entry.fullText}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(entry);
        }
      }
      for (const child of current.children.values()) {
        queue.push(child);
      }
    }
    return results;
  }
}

// =========================================================================
// Searchable text extraction
// =========================================================================

/** Generate all prefixes of length ≥ 2 for a token (enables substring search) */
function prefixExpand(token: string): string[] {
  if (token.length <= 2) return [];
  const prefixes: string[] = [];
  for (let i = 2; i < token.length; i++) {
    prefixes.push(token.substring(0, i));
  }
  return prefixes;
}

/** Get field-labeled text fragments for trie indexing */
function getFieldTexts(item: WorkData | Collection): { text: string; field: string }[] {
  const result: { text: string; field: string }[] = [];

  if ('title' in item) {
    const work = item as WorkData;
    if (work.title) result.push({ text: work.title, field: '标题' });
    // Index each tag for search and suggestions
    if (work.tags && work.tags.length > 0) {
      for (const tag of work.tags) {
        result.push({ text: tag, field: '标签' });
      }
    }
  } else {
    const coll = item as Collection;
    if (coll.name) result.push({ text: coll.name, field: '相册名' });
  }

  return result;
}

// =========================================================================
// Date Range Parser
// =========================================================================

/**
 * Parse a search query string, extracting optional date range specifier.
 *
 * Supported syntax (case-insensitive):
 *   date2026.5.5-2026.5.6   →  date range from May 5 to May 6, 2026
 *   date2026.5.6-2026.5.5   →  same range (order-independent)
 *   date2026.05.05-2026.05.06 → leading zeros accepted
 *
 * The date pattern is removed from the query; the remainder becomes textQuery.
 */
const DATE_PATTERN = /date\s*(\d{4})\.(\d{1,2})\.(\d{1,2})\s*-\s*(\d{4})\.(\d{1,2})\.(\d{1,2})/gi;
const TAG_PATTERN = /#([\w一-鿿぀-ゟ゠-ヿ-]+)/g;

export function parseSearchQuery(raw: string): ParsedQuery {
  // Extract #tagName patterns
  const tagFilter: string[] = [];
  const tagMatches = raw.matchAll(TAG_PATTERN);
  for (const match of tagMatches) {
    tagFilter.push(match[1].toLowerCase());
  }

  // Extract ALL date patterns (OR logic)
  const dateRanges: DateRange[] = [];
  const dateMatches = raw.matchAll(DATE_PATTERN);
  for (const match of dateMatches) {
    const y1 = parseInt(match[1], 10);
    const m1 = parseInt(match[2], 10);
    const d1 = parseInt(match[3], 10);
    const y2 = parseInt(match[4], 10);
    const m2 = parseInt(match[5], 10);
    const d2 = parseInt(match[6], 10);
    const date1 = y1 * 10000 + m1 * 100 + d1;
    const date2 = y2 * 10000 + m2 * 100 + d2;
    dateRanges.push({
      start: Math.min(date1, date2),
      end: Math.max(date1, date2),
    });
  }

  // Remove tag and date patterns, split remaining into keywords (AND logic)
  const keywords = raw
    .replace(TAG_PATTERN, '')
    .replace(DATE_PATTERN, '')
    .trim()
    .split(/\s+/)
    .filter(k => k.length > 0)
    .map(k => k.toLowerCase());

  // Reset lastIndex
  DATE_PATTERN.lastIndex = 0;
  TAG_PATTERN.lastIndex = 0;

  return {
    keywords,
    dateRanges: dateRanges.length > 0 ? dateRanges : undefined,
    tagFilter: tagFilter.length > 0 ? tagFilter : undefined,
  };
}

/** Convert a DateInfo-like object to a YYYYMMDD integer for comparison */
export function toDateValue(createdAt?: { year: number; month: number; day: number } | null): number | null {
  if (!createdAt) return null;
  return createdAt.year * 10000 + createdAt.month * 100 + createdAt.day;
}

// =========================================================================
// Index Building
// =========================================================================

/**
 * Build the complete search index (trie + inverted index) from a list of items.
 * Call this in a useMemo — it rebuilds whenever items change.
 */
export function buildSearchIndex(items: (WorkData | Collection)[]): SearchIndex {
  const trie = new Trie();
  const invertedIndex = new Map<string, Set<string>>();
  const allTagsSet = new Set<string>();

  const addToIndex = (token: string, itemId: string) => {
    if (!invertedIndex.has(token)) {
      invertedIndex.set(token, new Set());
    }
    invertedIndex.get(token)!.add(itemId);
  };

  for (const item of items) {
    const fieldTexts = getFieldTexts(item);
    const titleText = 'title' in item ? item.title : item.name;

    // Collect unique tags
    if ('title' in item) {
      const work = item as WorkData;
      if (work.tags) {
        for (const tag of work.tags) {
          allTagsSet.add(tag);
        }
      }
    }

    // Index into trie: insert each word from each field (suggestions)
    for (const { text, field } of fieldTexts) {
      const tokens = tokenize(text);
      for (const token of tokens) {
        trie.insert(token, { fullText: text, field, itemId: item.id });
      }
    }

    // Index into inverted index (title only): tokens + all prefixes ≥ 2
    if (titleText) {
      const tokens = tokenize(titleText);
      for (const token of tokens) {
        addToIndex(token, item.id);
        // Expand with all prefixes for substring search capability
        for (const prefix of prefixExpand(token)) {
          addToIndex(prefix, item.id);
        }
      }
    }
  }

  return { trie, invertedIndex, allTags: [...allTagsSet] };
}

// =========================================================================
// Search
// =========================================================================

/** Intersection of two sets — returns a new set with elements in both */
function intersectSets<T>(a: Set<T>, b: Set<T>): Set<T> {
  const result = new Set<T>();
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  for (const item of smaller) {
    if (larger.has(item)) result.add(item);
  }
  return result;
}

/**
 * Filter items by a search query string.
 *
 * - Text without `#`: title substring search (case-insensitive)
 * - `#tagName`: strict tag match (case-insensitive exact match)
 * - `dateYYYY.M.D-YYYY.M.D`: date range filter
 * - Multiple filters combine with AND logic
 * - Works with both WorkData and Collection items
 */
export function searchItems(
  items: (WorkData | Collection)[],
  rawQuery: string,
  index: SearchIndex | null,
): (WorkData | Collection)[] {
  const trimmed = rawQuery.trim();
  if (!trimmed) return items;

  const parsed = parseSearchQuery(trimmed);

  let resultIds: Set<string> | null = null;

  // Step 1: Title keywords — AND logic, inverted index + substring fallback
  if (parsed.keywords.length > 0) {
    for (const kw of parsed.keywords) {
      const kwIds = index ? invertedTitleSearch(index, kw) : scanTitleFallback(items, kw);
      if (kwIds.size === 0) return [];
      if (resultIds === null) {
        resultIds = kwIds;
      } else {
        resultIds = intersectSets(resultIds, kwIds);
        if (resultIds.size === 0) return [];
      }
    }
  }

  // Step 2: Date ranges — OR logic
  if (parsed.dateRanges && parsed.dateRanges.length > 0) {
    const dateIds = filterByDateRanges(items, parsed.dateRanges);
    if (resultIds === null) {
      resultIds = dateIds;
    } else {
      resultIds = intersectSets(resultIds, dateIds);
    }
  }

  // Step 3: Tags — AND logic
  if (parsed.tagFilter && parsed.tagFilter.length > 0) {
    const tagIds = filterByTags(items, parsed.tagFilter);
    if (resultIds === null) {
      resultIds = tagIds;
    } else {
      resultIds = intersectSets(resultIds, tagIds);
    }
  }

  if (resultIds === null) return items;
  return items.filter(item => resultIds!.has(item.id));
}

/** O(1) inverted index lookup — prefix expansion ensures all substrings are indexed */
function invertedTitleSearch(index: SearchIndex, keyword: string): Set<string> {
  const tokenIds = index.invertedIndex.get(keyword);
  return tokenIds ? new Set(tokenIds) : new Set<string>();
}

/** Fallback title substring scan when index is unavailable */
function scanTitleFallback(items: (WorkData | Collection)[], keyword: string): Set<string> {
  const result = new Set<string>();
  for (const item of items) {
    const text = 'title' in item ? item.title : item.name;
    if (text.toLowerCase().includes(keyword)) result.add(item.id);
  }
  return result;
}

/** Get the set of item IDs that fall within ANY of the date ranges (OR logic) */
function filterByDateRanges(items: (WorkData | Collection)[], ranges: DateRange[]): Set<string> {
  const result = new Set<string>();
  for (const item of items) {
    if (!('title' in item)) {
      result.add(item.id);
      continue;
    }
    const work = item as WorkData;
    const dv = toDateValue(work.createdAt);
    if (dv === null) {
      result.add(work.id);
      continue;
    }
    // OR: match any range
    for (const range of ranges) {
      if (dv >= range.start && dv <= range.end) {
        result.add(work.id);
        break;
      }
    }
  }
  return result;
}

/** Get the set of item IDs that have at least one of the specified tags */
function filterByTags(items: (WorkData | Collection)[], tags: string[]): Set<string> {
  const result = new Set<string>();
  const tagSet = new Set(tags.map(t => t.toLowerCase()));
  for (const item of items) {
    if (!('title' in item)) continue; // Collections don't have tags
    const work = item as WorkData;
    if (work.tags?.some(t => tagSet.has(t.toLowerCase()))) {
      result.add(work.id);
    }
  }
  return result;
}

// =========================================================================
// Suggestions (Autocomplete)
// =========================================================================

/**
 * Get search suggestions based on the current input prefix.
 * Uses the trie for fast prefix lookup.
 *
 * Returns up to `limit` suggestions, deduplicated by display text,
 * sorted with shorter (more exact) matches first.
 */
export function getSuggestions(
  index: SearchIndex | null,
  prefix: string,
  limit: number = 8,
): Suggestion[] {
  const trimmed = prefix.trim().toLowerCase();
  if (!trimmed || !index) return [];

  // Detect tag search: user typed #
  const hashIdx = trimmed.lastIndexOf('#');
  const isTagSearch = hashIdx !== -1;
  const tagPrefix = isTagSearch ? trimmed.slice(hashIdx + 1) : '';

  // Parse out date / tag patterns for regular title suggestions
  const parsed = parseSearchQuery(trimmed);
  const searchText = parsed.keywords.join(' ').toLowerCase();

  // If user is typing a tag (e.g. "#po"), search only tags
  if (isTagSearch) {
    if (!tagPrefix) {
      // Just "#" with no text yet — show some tags as hints
      const tagEntries = collectAllTags(index);
      const suggestions: Suggestion[] = [];
      const seen = new Set<string>();
      for (const entry of tagEntries) {
        if (seen.has(entry.fullText)) continue;
        seen.add(entry.fullText);
        suggestions.push({
          text: `#${entry.fullText}`,
          itemId: entry.itemId,
          field: '标签',
        });
        if (suggestions.length >= limit) break;
      }
      return suggestions;
    }

    // Search trie for matching tag text
    const entries = index.trie.search(tagPrefix);
    const seen = new Set<string>();
    const suggestions: Suggestion[] = [];

    for (const entry of entries) {
      if (entry.field !== '标签') continue;
      if (seen.has(entry.fullText)) continue;
      seen.add(entry.fullText);
      suggestions.push({
        text: `#${entry.fullText}`,
        itemId: entry.itemId,
        field: '标签',
      });
      if (suggestions.length >= limit * 2) break;
    }

    suggestions.sort((a, b) => a.text.length - b.text.length || a.text.localeCompare(b.text));
    return suggestions.slice(0, limit);
  }

  // Regular suggestions (no # in input)
  if (!searchText) return [];

  const tokens = searchText.split(/\s+/).filter(t => t.length > 0);
  const lastToken = tokens[tokens.length - 1];

  if (!lastToken) return [];

  const entries = index.trie.search(lastToken);

  const seen = new Set<string>();
  const suggestions: Suggestion[] = [];

  for (const entry of entries) {
    // Tag matches: always show with # prefix
    const displayText = entry.field === '标签' ? `#${entry.fullText}` : entry.fullText;
    if (seen.has(displayText)) continue;
    seen.add(displayText);
    suggestions.push({
      text: displayText,
      itemId: entry.itemId,
      field: entry.field,
    });
    if (suggestions.length >= limit * 2) break;
  }

  suggestions.sort((a, b) => {
    const lenDiff = a.text.length - b.text.length;
    if (lenDiff !== 0) return lenDiff;
    return a.text.localeCompare(b.text);
  });

  return suggestions.slice(0, limit);
}

/** Collect unique tag entries (from pre-collected allTags in index) */
function collectAllTags(index: SearchIndex): TrieEntry[] {
  return index.allTags.map(tag => ({
    fullText: tag,
    field: '标签' as const,
    itemId: '', // tag-only suggestions don't need itemId
  }));
}
