# Pixium — Technical Architecture

## 1. High-Level Architecture

Pixium is a standard **Electron** desktop application with strict process isolation.

```
┌─────────────────────────────────────────────────────────────────┐
│                        MAIN PROCESS                              │
│  electron/main.ts (entry)                                        │
│       │                                                          │
│       ├── electron/context.ts     Shared utilities, global state │
│       ├── electron/ipc/index.ts   Handler registration hub       │
│       │   ├── images.ts           Image save/delete/download     │
│       │   ├── collections.ts      Collection CRUD, sync          │
│       │   ├── works.ts            Work scanning, file watching   │
│       │   ├── templates.ts        Template persistence           │
│       │   └── settings.ts         Settings, window mgmt, export  │
│       └── electron/preload.cjs    contextBridge (plain .cjs)     │
│                                                                  │
│  Responsibilities:                                               │
│  • Window creation (frameless, 1200×800)                         │
│  • Custom pixium:// protocol registration                        │
│  • File system operations (fs, path)                             │
│  • fs.watch-based file watching                                  │
│  • Native dialogs (save, open directory)                         │
│  • Window state management (minimize, maximize, always-on-top)   │
└─────────────────────────────────────────────────────────────────┘
                              │
               IPC: invoke/handle (request-response)
                     + send/on (push to renderer)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      RENDERER PROCESS                            │
│  src/main.tsx (React entry)                                      │
│       │                                                          │
│       ├── src/App.tsx              HashRouter, route definitions  │
│       ├── src/services/electron.ts API wrapper (3 helpers)       │
│       ├── src/hooks/               6 custom hooks (state + IPC)   │
│       ├── src/utils/               6 utility modules             │
│       ├── src/types/               5 type definition files       │
│       └── src/components/          7 feature areas + common/     │
└─────────────────────────────────────────────────────────────────┘
```

**Key security properties:**
- `contextIsolation: true`, `nodeIntegration: false` — renderer has zero Node.js access
- `webSecurity: false` — required for `pixium://` protocol and `file:///` image loading
- `frame: false` — custom title bar implemented in React

---

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Desktop Shell | Electron | 41 |
| UI Framework | React | 19 |
| Routing | React Router (HashRouter) | 7 |
| Language | TypeScript | 6 |
| Bundler | Vite (Rolldown) | 8 |
| Compiler | React Compiler (babel-plugin-react-compiler) | 1 |
| Packaging | electron-builder | 26 |
| IPC | contextBridge + ipcRenderer/ipcMain | Native |
| CSS | CSS Modules + CSS Custom Properties | Native |
| Linting | ESLint (flat config) | 9 |

**Zero runtime dependencies** beyond React, ReactDOM, and React Router. All file I/O, image processing, and system operations are handled in the main process via Node.js built-in modules (`fs`, `path`, `url`).

---

## 3. IPC Communication

### 3.1 Pattern

All IPC uses the **invoke/handle** pattern (renderer → main request-response) except for two push channels (main → renderer). All handlers return `{ success: boolean, ... }` with a shared error shape `{ success: false, error: string }`.

### 3.2 Request-Response Channels (31 total)

