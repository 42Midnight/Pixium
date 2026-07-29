# Pixium — 技术架构文档

## 1. 架构总览

Pixium 是标准的 **Electron** 桌面应用，遵循严格的双进程隔离模型。

```
┌─────────────────────────────────────────────────────────────────┐
│                        主进程（Main Process）                     │
│  electron/main.ts（入口）                                         │
│       │                                                          │
│       ├── electron/context.ts     公共工具、全局状态               │
│       ├── electron/ipc/index.ts   处理器注册中心                   │
│       │   ├── images.ts           图片保存/删除/下载               │
│       │   ├── collections.ts      相册 CRUD、磁盘同步              │
│       │   ├── works.ts            作品扫描、文件监听               │
│       │   ├── templates.ts        模板持久化                      │
│       │   └── settings.ts         设置、窗口管理、导入导出          │
│       └── electron/preload.cjs    contextBridge（纯 .cjs 文件）    │
│                                                                  │
│  职责：                                                           │
│  • 窗口创建（无边框，1200×800）                                    │
│  • 自定义 pixium:// 协议注册                                      │
│  • 文件系统操作（fs, path）                                       │
│  • fs.watch 文件监听                                              │
│  • 原生对话框（保存、选择目录）                                     │
│  • 窗口状态管理（最小化、最大化、置顶）                              │
└─────────────────────────────────────────────────────────────────┘
                              │
               IPC: invoke/handle（请求-响应）
                     + send/on（主进程推送到渲染进程）
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      渲染进程（Renderer Process）                  │
│  src/main.tsx（React 入口）                                       │
│       │                                                          │
│       ├── src/App.tsx              HashRouter，路由定义            │
│       ├── src/services/electron.ts API 封装（3 个辅助函数）        │
│       ├── src/hooks/               6 个自定义 hooks（状态 + IPC）   │
│       ├── src/utils/               6 个工具模块                   │
│       ├── src/types/               5 个类型定义文件                │
│       └── src/components/          7 个功能区域 + common/         │
└─────────────────────────────────────────────────────────────────┘
```

**安全属性：**
- `contextIsolation: true`，`nodeIntegration: false` — 渲染进程零 Node.js 权限
- `webSecurity: false` — 允许加载本地 `pixium://` 和 `file:///` 图片
- `frame: false` — React 实现自定义标题栏

---

## 2. 技术栈

| 层级 | 技术 | 版本 |
|---|---|---|
| 桌面框架 | Electron | 41 |
| UI 框架 | React | 19 |
| 路由 | React Router（HashRouter） | 7 |
| 语言 | TypeScript | 6 |
| 构建工具 | Vite（Rolldown） | 8 |
| 编译器 | React Compiler（babel-plugin-react-compiler） | 1 |
| 打包 | electron-builder | 26 |
| IPC | contextBridge + ipcRenderer/ipcMain | 原生 |
| CSS | CSS Modules + CSS 自定义属性 | 原生 |
| 代码检查 | ESLint（flat config） | 9 |

**仅 3 个运行时依赖**：React、ReactDOM、React Router。所有文件 I/O、图片处理、系统操作均由主进程通过 Node.js 内置模块（`fs`、`path`、`url`）完成。

---

## 3. IPC 通信

### 3.1 通信模式

所有 IPC 使用 **invoke/handle** 模式（渲染进程 → 主进程，请求-响应），外加两条推送通道（主进程 → 渲染进程）。所有处理器返回 `{ success: boolean, ... }` 格式，错误时为 `{ success: false, error: string }`。

### 3.2 请求-响应通道（31 条）

