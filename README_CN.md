# Pixium

一款本地优先的桌面相册应用，支持将图片和文本信息一起存储，用于图片及其配套的结构化文本信息。用瀑布流布局浏览你的创作，按相册归类整理，让一切井井有条。

> For English documentation, see [README.md](./README.md)

![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)

<br />

## 使用说明

### 1. 创建相册

在首页点击 **+ 新建相册**。选择模式：

- **图文模式** — 作品同时包含图片和结构化文本字段。
- **相册模式** — 仅图片作品，不显示文本面板。

### 2. 添加作品

进入相册后点击 **+ 添加作品**。你可以：

- 拖拽或点击上传图片。
- 拖拽排序图片预览顺序。
- 选择"合并为一个作品"或"批量导入"（每张图片独立为一个作品）。
- 填写文本字段（仅图文模式）。从下拉菜单选择模板快速填充字段名。
- 使用手动调整工具微调封面裁剪位置。
- 设置标题（可选，默认为文件名）。

### 3. 浏览与搜索

瀑布流布局根据窗口宽度自动排列卡片。使用搜索栏按名称/标题过滤，支持实时补全建议。在设置中启用**日期分组**可按创建日期组织作品。

### 4. 查看详情

点击任意作品进入详情页：

- 全尺寸浏览图片，支持滚轮缩放和拖拽平移。
- 查看所有文本字段 — 点击复制单个、使用**多选**批量选中、或**一键复制全部**。
- 快捷操作：喜欢、编辑、下载、另存为、删除。

### 5. 批量操作

点击 **批量选择** 进入批量模式：

- 多选项目，或点击日期标题全选该组。
- 在相册间移动或复制作品。
- 下载选中作品/相册到预设路径或自定义目录。
- 批量删除。

### 6. 模板管理

前往 **设置 → 上传模板** 创建和管理文本字段模板。模板可以省去每次手动输入字段名的重复操作。

### 7. 喜欢收藏

在作品卡片或详情页点击心形图标即可收藏。从首页操作栏进入 **喜欢** 页面查看所有收藏。

## 数据存储

所有数据存储在本地文件系统，位于 `%APPDATA%/Pixium/`。

```
{data_root}/
├── image/
│   ├── {相册文件夹}/
│   │   ├── {作品文件夹}/
│   │   │   ├── 图片1.png
│   │   │   ├── 图片2.png
│   │   │   └── info.json        # 标题、文本字段、封面、创建日期
│   │   └── ...
│   └── collection_covers/
│       └── {相册文件夹}/
│           └── cover.jpg
└── data/
    ├── collections.json
    ├── templates.json
    ├── settings.json
    └── favorites.json
```

## 平台支持

| 平台            | 状态       |
| ------------- | -------- |
| Windows (x64) | NSIS 安装包 |

## 技术栈

| 层级   | 技术                                           |
| ---- | -------------------------------------------- |
| 桌面框架 | Electron 41                                  |
| 前端框架 | React 19 + React Router v7                   |
| 开发语言 | TypeScript 6                                 |
| 构建工具 | Vite 8                                       |
| 编译器  | React Compiler (babel-plugin-react-compiler) |
| 进程通信 | contextBridge + ipcRenderer / ipcMain        |
| 打包工具 | electron-builder                             |

## 项目结构

```
pixium/
├── electron/                  # Electron 主进程（TypeScript）
│   ├── main.ts                # 应用入口、窗口创建、自定义协议
│   ├── preload.cjs            # 预加载脚本，暴露 IPC 接口给渲染进程
│   ├── context.ts             # 公共工具（路径、图片URL、目录创建）
│   └── ipc/                   # IPC 请求处理器
│       ├── index.ts           # 注册所有 handler
│       ├── collections.ts     # 相册增删改查
│       ├── works.ts           # 作品扫描与文件监听
│       ├── images.ts          # 图片保存/删除/下载
│       ├── templates.ts       # 模板持久化
│       └── settings.ts        # 设置持久化
├── src/                       # 渲染进程（React）
│   ├── main.tsx               # React 入口
│   ├── App.tsx                # 路由定义
│   ├── components/
│   │   ├── WaterFall/         # 首页 — 瀑布流布局、搜索、批量操作
│   │   │   ├── Waterfall.tsx  # 主要布局与逻辑
│   │   │   ├── CollectionCard.tsx
│   │   │   └── WorkCard.tsx
│   │   ├── Detail/            # 作品详情页
│   │   │   ├── Detail.tsx     # 布局、复制控制、编辑/删除
│   │   │   ├── ImageViewer.tsx # 全尺寸图片查看（缩放/拖拽）
│   │   │   └── PromptCard.tsx  # 单个文本字段展示
│   │   ├── Upload/            # 创建/编辑作品
│   │   │   ├── Upload.tsx     # 表单、拖拽上传、批量导入、封面调整
│   │   │   ├── ImagePreview.tsx
│   │   │   └── PromptEditor.tsx
│   │   ├── CreateCollection/  # 新建相册
│   │   ├── EditCollection/    # 编辑相册
│   │   ├── Settings/          # 设置页 + 模板管理
│   │   │   ├── Settings.tsx
│   │   │   └── TemplateManager.tsx
│   │   ├── Favorites/         # 喜欢页面
│   │   └── common/            # 公共组件
│   │       ├── TitleBar.tsx   # 自定义无边框标题栏
│   │       ├── ConfirmDialog.tsx
│   │       ├── ContextMenu.tsx
│   │       └── CoverAdjustModal.tsx
│   ├── hooks/                 # 自定义 React Hooks
│   │   ├── useCollections.ts
│   │   ├── useWorks.ts
│   │   ├── useFavorites.ts
│   │   ├── useSettings.ts
│   │   └── useTemplates.ts
│   ├── services/
│   │   └── electron.ts        # ElectronAPI 封装工具
│   ├── types/                 # TypeScript 类型定义
│   │   ├── index.ts
│   │   ├── work.ts
│   │   ├── collection.ts
│   │   ├── template.ts
│   │   ├── settings.ts
│   │   └── electron.d.ts
│   └── utils/                 # 格式化与文件处理工具
│       ├── format.ts
│       ├── file.ts
│       └── path.ts
├── dist/                      # Vite 构建产物
├── electron-dist/             # Electron 主进程编译产物
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.electron.json
├── tsconfig.node.json
└── eslint.config.js
```

## 快速开始

### 环境要求

- Node.js 18+
- npm

### 安装与运行

```bash
# 安装依赖
npm install

# 启动应用（调试模式）
npm run start:packaged

# 代码检查
npm run lint
```

### 构建

```bash
# 构建 Windows 安装包（NSIS）
npm run dist:win
```

产物输出至 `release/` 目录。

## 设置项

| 设置      | 说明               |
| ------- | ---------------- |
| 相册添加位置  | 新相册添加到前面或后面      |
| 作品排序方式  | 按创建日期升序或降序排列     |
| 显示图片文件名 | 在图片查看器中切换文件名叠加显示 |
| 显示日期分组  | 在相册视图中按日期分组展示作品  |
| 喜欢排序方式  | 最新喜欢在前或最早喜欢在前    |
| 图片下载位置  | 快速下载时的默认保存路径     |

## 作者

[42Midnight](https://github.com/42Midnight)

## 许可证

MIT