| Channel | Module | Purpose |
|---|---|---|
| `save-image` | images.ts | Write PNG/JPG buffer to disk |
| `delete-file` | images.ts | Delete single file by relative path |
| `download-image` | images.ts | Copy all images from a work folder |
| `save-image-as` | images.ts | Native "Save As" dialog then copy |
| `download-single-image` | images.ts | Copy single image file to target |
| `get-image-url` | images.ts | Resolve relative path → protocol URL |
| `create-folder` | collections.ts | Create directory under image/ |
| `delete-collection` | collections.ts | Remove collection + cover folders |
| `read-collections` | collections.ts | Read collections.json, sync with disk |
| `save-collections` | collections.ts | Write collections.json |
| `rename-folder` | collections.ts | Rename work/collection folder, update refs |
| `move-work-folder` | collections.ts | Move work to another collection |
| `copy-work-folder` | collections.ts | Copy work to another collection |
| `read-works` | works.ts | Recursively scan image/ for info.json |
| `read-work-detail` | works.ts | Load single work's info.json |
| `delete-files` | works.ts | Delete work folder + contents |
| `start-watch-works` | works.ts | Start fs.watch on image/ directory |
| `load-templates` | templates.ts | Read templates.json |
| `save-templates` | templates.ts | Write templates.json |
| `read-settings` | settings.ts | Read settings.json |
| `save-settings` | settings.ts | Write settings.json |
| `select-folder` | settings.ts | Native open-directory dialog |
| `export-data` | settings.ts | Copy image/ + collections.json to target |
| `import-data` | settings.ts | Merge exported data into app data |
| `download-collection-images` | settings.ts | Batch copy collection images |
| `toggle-always-on-top` | settings.ts | Toggle always-on-top |
| `get-always-on-top` | settings.ts | Query always-on-top state |
| `win-minimize` | settings.ts | Minimize window |
| `win-maximize` | settings.ts | Toggle maximize/unmaximize |
| `win-close` | settings.ts | Close window |
| `win-is-maximized` | settings.ts | Query maximized state |

### 3.3 Push Channels (2 total)

| Channel | Trigger | Payload |
|---|---|---|
| `works-changed` | fs.watch detects info.json change | `{ filename: string }` |
| `window-state-changed` | window maximize/unmaximize events | `{ maximized: boolean }` |

### 3.4 Preload Surface

`electron/preload.cjs` exposes all 31 invoke-based methods and 2 listener-based methods on `window.electronAPI`. It is plain CommonJS (`.cjs`) — copied as-is during build, never TypeScript-compiled. The TypeScript type definition lives in `src/types/electron.d.ts`.

### 3.5 Renderer Service Layer

`src/services/electron.ts` provides three thin wrappers:
- `getElectronAPI()` — returns `window.electronAPI` (nullable)
- `requireElectronAPI()` — throws if unavailable (non-Electron env)
- `isElectronAvailable()` — boolean guard used throughout hooks

---

## 4. Data Storage

### 4.1 Root Path Resolution

| Mode | App Root Path |
|---|---|
| Development | Project root directory |
| Packaged / Forced packaged | `app.getPath('userData')` → `%APPDATA%/Pixium/` |

### 4.2 Directory Layout

```
{appRoot}/
├── image/
│   ├── {collection_folder}/           e.g. "collection_abc123/"
│   │   ├── {work_folder}/             e.g. "1699000000_abc1234/"
│   │   │   ├── {timestamp}_{rand}.png
│   │   │   ├── {timestamp}_{rand}.png
│   │   │   └── info.json              Work metadata
│   │   └── ...
│   └── collection_covers/
│       └── {collection_folder}/
│           └── cover.jpg
└── data/
    ├── collections.json               All collection definitions
    ├── settings.json                  App settings
    └── templates.json                 Prompt templates
```

### 4.3 Key Data Structures

**collections.json:**
```json
{
  "collections": [
    {
      "id": "collection_1700000000000",
      "name": "My Collection",
      "folder": "collection_1700000000000",
      "cover": "pixium://image/collection_covers/.../cover.jpg",
      "coverPosition": 50,
      "images": ["collection_1700000000000/work_folder1", ...],
      "createdAt": { "year": 2024, "month": 1, "day": 15, "timestamp": ... }
    }
  ]
}
```

**info.json (per work):**
```json
{
  "title": "My Image",
  "cover": "work_folder/img1.png",
  "fileName": "img1.png",
  "prompt": { "Positive": "...", "Negative": "...", "Seed": "12345" },
  "images": ["img1.png", "img2.png"],
  "createdAt": { "year": 2024, "month": 1, "day": 15, "timestamp": ... },
  "coverPosition": 50,
  "tags": ["portrait", "landscape"]
}
```

### 4.4 Collection-Work Relationship

Works are stored as subdirectories under their collection folder in `image/`. The `collections.json` `images` array tracks membership. Works without a collection go to `__uncategorized__/`. The special constant `ALL_WORKS_ID = '__all_works__'` represents a virtual cross-collection view.

