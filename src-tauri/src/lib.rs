// 轻记 Tauri 桌面端入口：注册所需插件。
// 注意：路径能力由 Tauri 核心 `tauri::path` 提供（无独立 plugin-path），
// 前端通过 `@tauri-apps/api/path` 调用，权限在 capabilities/default.json 中授予。

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
