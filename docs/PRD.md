# Pixium — Product Requirements Document

## 1. Product Identity

| Field | Value |
|---|---|
| **Product Name** | Pixium |
| **Tagline (EN)** | A local-first desktop application that stores images together with their supporting structured text information |
| **Tagline (CN)** | 一款本地优先的桌面相册应用，支持将图片和文本信息一起存储 |
| **Elevator Pitch** | Pixium is a Windows desktop app purpose-built for AI image creators (ComfyUI / Stable Diffusion users). It pairs generated images with their prompt metadata in structured text fields, organizes them into collections with a responsive masonry waterfall layout, and keeps all data on your local filesystem — no cloud, no account, no uploads. |
| **Author** | 42Midnight |
| **License** | MIT |
| **Repository** | https://github.com/42Midnight/Pixium |
| **Keywords** | comfyui, prompt, manager, stable-diffusion, electron |

---

## 2. Product Positioning

### Target Audience

**Primary: AI Image Creators** — Users of ComfyUI, Stable Diffusion WebUI, and similar tools who:

- Generate dozens to hundreds of AI images per session
- Need to preserve prompt metadata alongside each image
- Want to organize outputs by project, theme, or generation session
- Frequently copy and reuse prompts
- Value local-first, private data storage — images never leave their machine

**Secondary: Image Collectors** — Users who want a local album manager with waterfall browsing and tagging, without the AI-specific features.

### Core Value Proposition

1. **Local-first** — All data lives on your filesystem as plain JSON and image files. No server, no account, no internet required.
2. **Prompt-native** — Structured text fields are first-class citizens, not an afterthought. Copy individual fields, batch-select, or copy all with one click.
3. **Auto-extract** — Drop a PNG from ComfyUI or SD WebUI and Pixium parses the embedded generation parameters automatically.
4. **Waterfall browsing** — Responsive masonry layout adapts to window width, making large collections scannable at a glance.
5. **Batch operations** — Move, copy, download, or delete dozens of works at once.

### Non-Goals

- Cloud sync / multi-device support
- Image editing or generation
- Collaborative features
- macOS / Linux support (Windows-only for now)

---

## 3. User Personas

### Persona A: AI Generation Power User (ComfyUI)

- **Workflow**: Runs ComfyUI → generates batches of images → saves outputs to a folder → drags into Pixium
- **Pain point**: ComfyUI outputs are scattered across folders; prompts get lost in filename hashes; finding "that one image with the good seed" takes forever
- **Pixium solves**: Auto-extracts prompts from PNG metadata, organizes by collection, searchable by title/tag/date, one-click prompt copy

### Persona B: Casual Image Collector

- **Workflow**: Browses the web, saves reference images, wants to keep them organized locally
- **Pain point**: File Explorer is not a gallery; cloud services require uploads and accounts
- **Pixium solves**: Drag-and-drop collection building, tag-based organization, local-only storage

---

## 4. Feature Inventory

### 4.1 Collection Management

| # | Feature | Description |
|---|---|---|
| C1 | Create Collection | Name + optional custom cover image with drag-to-crop positioning |
| C2 | Edit Collection | Rename (auto-renames disk folder + updates all references), change cover, adjust crop |
| C3 | Delete Collection | Removes folder, cover, and updates collections.json with cascading cleanup |
| C4 | Drag-to-reorder | Drag collection cards on home page to reorder |
| C5 | Virtual "All Works" | Auto-generated collection showing every work across all collections |
| C6 | Collection sorting | Configurable position for new collections: front or back |

### 4.2 Work Management

| # | Feature | Description |
|---|---|---|
| W1 | Add Work | Drag-and-drop or file picker; reorder images within preview; merge mode (all in one) or batch mode (one per image) |
| W2 | Edit Work | Change images, update text fields, tags, cover, and collection assignment |
| W3 | Delete Work | With confirmation dialog |
| W4 | Title | Auto-derived from filename (spaces → underscores) or custom |
| W5 | Tags | Type-to-add with Enter; Backspace removes last; paste comma-separated to bulk-add |
| W6 | Cover Crop | Manual drag-to-crop modal with live preview |
| W7 | Duplicate Detection | Checks for existing folder name before creating |

