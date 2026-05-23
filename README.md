# Pixium

A local-first Electron desktop app for managing AI-generated artworks paired with structured text metadata. Browse your creations in a beautiful waterfall layout, organize them into collections, and keep everything at your fingertips.

> 中文文档请见 [README\_CN.md](./README_CN.md)

![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)

## Usage

### 1. Create a Collection

Click **+ New Collection** on the home page. Choose between:

- **Pixiv Mode** — works contain both images and structured text fields.
- **Album Mode** — image-only works, no text panel.

### 2. Add Works

Inside a collection, click **+ Add Work**. You can:

- Drag & drop or click to select images.
- Reorder images by dragging them within the preview area.
- Choose "Merge into one work" (all images belong to one entry) or "Batch import" (each image becomes its own work).
- Fill in text fields (Pixiv mode only). Pick a template from the dropdown to pre-fill field names.
- Adjust the cover crop with the manual adjustment tool.
- Set the title (optional; defaults to filename).

### 3. Browse & Search

The waterfall layout auto-arranges cards based on window width. Use the search bar to filter by name/title, with real-time suggestions. Enable **date grouping** in Settings to see works organized by creation date.

### 4. View Details

Click any work to see:

- Full-size images with zoom (scroll wheel or pinch) and drag-to-pan.
- All text fields — click to copy, use **Multi-Select** to pick specific fields, or **Copy All**.
- Quick actions: favorite, edit, download, save-as, delete.

### 5. Batch Operations

Click **Batch Select** to enter batch mode:

- Select items, or click a date header to select an entire group.
- Move or copy works between collections.
- Download selected works/collections to a configured path or a chosen folder.
- Delete multiple items at once.

### 6. Templates

Go to **Settings → Upload Templates** to create and manage text field templates. Templates save you from re-typing field names for every new work.

### 7. Favorites

Click the heart icon on any work card or in the detail view. Browse all favorites from the **Favorites** page, accessible from the home page action bar.

## Data Storage

All data lives on your local file system, stored under `%APPDATA%/Pixium/`.

```
{data_root}/
├── image/
│   ├── {collection_folder}/
│   │   ├── {work_folder}/
│   │   │   ├── image1.png
│   │   │   ├── image2.png
│   │   │   └── info.json        # Title, text fields, cover, creation date
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

| Platform      | Status         |
| ------------- | -------------- |
| Windows (x64) | NSIS installer |

## Tech Stack

| Layer         | Technology                                   |
| ------------- | -------------------------------------------- |
| Desktop Shell | Electron 41                                  |
| UI Framework  | React 19 + React Router v7                   |
| Language      | TypeScript 6                                 |
| Bundler       | Vite 8                                       |
| Compiler      | React Compiler (babel-plugin-react-compiler) |
| IPC           | contextBridge + ipcRenderer / ipcMain        |
| Packaging     | electron-builder                             |

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
│   │   │   └── PromptCard.tsx  # Single text field display
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

### Install & Run

```bash
# Install dependencies
npm install

# Launch the app (debug mode)
npm run start:packaged

# Lint
npm run lint
```

### Build

```bash
# Build Windows installer (NSIS)
npm run dist:win
```

Output: `release/` directory.

## Settings

| Setting                 | Description                                 |
| ----------------------- | ------------------------------------------- |
| Collection add position | New collections appear at the front or back |
| Work sort order         | Ascending or descending by creation date    |
| Show image filename     | Toggle filename overlay in the image viewer |
| Show date grouping      | Group works by date in collection view      |
| Favorites sort order    | Newest or oldest favorites first            |
| Download path           | Default folder for quick downloads          |

## Author

[42Midnight](https://github.com/42Midnight)

## License

MIT
