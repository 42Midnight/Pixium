# Pixium

A local-first Electron desktop app for managing AI-generated artworks and their prompts. Browse your creations in a beautiful waterfall layout, organize them into collections, and never lose a prompt again.

> 中文文档请见 [README_CN.md](./README_CN.md)

![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)

## Features

- **Waterfall Browsing** — Responsive masonry layout with adaptive column count. Browse collections and works in a visually rich grid.
- **Two Collection Modes** — *Pixiv mode* for images paired with structured prompt fields; *Album mode* for image-only collections.
- **Structured Prompts** — Manage prompts as named key-value pairs (e.g., Positive / Negative / Parameters). Copy individual fields, multi-select, or copy all at once from the detail view.
- **Prompt Templates** — Create reusable templates with preset field names to standardize your workflow when adding new works.
- **Batch Operations** — Select multiple works or collections to move, copy, download, or delete in bulk.
- **Favorites** — Star works you like and browse them in a dedicated view with configurable sort order.
- **Search & Date Grouping** — Real-time search with suggestions. Optional date-based grouping for chronological browsing.
- **Cover Adjustment** — Fine-tune cover image positioning for both collections and individual works.
- **In-Place Editing** — Edit work title, images, and prompts after creation without re-uploading.
- **Image Export** — Download individual works or entire collections to a folder of your choice, with "Save As" support.
- **Local-First** — Everything is stored on your file system. No cloud, no account, no internet connection needed.
- **Cross-Platform** — Windows (NSIS installer) and macOS (DMG). Custom frameless window with integrated title bar controls.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron 41 |
| UI Framework | React 19 + React Router v7 |
| Language | TypeScript 6 |
| Bundler | Vite 8 |
| Compiler | React Compiler (babel-plugin-react-compiler) |
| IPC | contextBridge + ipcRenderer / ipcMain |
| Packaging | electron-builder |

## Project Structure

```
pixium/
├── electron/                  # Electron main process (TypeScript)
│   ├── main.ts                # App entry, window creation, custom protocol
│   ├── preload.cjs            # Context bridge exposing IPC to renderer
│   ├── context.ts             # Shared utilities (paths, image URLs, dirs)
│   └── ipc/                   # IPC request handlers
│       ├── index.ts           # Handler registration
│       ├── collections.ts     # Collection CRUD
│       ├── works.ts           # Work scanning & file watching
│       ├── images.ts          # Image save / delete / download
│       ├── templates.ts       # Template persistence
│       └── settings.ts        # Settings persistence
├── src/                       # Renderer process (React)
│   ├── main.tsx               # React DOM entry
│   ├── App.tsx                # Route definitions
│   ├── components/
│   │   ├── WaterFall/         # Home — masonry grid, search, batch bar
│   │   │   ├── Waterfall.tsx  # Main layout & logic
│   │   │   ├── CollectionCard.tsx
│   │   │   └── WorkCard.tsx
│   │   ├── Detail/            # Work detail page
│   │   │   ├── Detail.tsx     # Layout, copy controls, edit/delete
│   │   │   ├── ImageViewer.tsx # Full-size image with zoom & navigation
│   │   │   └── PromptCard.tsx  # Single prompt field display
│   │   ├── Upload/            # Create / edit works
│   │   │   ├── Upload.tsx     # Form, drag-drop, batch import, cover adjust
│   │   │   ├── ImagePreview.tsx
│   │   │   └── PromptEditor.tsx
│   │   ├── CreateCollection/  # New collection form
│   │   ├── EditCollection/    # Edit collection form
│   │   ├── Settings/          # General settings & template manager
│   │   │   ├── Settings.tsx
│   │   │   └── TemplateManager.tsx
│   │   ├── Favorites/         # Favorited works grid
│   │   └── common/            # Shared components
│   │       ├── TitleBar.tsx   # Custom frameless title bar
│   │       ├── ConfirmDialog.tsx
│   │       ├── ContextMenu.tsx
│   │       └── CoverAdjustModal.tsx
│   ├── hooks/                 # Custom React hooks
│   │   ├── useCollections.ts
│   │   ├── useWorks.ts
│   │   ├── useFavorites.ts
│   │   ├── useSettings.ts
│   │   └── useTemplates.ts
│   ├── services/
│   │   └── electron.ts        # ElectronAPI wrapper helpers
│   ├── types/                 # TypeScript interfaces
│   │   ├── index.ts
│   │   ├── work.ts
│   │   ├── collection.ts
│   │   ├── template.ts
│   │   ├── settings.ts
│   │   └── electron.d.ts
│   └── utils/                 # Formatting & file helpers
│       ├── format.ts
│       ├── file.ts
│       └── path.ts
├── dist/                      # Vite build output
├── electron-dist/             # Compiled Electron main process
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.electron.json
├── tsconfig.node.json
└── eslint.config.js
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Development

```bash
# Install dependencies
npm install

