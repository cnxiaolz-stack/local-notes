# 轻记 (QingJi) - 本地轻量便签/任务/日记应用 Spec

## Why
用户想要一个本地化、轻量、不依赖云端的个人效率工具，整合"每日任务清单 + 便签随手记 + 日记本"三大场景。现有云端笔记软件臃肿、需登录、有隐私顾虑；纯本地工具又往往功能割裂。需要一个开箱即用、设计简约、跨桌面与移动端、数据完全由自己掌控的轻量应用。

## What Changes
- 新建一个完整应用项目"轻记 (QingJi)"
- 桌面端：基于 Tauri 打包为 Windows 便携 .exe（解压即用，无需安装开发软件）
- 移动端：同一套前端代码构建为 PWA，手机浏览器"添加到主屏幕"即可使用
- 数据存储：本地 SQLite（桌面端通过 Tauri SQL 插件）+ IndexedDB/LocalStorage（PWA 端）
- 四大功能模块：每日任务清单、便签/随手记、日记本、数据导出/备份
- 设计风格：简约、大气、轻量设计感（大量留白、柔和配色、深浅色主题）
- 构建产物通过 GitHub Actions 自动产出，用户从 Releases 下载 .exe
- **第一阶段不做跨设备同步**（数据各自本地存储），后续阶段可扩展 WebDAV/局域网同步

## Impact
- 全新项目，无历史代码影响
- 技术栈：Vue 3 + Vite + TypeScript + Tailwind CSS + Tauri + Pinia + Vue Router
- 依赖工具：Node.js（仅构建时）、Rust 工具链（仅 Tauri 构建时，由 GitHub Actions 提供，用户本地无需安装）
- 产出物：
  - Windows 便携 .exe（通过 GitHub Releases 下载）
  - PWA 部署包（可部署到任意静态托管，或本地起服务访问）

## ADDED Requirements

### Requirement: 应用整体架构
系统 SHALL 提供一个跨桌面与移动端的轻量应用，前端代码共享，分别打包为 Tauri 桌面端和 PWA 移动端。

#### Scenario: 桌面端运行
- **WHEN** 用户下载并解压 Windows .exe 包
- **THEN** 双击 .exe 即可启动应用，无需安装任何开发软件或运行时
- **AND** 应用窗口大小适中（默认 1000x720），支持缩放

#### Scenario: 移动端运行
- **WHEN** 用户在手机浏览器打开 PWA 地址
- **THEN** 应用以全屏 Web App 形式呈现
- **AND** 用户可"添加到主屏幕"后像原生 App 一样启动，支持离线使用

### Requirement: 每日任务清单模块
系统 SHALL 提供按日期组织的任务清单，支持添加、完成、编辑、删除任务，并查看历史。

#### Scenario: 添加今日任务
- **WHEN** 用户在"今日"视图点击添加按钮并输入任务内容
- **THEN** 任务被保存到当天日期下
- **AND** 任务列表实时刷新显示

#### Scenario: 完成任务
- **WHEN** 用户点击任务前的复选框
- **THEN** 任务标记为已完成状态（划线+置灰）
- **AND** 显示完成进度（已完成/总数）

#### Scenario: 查看历史任务
- **WHEN** 用户切换到历史日期（通过日期选择器或日历）
- **THEN** 显示该日期的所有任务及其完成状态
- **AND** 历史任务为只读（不可修改，保证记录真实性）

### Requirement: 便签/随手记模块
系统 SHALL 提供快速记录文字便签的功能，支持分类、搜索、查看列表与详情。

#### Scenario: 创建便签
- **WHEN** 用户点击新建便签并输入内容
- **THEN** 便签自动保存，显示在便签列表
- **AND** 自动记录创建时间

#### Scenario: 搜索便签
- **WHEN** 用户在搜索框输入关键词
- **THEN** 实时筛选出内容包含关键词的便签
- **AND** 高亮匹配文本

#### Scenario: 编辑与删除
- **WHEN** 用户点击便签进入详情并修改内容
- **THEN** 修改自动保存
- **AND** 用户可删除便签（需二次确认）

### Requirement: 日记本模块
系统 SHALL 提供按日期记录日记的功能，支持日历视图浏览与回看。

#### Scenario: 写今日日记
- **WHEN** 用户进入日记模块
- **THEN** 默认打开今日日记编辑区
- **AND** 自动保存输入内容

#### Scenario: 日历浏览历史
- **WHEN** 用户打开日历视图
- **THEN** 有日记的日期显示标记点
- **AND** 点击该日期可查看对应日记内容

### Requirement: 数据导出与备份
系统 SHALL 支持将所有数据导出为文件，便于备份与迁移。

#### Scenario: 导出全部数据
- **WHEN** 用户在设置中点击"导出数据"
- **THEN** 系统生成包含所有任务、便签、日记的 JSON 文件
- **AND** 文件名包含导出日期（如 qingji-backup-2026-07-22.json）
- **AND** 用户可选择保存位置

#### Scenario: 导出为 Markdown
- **WHEN** 用户选择"导出为 Markdown"
- **THEN** 系统生成 .md 文件（或压缩包），按模块组织内容
- **AND** 日记按日期命名，便签按时间命名

#### Scenario: 导入恢复
- **WHEN** 用户选择之前导出的 JSON 文件并确认导入
- **THEN** 系统将数据合并/覆盖到本地数据库
- **AND** 导入前需二次确认以防误操作

### Requirement: 简约大气的设计风格
系统 SHALL 遵循简约、大气、轻量的设计语言。

#### Scenario: 视觉风格
- **WHEN** 应用启动
- **THEN** 界面采用大量留白，柔和的中性配色
- **AND** 字体清晰优雅，层级分明
- **AND** 交互元素有克制的微动效（hover、过渡）
- **AND** 支持浅色/深色主题切换

#### Scenario: 响应式布局
- **WHEN** 在桌面端（>768px）
- **THEN** 采用左侧导航栏 + 右侧主内容区布局
- **WHEN** 在移动端（≤768px）
- **THEN** 采用底部 Tab 导航 + 全屏内容区布局

### Requirement: 本地数据持久化
系统 SHALL 将所有数据存储在用户本地，不依赖任何云端服务。

#### Scenario: 桌面端存储
- **WHEN** 用户在桌面端操作
- **THEN** 数据存储在本地 SQLite 数据库文件中
- **AND** 数据库文件位于用户数据目录（如 %APPDATA%/qingji/data.db）

#### Scenario: PWA 端存储
- **WHEN** 用户在移动端 PWA 操作
- **THEN** 数据存储在浏览器 IndexedDB 中
- **AND** 应用可离线使用，断网时正常读写

### Requirement: 通过 GitHub Actions 自动构建 .exe
系统 SHALL 提供 GitHub Actions 工作流，自动在 Windows 环境构建 Tauri 应用并发布到 Releases。

#### Scenario: 自动构建发布
- **WHEN** 用户推送代码到 GitHub 仓库的 main 分支（或手动触发工作流）
- **THEN** GitHub Actions 在 Windows runner 上执行 `tauri build`
- **AND** 构建产物（.exe 及配套文件）自动上传到 GitHub Releases
- **AND** 用户可从 Releases 页面下载 zip 包，解压即用

#### Scenario: PWA 部署
- **WHEN** 用户希望使用移动端
- **THEN** 可将 PWA 构建产物（dist 目录）部署到任意静态托管服务（如 GitHub Pages、Vercel、Netlify）
- **OR** 也可在本地用 `npx serve dist` 起一个临时服务，手机连同一 WiFi 访问