| 通道名 | 所属模块 | 用途 |
|---|---|---|
| `save-image` | images.ts | 将 PNG/JPG 缓冲区写入磁盘 |
| `delete-file` | images.ts | 按相对路径删除单个文件 |
| `download-image` | images.ts | 复制作品文件夹内所有图片 |
| `save-image-as` | images.ts | 原生"另存为"对话框并复制文件 |
| `download-single-image` | images.ts | 复制单张图片到目标路径 |
| `get-image-url` | images.ts | 相对路径 → 协议 URL |
| `create-folder` | collections.ts | 在 image/ 下创建目录 |
| `delete-collection` | collections.ts | 删除相册 + 封面文件夹 |
| `read-collections` | collections.ts | 读取 collections.json，与磁盘同步 |
| `save-collections` | collections.ts | 写入 collections.json |
| `rename-folder` | collections.ts | 重命名作品/相册文件夹，更新所有引用 |
| `move-work-folder` | collections.ts | 移动作品到另一相册 |
| `copy-work-folder` | collections.ts | 复制作品到另一相册 |
| `read-works` | works.ts | 递归扫描 image/ 中所有 info.json |
| `read-work-detail` | works.ts | 读取单个作品的 info.json |
| `delete-files` | works.ts | 删除作品文件夹及其内容 |
| `start-watch-works` | works.ts | 启动对 image/ 目录的 fs.watch |
| `load-templates` | templates.ts | 读取 templates.json |
| `save-templates` | templates.ts | 写入 templates.json |
| `read-settings` | settings.ts | 读取 settings.json |
| `save-settings` | settings.ts | 写入 settings.json |
| `select-folder` | settings.ts | 原生目录选择对话框 |
| `export-data` | settings.ts | 导出 image/ + collections.json |
| `import-data` | settings.ts | 导入合并数据到应用目录 |
| `download-collection-images` | settings.ts | 批量复制相册图片 |
| `toggle-always-on-top` | settings.ts | 切换窗口置顶 |
| `get-always-on-top` | settings.ts | 查询窗口置顶状态 |
| `win-minimize` | settings.ts | 最小化窗口 |
| `win-maximize` | settings.ts | 切换最大化/还原 |
| `win-close` | settings.ts | 关闭窗口 |
| `win-is-maximized` | settings.ts | 查询最大化状态 |

### 3.3 推送通道（2 条）

| 通道名 | 触发条件 | 载荷 |
|---|---|---|
| `works-changed` | fs.watch 检测到 info.json 变更 | `{ filename: string }` |
| `window-state-changed` | 窗口最大化/还原事件 | `{ maximized: boolean }` |

### 3.4 Preload 桥接层

`electron/preload.cjs` 将全部 31 个 invoke 方法和 2 个监听方法暴露在 `window.electronAPI` 上。该文件为纯 CommonJS（`.cjs`），构建时直接复制，不经 TypeScript 编译。TypeScript 类型定义位于 `src/types/electron.d.ts`。

### 3.5 渲染进程服务层

`src/services/electron.ts` 提供三个薄封装：
- `getElectronAPI()` — 返回 `window.electronAPI`（可为 null）
- `requireElectronAPI()` — 不可用时抛出异常（非 Electron 环境）
- `isElectronAvailable()` — 布尔值守卫，hooks 中用于判断是否可用

---

## 4. 数据存储

### 4.1 根路径解析

| 模式 | 应用根路径 |
|---|---|
| 开发环境 | 项目根目录 |
| 打包 / 强制打包模式 | `app.getPath('userData')` → `%APPDATA%/Pixium/` |

### 4.2 目录结构

```
{appRoot}/
├── image/
│   ├── {相册文件夹}/                例："collection_abc123/"
│   │   ├── {作品文件夹}/            例："1699000000_abc1234/"
│   │   │   ├── {时间戳}_{随机}.png
│   │   │   ├── {时间戳}_{随机}.png
│   │   │   └── info.json           作品元数据
│   │   └── ...
│   └── collection_covers/
│       └── {相册文件夹}/
│           └── cover.jpg
└── data/
    ├── collections.json             所有相册定义
    ├── settings.json                应用设置
    └── templates.json               Prompt 模板
```

### 4.3 核心数据结构

**collections.json:**
```json
{
  "collections": [
    {
      "id": "collection_1700000000000",
      "name": "我的相册",
      "folder": "collection_1700000000000",
      "cover": "pixium://image/collection_covers/.../cover.jpg",
      "coverPosition": 50,
      "images": ["collection_1700000000000/作品文件夹1", "..."],
      "createdAt": { "year": 2024, "month": 1, "day": 15, "timestamp": 1700000000000 }
    }
  ]
}
```

**info.json（每个作品）：**
```json
{
  "title": "我的作品",
  "cover": "作品文件夹/图片1.png",
  "fileName": "图片1.png",
  "prompt": { "正向": "...", "负向": "...", "种子": "12345" },
  "images": ["图片1.png", "图片2.png"],
  "createdAt": { "year": 2024, "month": 1, "day": 15, "timestamp": 1700000000000 },
  "coverPosition": 50,
  "tags": ["肖像", "风景"]
}
```

### 4.4 相册-作品关系