### 4.3 Prompt / Text Fields

| # | Feature | Description |
|---|---|---|
| P1 | Dynamic Fields | Add/remove key-value text field pairs per work |
| P2 | Templates | Pre-defined field name sets; select from dropdown when creating a work |
| P3 | PNG Auto-extract | Parses ComfyUI API format, ComfyUI workflow format, and SD WebUI parameters from PNG metadata |
| P4 | Click-to-copy | Click any single field to copy its value |
| P5 | Multi-select Copy | Check specific fields, copy selected joined by newlines |
| P6 | Copy All | One-click copy all field values |

### 4.4 Browsing & Search

| # | Feature | Description |
|---|---|---|
| B1 | Waterfall Layout | Responsive masonry (1–6 columns) based on window width |
| B2 | Search Bar | Real-time typeahead with trie-based autocomplete; supports `#tag`, `dateYYYY.M.D-YYYY.M.D`, and plain text |
| B3 | Date Grouping | Toggle to group works by creation date with collapsible headers |
| B4 | Scroll Restoration | Restores position when navigating back from detail/edit |

### 4.5 Detail View

| # | Feature | Description |
|---|---|---|
| D1 | Image Viewer | Full-size with scroll-wheel / pinch zoom and drag-to-pan |
| D2 | Multi-image | Navigate between images within a single work |
| D3 | Filename Overlay | Optional overlay (toggle in Settings) |
| D4 | Right-click Context Menu | Copy image, Download, Save As |
| D5 | Quick Actions | Favorite, Edit, Download, Save As, Delete |

### 4.6 Batch Operations

| # | Feature | Description |
|---|---|---|
| BO1 | Batch Select Mode | Toggle to multi-select works or collections |
| BO2 | Select by Date Group | Click a date header to select all works in that group |
| BO3 | Batch Move | Move selected works to another collection |
| BO4 | Batch Copy | Copy selected works to another collection |
| BO5 | Batch Download | Download selected to configured path or pick folder |
| BO6 | Batch Delete | Delete multiple works or collections |

### 4.7 Favorites

| # | Feature | Description |
|---|---|---|
| F1 | Favorite Toggle | Heart icon on work cards and detail page |
| F2 | Favorites Page | Grid of all favorited works |
| F3 | Sort Order | Newest first or oldest first |
| F4 | Context Menu | Edit, Download, Save As, Delete from favorites page |

### 4.8 Templates

| # | Feature | Description |
|---|---|---|
| T1 | Create Template | Named template with key-value field pairs |
| T2 | Edit Template | Add/remove/reorder fields inline |
| T3 | Rename Template | Inline rename |
| T4 | Delete Template | With confirmation |

### 4.9 Settings

| # | Feature | Description |
|---|---|---|
| S1 | Collection Add Position | Front or back |
| S2 | Work Sort Order | Ascending or descending by creation date |
| S3 | Show Image Filename | Toggle overlay in image viewer |
| S4 | Show Date Grouping | Enable/disable date groups in waterfall |
| S5 | Favorites Sort Order | Newest first or oldest first |
| S6 | Download Path | Browse dialog to set default directory |
| S7 | Import Data | Merge image/ + collections.json from exported folder |
| S8 | Export Data | Copy entire data to `Pixium_Export_{date}/` |

### 4.10 Window & System

| # | Feature | Description |
|---|---|---|
| WS1 | Custom Title Bar | Frameless window with drag region, min/max/close controls |
| WS2 | Always-on-Top | Pin button in title bar |
| WS3 | Custom Protocol | `pixium:///` for packaged-mode image serving |
| WS4 | File Watching | `fs.watch` on image/ directory for real-time updates |
| WS5 | Auto-sync | Collections reconciled against disk contents on read |

