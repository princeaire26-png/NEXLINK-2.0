#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let open = MenuItem::with_id(app, "open", "Open NEXLINK", true, None::<&str>)?;
            let client = MenuItem::with_id(app, "client", "Endpoint Client", true, None::<&str>)?;
            let manager = MenuItem::with_id(app, "manager", "Server Manager", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Exit NEXLINK", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &client, &manager, &quit])?;
            let tray_icon = app.default_window_icon().expect("NEXLINK application icon is required").clone();
            TrayIconBuilder::new()
                .icon(tray_icon)
                .tooltip("NEXLINK — Connect. Control. Automate.")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => { if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.set_focus(); } },
                    "client" => { if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.eval("window.history.pushState({}, '', '/client'); window.dispatchEvent(new PopStateEvent('popstate'))"); let _ = w.set_focus(); } },
                    "manager" => { if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.eval("window.history.pushState({}, '', '/manager'); window.dispatchEvent(new PopStateEvent('popstate'))"); let _ = w.set_focus(); } },
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            if let Some(window) = app.get_webview_window("main") { let _ = window.show(); }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("NEXLINK desktop runtime failed");
}