# Launch dev server + Electron with hot reload
npm start

# Lint
npm run lint
```

`npm start` runs Vite at `localhost:5173` and opens an Electron window pointing at it. Changes to renderer code are reflected instantly (HMR); changes to Electron main process require re-running `npm start`.

### Build

```bash
# Build for the current platform
npm run dist

# Build Windows installer (NSIS)
npm run dist:win

# Build macOS disk image (DMG)
npm run dist:mac
```

Output: `release/` directory.

### Test Packaged Behavior Locally

```bash
npm run start:packaged
```

This simulates production mode: loads from `dist/index.html`, uses the `pixium://` custom protocol for images, and stores data in `app.getPath('userData')`.

## Usage

### 1. Create a Collection
Click **+ New Collection** on the home page. Choose between:
- **Pixiv Mode** — works contain both images and structured prompt fields.
- **Album Mode** — image-only works, no prompt panel.

### 2. Add Works
Inside a collection, click **+ Add Work**. You can:
- Drag & drop or click to select images.
- Reorder images by dragging them within the preview area.
- Choose "Merge into one work" (all images belong to one entry) or "Batch import" (each image becomes its own work).
- Fill in prompt fields (Pixiv mode only). Pick a template from the dropdown to pre-fill field names.
- Adjust the cover crop with the manual adjustment tool.
- Set the title (optional; defaults to filename).

### 3. Browse & Search
The waterfall layout auto-arranges cards based on window width. Use the search bar to filter by name/title, with real-time suggestions. Enable **date grouping** in Settings to see works organized by creation date.

### 4. View Details
Click any work to see:
- Full-size images with zoom (scroll wheel or pinch) and drag-to-pan.
- All prompt fields — click to copy, use **Multi-Select** to pick specific fields, or **Copy All**.
- Quick actions: favorite, edit, download, save-as, delete.

### 5. Batch Operations
Click **Batch Select** to enter batch mode:
- Select items, or click a date header to select an entire group.
- Move or copy works between collections.
- Download selected works/collections to a configured path or a chosen folder.
- Delete multiple items at once.

### 6. Templates
Go to **Settings → Upload Templates** to create and manage prompt field templates. Templates save you from re-typing field names (e.g., "Positive", "Negative", "Seed", "Steps") for every new work.

### 7. Favorites
Click the heart icon on any work card or in the detail view. Browse all favorites from the **Favorites** page, accessible from the home page action bar.

## Settings

| Setting | Description |
|---------|-------------|
| Collection add position | New collections appear at the front or back |
| Work sort order | Ascending or descending by creation date |
| Show image filename | Toggle filename overlay in the image viewer |
| Show date grouping | Group works by date in collection view |
| Favorites sort order | Newest or oldest favorites first |
| Download path | Default folder for quick downloads |

## Data Storage

All data lives on your local file system.

**Development** (`npm start`): stored under the project root.

**Packaged**: stored in the OS-standard app data directory (e.g., `%APPDATA%/Pixium/` on Windows).

```
{data_root}/
├── image/
│   ├── {collection_folder}/
│   │   ├── {work_folder}/
│   │   │   ├── image1.png
│   │   │   ├── image2.png
│   │   │   └── info.json        # Title, prompts, cover, creation date
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

## Platform Support

| Platform | Status |
|----------|--------|
| Windows (x64) | NSIS installer |
| macOS (x64 / arm64) | DMG |

Linux is not yet pre-configured but can be added in `package.json` → `build`.

## Author

[42Midnight](https://github.com/42Midnight)

## License

MIT
