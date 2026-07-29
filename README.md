# Pixium

A local-first desktop application that stores images together with their supporting structured text information. Browse your images in a waterfall layout and organize them by albums to keep all content neatly arranged.

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

This section walks you through cloning the repository and setting up a working development environment from scratch.

### Prerequisites

| Tool         | Required Version | Notes                                          |
| ------------ | ---------------- | ---------------------------------------------- |
| Node.js      | ≥ 18 (LTS 22 recommended) | Download from [nodejs.org](https://nodejs.org) |
| npm          | bundled with Node.js | Or use pnpm / yarn                            |
| Git          | any recent version | Required to clone the repository               |

> **Windows only.** The app ships an NSIS installer targeting Windows x64. Development on macOS / Linux is untested — the Electron shell will likely launch but platform-specific paths may not resolve correctly.

### 1. Clone the Repository

```bash
git clone https://github.com/42Midnight/Pixium.git
cd Pixium
```

### 2. Install Dependencies

```bash
npm install
```

This installs everything needed:
- **Runtime** — React 19, React Router v7
- **Dev tooling** — Vite 8, TypeScript 6, ESLint, Electron 41
- **Packaging** — electron-builder

### 3. Development Workflow

The project has two compilation targets that run side-by-side during development:

| Target              | Source                | Output              | Bundler      |
| ------------------- | --------------------- | ------------------- | ------------ |
| Renderer (UI)       | `src/`                | `dist/`             | Vite         |
| Main process (Node) | `electron/`           | `electron-dist/`    | `tsc`        |

Three npm scripts cover the typical dev loop:

```bash
# --- Option A: Full dev mode with hot reload ---
# Starts Vite dev server + Electron together. Vite HMR keeps the
# renderer live; restart the Electron window with Ctrl+R / F5.
npm start

# --- Option B: Packaged-mode simulation ---
# Same as above but sets FORCE_PACKAGED_MODE=true so the app reads
# data from %APPDATA%/Pixium/ instead of the repo root.
npm run start:packaged

# --- Option C: Browser-only UI development ---
# Opens the Vite dev server in a browser. Electron APIs are
# unavailable — use this for rapid component/stylesheet iteration.
npm run dev
```

**Typical workflow:**

1. Run `npm start` to launch the full Electron app.
2. Edit files under `src/` — the renderer hot-reloads automatically.
3. If you change files under `electron/`, kill the process and re-run `npm start` (or just `npm run build:electron && electron .`).
4. Run `npm run lint` before committing to catch type and style issues.

### 4. Build the Installer

```bash
# Compile TypeScript, bundle with Vite, then package with electron-builder
npm run dist:win
```

The NSIS installer lands in `release/` as `Pixium-<version>-x64-setup.exe`.

**Under the hood** — `npm run dist:win` runs these steps in order:

1. `npm run build:electron` — compiles `electron/*.ts` → `electron-dist/`
2. `vite build` — bundles `src/` → `dist/`
3. `electron-builder --win` — wraps both into a Windows installer

### 5. Verify Everything Works

After cloning and running `npm install`, confirm the toolchain is healthy:

```bash
# Type-check the renderer (no emit)
npx tsc --noEmit

# Type-check the Electron main process
npx tsc -p tsconfig.electron.json --noEmit

# Lint the full project
npm run lint

# Build the renderer bundle
npm run build

# Compile the Electron main process
npm run build:electron
```

All five commands should exit cleanly with no errors. If they pass, `npm start` will launch the app.

### Common Issues

| Symptom                                      | Likely Fix                                                   |
| -------------------------------------------- | ------------------------------------------------------------ |
| `Cannot find module 'electron'`              | Run `npm install` — Electron is a devDependency              |
| `'electron' is not recognized`               | Add `node_modules/.bin` to PATH or use `npx electron .`      |
| White screen on launch                       | Vite dev server hasn't started — wait a few seconds, then refresh with Ctrl+R |
| `EPERM` or permission errors on Windows      | Close any File Explorer windows inside the project folder    |
| Build fails with memory errors               | Set `NODE_OPTIONS=--max-old-space-size=4096` before building |
| TypeScript errors about missing DOM types    | Make sure `"lib": ["ES2020", "DOM", "DOM.Iterable"]` is present in tsconfig.json |

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