作品以子目录形式存放在对应相册文件夹下的 `image/` 中。`collections.json` 的 `images` 数组记录归属关系。无相册归属的作品存入 `__uncategorized__/`。特殊常量 `ALL_WORKS_ID = '__all_works__'` 代表跨相册的虚拟"全部作品"视图。

`read-collections` 调用时会比对磁盘实际目录，自动修复 `images` 数组、按时间戳排序、自动从最新作品中提取封面。

---

## 5. 状态管理

不使用全局状态库。每个领域通过自定义 Hook 封装状态和副作用：

| Hook | 状态 | 持久化方式 | IPC 依赖 |
|---|---|---|---|
| `useWorks` | `works[]`，`isLoading` | 仅磁盘（通过 IPC） | `readWorks`，`readWorkDetail`，`startWatchWorks`，`onWorksChanged` |
| `useCollections` | `collections[]`，`isLoading` | 磁盘（通过 IPC） | `readCollections`，`saveCollections` |
| `useSettings` | `settings: AppSettings` | `localStorage('collectionSettings')` | 无（纯渲染进程） |
| `useTemplates` | `templates[]` | 双模式：Electron 时 IPC；浏览器时 `localStorage` 兜底 | `loadTemplates`，`saveTemplates` |
| `useFavorites` | `favorites: string[]` | `localStorage('favorites')` | 无（纯渲染进程） |
| `useCoverAdjust` | 临时 UI 状态 | 无 | 无 |

### 文件监听 → UI 更新流程

1. `useWorks` 挂载时调用 `startWatchWorks`
2. 主进程通过 `fs.watch` 递归监听 `image/` 目录
3. `info.json` 变更 → `webContents.send('works-changed', filename)`
4. 渲染进程防抖 300ms
5. ≤ 5 个文件变更：逐个调用 `readWorkDetail` 增量更新
6. > 5 个文件变更：全量 `loadWorks()` 重新加载

---

## 6. 构建管线

### 6.1 TypeScript 配置

| 配置文件 | 目标 | 用途 |
|---|---|---|
| `tsconfig.json` | 渲染进程（Vite 处理） | `noEmit: true`，包含 `src/`，含 DOM 库 |
| `tsconfig.electron.json` | 主进程 | `outDir: electron-dist/`，包含 `electron/**/*.ts` |
| `tsconfig.node.json` | 配置文件 | `noEmit: true`，用于 vite.config.ts |

三者共享：`target: ES2020`，`module: ESNext`，`moduleResolution: bundler`，`strict: true`。

### 6.2 开发构建（`npm start`）

```
npm run build:electron
  ├── tsc -p tsconfig.electron.json     electron/*.ts → electron-dist/
  └── cp electron/preload.cjs           → electron-dist/preload.cjs

concurrently
  ├── vite                               Dev server（localhost:5173，HMR）
  └── electron .                         从 localhost:5173 加载
```

### 6.3 生产构建（`npm run dist:win`）

```
npm run build:electron                  electron/*.ts → electron-dist/
vite build                              src/ → dist/
electron-builder --win                  打包 → NSIS 安装包
```

### 6.4 Vite 配置

- **插件**：`@vitejs/plugin-react` + `@rolldown/plugin-babel`（React Compiler 预设）
- **Base**：`'./'`（相对路径，适配 Electron `file://` 加载）
- **别名**：`@` → `src/`

### 6.5 脚本速查

| 命令 | 行为 |
|---|---|
| `npm run dev` | 仅 Vite dev server（浏览器模式，无 Electron） |
| `npm run build` | Vite 生产构建（仅渲染进程） |
| `npm run build:electron` | 编译主进程 TS → `electron-dist/` |
| `npm start` | 全量开发模式：build:electron + concurrently(vite + electron) |
| `npm run start:packaged` | 同 start，但 `FORCE_PACKAGED_MODE=true` |
| `npm run lint` | ESLint 全项目检查 |
| `npm run dist:win` | 全量管线 → NSIS 安装包输出到 `release/` |

---

## 7. 路由

使用 **HashRouter**（Electron `file://` 加载所必需）：

| 路由 | 组件 | 说明 |
|---|---|---|
| `/` | WaterFall | 首页 — 相册网格 |
| `/:folderName` | WaterFall | 相册详情 — 作品瀑布流 |
| `/detail/:fileName` | Detail | 单个作品详情（图片查看 + Prompt） |
| `/upload` | Upload | 创建或编辑作品 |
| `/settings` | Settings | 设置（偏好 + 模板 + 导入导出） |
| `/favorites` | Favorites | 收藏作品网格 |
| `/create-collection` | CreateCollection | 新建相册表单 |
| `/edit-collection` | EditCollection | 编辑相册表单 |

