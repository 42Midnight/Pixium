import { useState, useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from 'react';
import styles from './TagInput.module.css';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

function tagColor(_name: string): string {
  return '#3a3a3a';
}

export default function TagInput({ tags, onChange, placeholder = '输入标签，按回车添加' }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback((value: string) => {
    const trimmed = value.trim().replace(/\s+/g, '_').replace(/#/g, '');
    if (!trimmed) return;
    if (tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
  }, [tags, onChange]);

  const removeTag = useCallback((index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  }, [tags, onChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  }, [inputValue, tags, addTag, removeTag]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted.includes(',') || pasted.includes('，')) {
      e.preventDefault();
      const newTags = pasted.split(/[,，]/).map(t => t.trim().replace(/\s+/g, '_').replace(/#/g, '')).filter(t => t.length > 0);
      const unique = newTags.filter(t => !tags.includes(t));
      if (unique.length > 0) {
        onChange([...tags, ...unique]);
      }
    }
  }, [tags, onChange]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className={styles.tagInputContainer} onClick={focusInput}>
      {tags.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className={styles.tagPill}
          style={{ backgroundColor: tagColor(tag) }}
        >
          {tag}
          <button
            type="button"
            className={styles.tagPillRemove}
            onClick={e => {
              e.stopPropagation();
              removeTag(index);
            }}
            title="移除标签"
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        className={styles.tagInputField}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={tags.length === 0 ? placeholder : ''}
        spellCheck={false}
      />
    </div>
  );
}

export { tagColor };