On `read-collections`, the handler syncs with disk: reads actual directories, reconciles against the `images` array, sorts by timestamp, auto-assigns covers from the most recent work, and migrates old `file:///image/...` paths.

---

## 5. State Management

No global state library. Each domain has a custom hook encapsulating state + side effects:

| Hook | State | Persistence | IPC Dependencies |
|---|---|---|---|
| `useWorks` | `works[]`, `isLoading` | Disk only (via IPC) | `readWorks`, `readWorkDetail`, `startWatchWorks`, `onWorksChanged` |
| `useCollections` | `collections[]`, `isLoading` | Disk (via IPC) | `readCollections`, `saveCollections` |
| `useSettings` | `settings: AppSettings` | `localStorage('collectionSettings')` | None (renderer-only) |
| `useTemplates` | `templates[]` | Dual: IPC when Electron; `localStorage` fallback | `loadTemplates`, `saveTemplates` |
| `useFavorites` | `favorites: string[]` | `localStorage('favorites')` | None (renderer-only) |
| `useCoverAdjust` | Transient UI state | None | None |

### File Watch → UI Update Flow

1. `useWorks` calls `startWatchWorks` on mount
2. Main process watches `image/` recursively via `fs.watch`
3. On `info.json` change → `webContents.send('works-changed', filename)`
4. Renderer debounces changes (300ms)
5. ≤ 5 changes: incremental `readWorkDetail` + state patch
6. > 5 changes: full `loadWorks()` reload

---

## 6. Build Pipeline

### 6.1 TypeScript Configurations

| Config | Target | Purpose |
|---|---|---|
| `tsconfig.json` | Renderer (Vite) | `noEmit: true`, includes `src/`, DOM lib |
| `tsconfig.electron.json` | Main process | `outDir: electron-dist/`, includes `electron/**/*.ts` |
| `tsconfig.node.json` | Config files | `noEmit: true`, for vite.config.ts |

All share: `target: ES2020`, `module: ESNext`, `moduleResolution: bundler`, `strict: true`.

### 6.2 Development Build (`npm start`)

```
npm run build:electron
  ├── tsc -p tsconfig.electron.json     electron/*.ts → electron-dist/
  └── cp electron/preload.cjs           → electron-dist/preload.cjs

concurrently
  ├── vite                               Dev server on localhost:5173 (HMR)
  └── electron .                         Loads from localhost:5173
```

### 6.3 Production Build (`npm run dist:win`)

```
npm run build:electron                  electron/*.ts → electron-dist/
vite build                              src/ → dist/
electron-builder --win                  Packs dist/ + electron-dist/ → NSIS installer
```

### 6.4 Vite Configuration

- **Plugin**: `@vitejs/plugin-react` + `@rolldown/plugin-babel` with React Compiler preset
- **Base**: `'./'` (relative paths for `file://` loading in Electron)
- **Alias**: `@` → `src/`

### 6.5 Scripts Reference

| Script | Behavior |
|---|---|
| `npm run dev` | Vite dev server only (browser mode, no Electron) |
| `npm run build` | Vite production build (renderer only) |
| `npm run build:electron` | Compile main process TS → `electron-dist/` |
| `npm start` | Full dev: build:electron + concurrently(vite + electron) |
| `npm run start:packaged` | Same as start but `FORCE_PACKAGED_MODE=true` |
| `npm run lint` | ESLint across project |
| `npm run dist:win` | Full pipeline → NSIS installer in `release/` |

---

## 7. Routing