---

## 8. 自定义协议

在 `electron/main.ts` 中注册：

```typescript
protocol.registerFileProtocol('pixium', (request, callback) => {
  let url = request.url.replace('pixium:///', '').replace('pixium://', '');
  url = decodeURIComponent(url);
  const filePath = path.join(getAppRootPath(), url);
  callback({ path: filePath });
});
```

- **打包模式**：图片通过 `pixium:///image/...` 加载
- **开发模式**：图片通过 `file:///` + 绝对路径加载
- `electron/context.ts` 中的 `getImageURL()` 决定使用哪种协议

---

## 9. 关键渲染进程工具

### 9.1 PNG 元数据提取（`src/utils/pngMetadata.ts`）

纯渲染进程侧的 PNG 二进制解析器。读取 PNG chunk 查找 `tEXt` 元数据，支持三种格式：

1. **ComfyUI API 格式** — `keyword="prompt"` → JSON 节点图，从 KSampler 追溯到 CLIPTextEncode
2. **ComfyUI Workflow 格式** — `keyword="workflow"` → 数组格式节点，`widgets_values` 提取
3. **Stable Diffusion WebUI 格式** — `keyword="parameters"` → 按 "Negative prompt:" 分割提取

通过 `FileReader` 运行，无需 IPC。

### 9.2 搜索引擎（`src/utils/search.ts`）

客户端搜索，包含：
- **Trie（前缀树）** — 标题和标签的自动补全
- **倒排索引** — token → 条目 ID 集合，O(1) 子串查找
- **CJK 支持** — 字符二元组和单字 token
- **查询语法**：`#标签名`（标签过滤）、`dateYYYY.M.D-YYYY.M.D`（日期范围）、纯文本（标题）

### 9.3 React Compiler

`babel-plugin-react-compiler` 通过 `@rolldown/plugin-babel` 在构建时自动 memo 化组件和 hooks，减少手动 `useMemo`/`useCallback` 的需求。

---

## 10. CSS 架构

```
src/styles/tokens.css     设计 Token（CSS 自定义属性）
src/index.css             全局重置 + body 样式（暗色主题）
src/components/**/        CSS Modules（*.module.css）作用域样式
```

---

## 11. 窗口管理

- **无边框**：BrowserWindow 选项 `frame: false`
- **自定义标题栏**：`TitleBar.tsx`，`WebkitAppRegion: 'drag'` 实现拖拽
- **窗口控件**：通过 IPC 实现自定义最小化/最大化/关闭按钮
- **窗口置顶**：通过 `toggle-always-on-top` IPC 切换
- **默认尺寸**：1200×800，可调整大小

---

## 12. 文件监听

`electron/ipc/works.ts` 使用 `fs.watch(imagePath, { recursive: true })`：

- 仅响应 `info.json` 变更（不直接监听图片写入）
- 在重命名/移动操作期间暂停/恢复（`closeFileWatcher` / `restartFileWatcher`），防止竞态条件
- 渲染进程侧防抖：300ms 批量处理，≤ 5 个文件增量更新，超过则全量刷新

---

## 13. 依赖清单

### 运行时依赖（3 个包）

| 包名 | 版本 | 用途 |
|---|---|---|
| react | ^19.2.4 | UI 框架 |
| react-dom | ^19.2.4 | React DOM 渲染器 |
| react-router-dom | ^7.14.0 | 客户端路由 |

### 开发依赖（18 个包）

| 包名 | 版本 | 用途 |
|---|---|---|
| electron | ^41.1.1 | 桌面框架 |
| electron-builder | ^26.8.1 | NSIS 安装包打包 |
| vite | ^8.0.1 | 构建工具 + Dev Server |
| @vitejs/plugin-react | ^6.0.1 | Vite React 插件 |
| babel-plugin-react-compiler | ^1.0.0 | 自动 memo 化 |
| @rolldown/plugin-babel | ^0.2.1 | Vite/Rolldown Babel 集成 |
| typescript | ^6.0.3 | 类型检查器 + 编译器 |
| eslint | ^9.39.4 | 代码检查 |
| concurrently | ^9.2.1 | 并行进程运行器（开发用） |
| cross-env | ^10.1.0 | 跨平台环境变量 |
