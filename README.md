# 轻记 QingJi

> 本地轻量便签 / 任务 / 日记应用 —— 数据完全存储在本地，不依赖任何云端服务。

轻记是一款跨平台的轻量级个人记录工具，支持桌面端（Windows）与移动端（PWA）。它将便签、任务、日记与设置整合在一个简洁的应用中，所有数据存储在设备本地，保护你的隐私。

## 功能特性

轻记包含四大核心模块：

- **便签（Notes）** —— 快速记录灵感与碎片信息，支持搜索、卡片式浏览。
- **任务（Tasks）** —— 待办事项管理，按日期组织，支持勾选完成状态。
- **日记（Diary）** —— 每日心情与事件记录，内置日历视图便于回顾。
- **设置（Settings）** —— 主题切换、数据备份 / 恢复、存储信息查看等。

> 截图占位：_后续可在此添加应用截图_

## 如何获取桌面端 .exe

轻记的 Windows 桌面端通过 GitHub Actions 自动构建，你无需自行配置编译环境。

1. **Fork 或 Clone** 本仓库到你的 GitHub 账号。
2. **推送代码**到 `main` 分支，或**打一个以 `v` 开头的 tag**（如 `v0.1.0`）。
3. 进入仓库的 **Actions** 标签页，查看 `Build Tauri (Windows)` 工作流的构建进度。
4. 构建成功后，前往仓库的 **Releases** 页面，找到对应的 Release。
5. 在 Release 的 Assets 中下载 `.exe` 安装包（NSIS 安装程序）或 `.msi` 安装包。
6. 下载后双击运行安装程序即可，**无需额外安装任何软件**（WebView2 运行时通常已内置于 Windows 10/11）。

> 首次 Fork 后，需在仓库 **Settings → Actions → General** 中确认允许 Actions 运行。

## 如何使用移动端 PWA

轻记的移动端以 PWA（渐进式 Web 应用）形式提供，可像原生 App 一样安装到手机主屏幕。

1. **部署 PWA**（任选其一）：
   - **GitHub Pages**：在仓库 **Settings → Pages** 中将 Source 设为 `GitHub Actions`，推送代码后 `Deploy PWA to Pages` 工作流会自动部署。
   - **Vercel / Netlify**：导入仓库，构建命令填 `pnpm build`，输出目录填 `dist`。
   - **本地预览**：执行 `pnpm build && pnpm preview`，用手机浏览器访问局域网地址。
2. 用**手机浏览器**打开部署后的地址。
3. 点击浏览器的**"添加到主屏幕"**（iOS Safari 为分享按钮 → 添加到主屏幕；Android Chrome 为菜单 → 添加到主屏幕）。
4. 从主屏幕图标启动，即可像原生 App 一样全屏使用。

## 本地开发

### 环境要求

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Rust](https://www.rust-lang.org/)（仅桌面端开发需要，安装 `rustup` 即可）

### 开发命令

```bash
# 安装依赖
pnpm install

# 前端开发（仅 Web / PWA）
pnpm dev

# 桌面端开发（Tauri 窗口，需 Rust）
pnpm tauri dev

# 构建前端产物（输出到 dist/）
pnpm build

# 构建桌面端安装包（Windows 上生成 .exe / .msi）
pnpm tauri build
```

## 数据存储说明

轻记采用统一的存储抽象层，根据运行环境自动选择存储方案，**数据完全保存在本地，不上传任何云端**：

| 环境 | 存储方案 | 说明 |
| --- | --- | --- |
| 桌面端（Tauri） | **SQLite** | 通过 `tauri-plugin-sql` 在本地数据库中持久化 |
| 移动端 / 浏览器（PWA） | **IndexedDB** | 通过 `dexie` 在浏览器本地数据库中持久化 |

两端均支持通过设置模块进行数据的**导出备份**与**导入恢复**。

## 技术栈

- [Vue 3](https://vuejs.org/) —— 渐进式前端框架
- [TypeScript](https://www.typescriptlang.org/) —— 类型安全
- [Vite 8](https://vite.dev/) —— 构建工具与开发服务器
- [Tauri 2](https://tauri.app/) —— 桌面端应用框架（Rust）
- [Tailwind CSS 3](https://tailwindcss.com/) —— 原子化 CSS 框架
- [Pinia](https://pinia.vuejs.org/) —— Vue 状态管理
- [Vue Router](https://router.vuejs.org/) —— 路由
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) —— PWA 支持
- [Dexie](https://dexie.org/) —— IndexedDB 封装（PWA 端存储）

## 项目结构

```
qingji/
├── .github/workflows/     # CI/CD 工作流
│   ├── build-tauri.yml    #   Tauri Windows 桌面端构建
│   └── deploy-pwa.yml     #   PWA 部署到 GitHub Pages
├── src/                   # 前端源码
│   ├── components/        #   组件（note / task / diary / settings）
│   ├── views/             #   页面视图
│   ├── stores/            #   Pinia 状态管理
│   ├── router/            #   路由配置
│   ├── utils/             #   工具与存储适配器
│   └── types/             #   类型定义
├── src-tauri/             # Tauri 桌面端配置与 Rust 源码
├── vite.config.ts         # Vite + PWA 配置
└── package.json
```

## 许可证

[MIT License](LICENSE)