---

## 5. Core Workflows

### Workflow A: Create and Organize AI Generations

1. Launch Pixium → Create a Collection (name after the generation session)
2. Click into collection → "+ Add Work"
3. Drag PNG files from ComfyUI output folder
4. App auto-extracts prompt from PNG metadata into text fields
5. Optionally add tags, adjust cover crop
6. Save — images copied to local storage, prompt saved to `info.json`
7. Browse collection in waterfall view
8. Click any work → view full images + copy prompts

### Workflow B: Browse and Find

1. Home page → scroll through collections
2. Use search bar: type title, `#tag`, or `date2024.1.1-2024.12.31`
3. Enter collection → browse waterfall
4. Enable date grouping to see works by creation day
5. Click work → full images + multi-select prompt fields → copy

### Workflow C: Batch Operations

1. Enter collection → "Batch Select"
2. Select works or click date header to select a group
3. Move / copy / download / delete selected

### Workflow D: Template-Driven Entry

1. Settings → Upload Templates → create template (e.g. "Positive", "Negative", "Seed", "Steps")
2. When uploading, select template from dropdown
3. Field names pre-filled; enter values or let PNG extraction auto-fill

### Workflow E: Export and Backup

1. Settings → Import Export → Export Data → pick destination
2. All images + collections.json copied to `Pixium_Export_{date}/`
3. On another machine: install Pixium → Import Data → select exported folder

---

## 6. Data Models

### WorkData

```
id: string              // "collection_folder/work_folder"
title: string           // Display title, defaults to filename
cover: string           // URL to cover image (pixium:// or file://)
fileName: string        // Relative path to first image
folder?: string         // Disk path
prompt: Record<string, string> | null  // Structured text fields
images: string[]        // All image filenames
createdAt?: { year, month, day, hour, minute, second, timestamp }
timestamp?: number
coverPosition?: number  // 0–100 crop position
coverPositionVertical?: boolean
collectionId?: string
tags?: string[]
```

### Collection

```
id: string              // "collection_{timestamp}"
name: string            // Display name
folder: string          // Sanitized folder name on disk
cover: string | null    // Custom cover URL or null (auto-derived)
coverPosition?: number
coverPositionVertical?: boolean
images: string[]        // Work folder paths
createdAt?: DateInfo
```

### Template

```
id: number              // Date.now()
name: string
fields: { id, name, value }[]
```

### AppSettings

```
collectionSortOrder: 'asc' | 'desc'
workSortOrder: 'asc' | 'desc'
showDateGrouping: boolean
showImageFilename: boolean
downloadPath: string
favoritesSortOrder: 'newest' | 'oldest'
newCollectionPosition: 'front' | 'back'
allWorksCover?: string
allWorksCoverPosition?: number
allWorksCoverPositionVertical?: boolean
```

---

## 7. Data Storage

All data lives under `%APPDATA%/Pixium/` (production) or the project root (development):

```
{data_root}/
├── image/
│   ├── {collection_folder}/
│   │   ├── {work_folder}/
│   │   │   ├── image1.png
│   │   │   ├── image2.png
│   │   │   └── info.json
│   │   └── ...
│   └── collection_covers/
│       └── {collection_folder}/
│           └── cover.jpg
└── data/
    ├── collections.json
    ├── templates.json
    ├── settings.json
    └── favorites.json
```

---

## 8. Platform & Distribution

| Attribute | Value |
|---|---|
| Target OS | Windows x64 |
| Installer | NSIS (oneClick: false, perMachine: true) |
| Output | `Pixium-{version}-x64-setup.exe` |
| App ID | `io.github.42Midnight.Pixium` |
| Desktop Shell | Electron 41 (frameless custom title bar) |