Uses **HashRouter** (required for Electron's `file://` loading):

| Route | Component | Description |
|---|---|---|
| `/` | WaterFall | Home — collection grid |
| `/:folderName` | WaterFall | Collection detail — works waterfall |
| `/detail/:fileName` | Detail | Single work with image viewer + prompts |
| `/upload` | Upload | Create or edit work |
| `/settings` | Settings | Preferences + templates + import/export |
| `/favorites` | Favorites | Favorited works grid |
| `/create-collection` | CreateCollection | New collection form |
| `/edit-collection` | EditCollection | Edit collection form |

---

## 8. Custom Protocol

Registered in `electron/main.ts`:

```typescript
protocol.registerFileProtocol('pixium', (request, callback) => {
  let url = request.url.replace('pixium:///', '').replace('pixium://', '');
  url = decodeURIComponent(url);
  const filePath = path.join(getAppRootPath(), url);
  callback({ path: filePath });
});
```

- **Packaged mode**: Images served via `pixium:///image/...`
- **Dev mode**: Images served via `file:///` with absolute paths
- `getImageURL()` in `electron/context.ts` decides which protocol to use

---

## 9. Key Renderer Utilities

### 9.1 PNG Metadata Extraction (`src/utils/pngMetadata.ts`)

Pure renderer-side PNG binary parser. Reads PNG chunks to find `tEXt` metadata, supports three formats:

1. **ComfyUI API format** — `keyword="prompt"` → JSON with KSampler/CLIPTextEncode node graph
2. **ComfyUI Workflow format** — `keyword="workflow"` → array-based node format with `widgets_values`
3. **Stable Diffusion WebUI format** — `keyword="parameters"` → text with "Negative prompt:" delimiter

Runs via `FileReader` — no IPC needed.

### 9.2 Search Engine (`src/utils/search.ts`)

Client-side search with:
- **Trie (prefix tree)** — autocomplete suggestions on titles and tags
- **Inverted index** — token → Set of item IDs for O(1) substring lookup
- **CJK support** — character bigrams and single-char tokens
- **Query syntax**: `#tagName` (tag filter), `dateYYYY.M.D-YYYY.M.D` (date range), plain text (title)

### 9.3 React Compiler

`babel-plugin-react-compiler` via `@rolldown/plugin-babel` automatically memoizes components and hooks at build time, reducing the need for manual `useMemo`/`useCallback`.

---

## 10. CSS Architecture

```
src/styles/tokens.css     Design tokens (CSS custom properties)
src/index.css             Global reset + body styles (dark theme)
src/components/**/        CSS Modules (*.module.css) for scoped styles
```

---

## 11. Window Management

- **Frameless**: `frame: false` in BrowserWindow options
- **Custom title bar**: `TitleBar.tsx` with `WebkitAppRegion: 'drag'` for drag regions
- **Window controls**: Custom minimize/maximize/close buttons via IPC
- **Always-on-top**: Toggle via `toggle-always-on-top` IPC, persisted in window state
- **Dimensions**: Default 1200×800, resizable

---

## 12. File Watching

`electron/ipc/works.ts` uses `fs.watch(imagePath, { recursive: true })`:

- Only reacts to `info.json` changes (not direct image writes)
- Pause/resume during mutations (`closeFileWatcher` / `restartFileWatcher`) to prevent race conditions during rename/move operations
- Renderer-side debouncing: 300ms batching, incremental updates for ≤ 5 files, full reload for larger changes

---

## 13. Dependencies

### Runtime (3 packages)

| Package | Version | Role |
|---|---|---|
| react | ^19.2.4 | UI framework |
| react-dom | ^19.2.4 | React DOM renderer |
| react-router-dom | ^7.14.0 | Client-side routing |

### Dev (18 packages)

| Package | Version | Role |
|---|---|---|
| electron | ^41.1.1 | Desktop shell |
| electron-builder | ^26.8.1 | NSIS installer packaging |
| vite | ^8.0.1 | Bundler + dev server |
| @vitejs/plugin-react | ^6.0.1 | Vite React plugin |
| babel-plugin-react-compiler | ^1.0.0 | Auto-memoization |
| @rolldown/plugin-babel | ^0.2.1 | Babel for Vite/Rolldown |
| typescript | ^6.0.3 | Type checker + compiler |
| eslint | ^9.39.4 | Linter |
| concurrently | ^9.2.1 | Parallel process runner (dev) |
| cross-env | ^10.1.0 | Cross-platform env vars |
