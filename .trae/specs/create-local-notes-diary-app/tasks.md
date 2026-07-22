# Tasks

- [x] Task 1: 初始化项目脚手架与基础配置
  - [ ] SubTask 1.1: 使用 Vite 创建 Vue 3 + TypeScript 项目
  - [ ] SubTask 1.2: 集成 Tauri（Rust 后端）作为桌面端壳
  - [ ] SubTask 1.3: 安装并配置 Tailwind CSS（含深浅色主题变量）
  - [ ] SubTask 1.4: 配置 Pinia 状态管理 + Vue Router 路由
  - [ ] SubTask 1.5: 配置 vite-plugin-pwa（manifest、service worker、离线缓存）
  - [ ] SubTask 1.6: 建立项目目录结构（views/components/stores/utils/types）

- [x] Task 2: 设计数据层与存储抽象
  - [ ] SubTask 2.1: 定义统一的数据模型类型（Task / Note / Diary）
  - [ ] SubTask 2.2: 实现 storage 抽象接口（CRUD：增删改查）
  - [ ] SubTask 2.3: 实现桌面端 SQLite 存储适配器（通过 Tauri SQL 插件）
  - [ ] SubTask 2.4: 实现 PWA 端 IndexedDB 存储适配器（ Dexie.js）
  - [ ] SubTask 2.5: 实现运行时环境检测，自动选择适配器
  - [ ] SubTask 2.6: 创建数据库初始化与迁移脚本

- [x] Task 3: 搭建应用骨架与导航布局
  - [ ] SubTask 3.1: 实现桌面端布局（左侧导航栏 + 主内容区，>768px）
  - [ ] SubTask 3.2: 实现移动端布局（底部 Tab + 全屏内容区，≤768px）
  - [ ] SubTask 3.3: 实现深浅色主题切换（持久化用户偏好）
  - [ ] SubTask 3.4: 创建路由配置（今日 / 任务 / 便签 / 日记 / 设置）
  - [ ] SubTask 3.5: 设计并应用简约大气的基础 UI 风格（留白、配色、字体、微动效）

- [x] Task 4: 实现"每日任务清单"模块
  - [ ] SubTask 4.1: 实现"今日"视图：任务列表展示 + 进度条
  - [ ] SubTask 4.2: 实现添加任务（输入框 + 回车/按钮添加）
  - [ ] SubTask 4.3: 实现任务完成切换（复选框、划线置灰）
  - [ ] SubTask 4.4: 实现任务编辑与删除（删除需二次确认）
  - [ ] SubTask 4.5: 实现历史日期切换（日期选择器）+ 历史任务只读展示

- [x] Task 5: 实现"便签/随手记"模块
  - [ ] SubTask 5.1: 实现便签列表视图（卡片式展示，按时间倒序）
  - [ ] SubTask 5.2: 实现新建便签（自动保存、记录创建时间）
  - [ ] SubTask 5.3: 实现便签详情编辑（自动保存、更新时间）
  - [ ] SubTask 5.4: 实现关键词搜索（实时筛选 + 高亮匹配）
  - [ ] SubTask 5.5: 实现便签删除（二次确认）

- [x] Task 6: 实现"日记本"模块
  - [ ] SubTask 6.1: 实现今日日记编辑区（自动保存）
  - [ ] SubTask 6.2: 实现日历视图（有日记的日期标记点）
  - [ ] SubTask 6.3: 实现点击日历日期查看对应日记
  - [ ] SubTask 6.4: 实现日记列表视图（按月分组）

- [x] Task 7: 实现"数据导出/备份"模块
  - [ ] SubTask 7.1: 实现导出全部数据为 JSON（文件名含日期）
  - [ ] SubTask 7.2: 实现导出为 Markdown（按模块组织）
  - [ ] SubTask 7.3: 实现从 JSON 文件导入恢复（二次确认、覆盖/合并选项）
  - [ ] SubTask 7.4: 在桌面端通过 Tauri 文件对话框选择保存/打开位置

- [x] Task 8: 实现设置页面
  - [ ] SubTask 8.1: 主题切换（浅色/深色/跟随系统）
  - [ ] SubTask 8.2: 数据存储位置展示（桌面端显示 DB 文件路径）
  - [ ] SubTask 8.3: 导出/导入入口
  - [ ] SubTask 8.4: 关于信息（版本号、项目地址）

- [x] Task 9: 配置 GitHub Actions 自动构建
  - [ ] SubTask 9.1: 编写 `.github/workflows/build-tauri.yml` 工作流
  - [ ] SubTask 9.2: 配置 Windows runner，安装 Rust + Node 依赖
  - [ ] SubTask 9.3: 执行 `tauri build` 并上传产物到 GitHub Releases
  - [ ] SubTask 9.4: 配置 PWA 构建产物部署到 GitHub Pages（可选）
  - [ ] SubTask 9.5: 编写 README 说明：如何触发构建、如何下载 .exe、如何使用 PWA

- [x] Task 10: 本地验证与端到端测试
  - [ ] SubTask 10.1: 桌面端 `tauri dev` 启动验证所有功能流程
  - [ ] SubTask 10.2: PWA 端 `vite build && vite preview` 验证移动端布局与离线
  - [ ] SubTask 10.3: 验证数据持久化（重启后数据仍在）
  - [ ] SubTask 10.4: 验证导出/导入数据完整性
  - [ ] SubTask 10.5: 验证 GitHub Actions 工作流语法正确（act 或 push 后检查）

# Task Dependencies
- Task 2 依赖 Task 1（需要项目脚手架）
- Task 3 依赖 Task 1（需要路由与状态管理配置）
- Task 4、5、6、7 依赖 Task 2 和 Task 3（需要数据层和布局）
- Task 4、5、6、7 之间相互独立，可并行实现
- Task 8 依赖 Task 7（需要导出导入入口）
- Task 9 依赖 Task 1（需要 Tauri 配置）
- Task 10 依赖所有前置任务完成
