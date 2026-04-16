mod camera;
mod coloring;
mod engine;
mod bonds;
mod gui;
mod parsers;

use engine::Engine;
use parsers::dump;
use winit::{
    event::{ElementState, Event, MouseButton, MouseScrollDelta, WindowEvent},
    event_loop::{ControlFlow, EventLoop},
    keyboard::KeyCode,
    window::WindowBuilder,
};

/// Embedded demo data — a small LJ melt snapshot for instant startup.
const DEMO_DUMP: &str = r#"ITEM: TIMESTEP
0
ITEM: NUMBER OF ATOMS
8
ITEM: BOX BOUNDS pp pp pp
0.0 6.0
0.0 6.0
0.0 6.0
ITEM: ATOMS id type x y z
1 1 1.0 1.0 1.0
2 1 1.0 1.0 5.0
3 1 1.0 5.0 1.0
4 1 1.0 5.0 5.0
5 2 5.0 1.0 1.0
6 2 5.0 1.0 5.0
7 2 5.0 5.0 1.0
8 2 5.0 5.0 5.0
"#;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
pub fn wasm_main() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
    wasm_bindgen_futures::spawn_local(async {
        if let Err(e) = run().await {
            web_sys::console::error_1(&format!("ATLAS View Native Error: {}", e).into());
        }
    });
}

fn main() -> anyhow::Result<()> {
    #[cfg(not(target_arch = "wasm32"))]
    {
        pollster::block_on(run())?;
    }
    Ok(())
}

async fn run() -> anyhow::Result<()> {
    println!("=== ATLAS View Native (WGPU Atom Visualizer) ===");

    let mut args = std::env::args().skip(1);
    let mut file_path = None;
    let mut angle_arg = None;
    let mut export_dir_arg = None;

    while let Some(arg) = args.next() {
        if arg == "--angle" {
            angle_arg = args.next();
        } else if arg == "--export-video" {
            export_dir_arg = args.next();
        } else if file_path.is_none() {
            file_path = Some(arg);
        }
    }

    let content = {
        #[cfg(not(target_arch = "wasm32"))]
        {
            if let Some(path) = &file_path {
                std::fs::read_to_string(path).unwrap_or_else(|_| DEMO_DUMP.to_string())
            } else {
                DEMO_DUMP.to_string()
            }
        }
        #[cfg(target_arch = "wasm32")]
        {
            DEMO_DUMP.to_string()
        }
    };

    let mut all_frames = dump::parse_dump_frames(&content)
        .map_err(|e| anyhow::anyhow!("Demo parse error: {}", e))?;
    println!("[Init] Loaded {} frames ({} atoms)", all_frames.len(), all_frames.first().map_or(0, |f| f.natoms));

    // 1. Event Loop
    let event_loop = EventLoop::new()?;

    // 2. Window
    let window = WindowBuilder::new()
        .with_title("ATLAS View — Atom Visualizer")
        .with_inner_size(winit::dpi::LogicalSize::new(1280.0, 720.0))
        .build(&event_loop)?;
    let window = std::sync::Arc::new(window);

    // 3. Initialize Engine
    println!("[Init] Creating WGPU engine...");
    
    #[cfg(target_arch = "wasm32")]
    {
        use winit::platform::web::WindowExtWebSys;
        web_sys::window()
            .and_then(|win| win.document())
            .and_then(|doc| {
                let dst = doc.body()?;
                let canvas = web_sys::Element::from(window.canvas()?);
                // Optionally set canvas inline style for full viewport
                canvas.set_attribute("style", "width: 100vw; height: 100vh; display: block; border: none; outline: none; margin: 0; padding: 0;");
                dst.append_child(&canvas).ok()?;
                Some(())
            })
            .expect("Couldn't append canvas to document body.");
    }

    let mut engine = Engine::new(window.clone()).await;
    println!("[Init] Engine online.");

    // Upload initial frame
    if let Some(frame) = all_frames.first() {
        engine.total_frames = all_frames.len();
        engine.current_frame = 0;
        engine.upload_frame(frame);
        
        if let Some(angle) = angle_arg {
            let pi = std::f32::consts::PI;
            match angle.to_lowercase().as_str() {
                "top" => {
                    engine.camera.azimuth = 0.0;
                    engine.camera.elevation = pi / 2.0 - 0.01;
                }
                "bottom" => {
                    engine.camera.azimuth = 0.0;
                    engine.camera.elevation = -pi / 2.0 + 0.01;
                }
                "side" => {
                    engine.camera.azimuth = pi / 2.0;
                    engine.camera.elevation = 0.0;
                }
                "111" => {
                    engine.camera.azimuth = pi / 4.0;
                    engine.camera.elevation = (1.0 / f32::sqrt(3.0)).asin();
                }
                "101" => {
                    engine.camera.azimuth = pi / 4.0;
                    engine.camera.elevation = 0.0;
                }
                _ => {}
            }
        }
    }

    print_controls();

    let mut export_done = false;

    // 4. Main Loop
    let mut closure = move |event: Event<()>, elwt: &winit::event_loop::EventLoopWindowTarget<()>| {
        elwt.set_control_flow(ControlFlow::Poll);

        match event {
            Event::WindowEvent {
                ref event,
                window_id,
            } if window_id == window.id() => {
                let consumed = engine.gui.handle_input(&window, event);
                
                match event {
                    WindowEvent::CloseRequested => elwt.exit(),

                    WindowEvent::Resized(physical_size) => {
                        engine.resize(physical_size.width, physical_size.height);
                    }

                    WindowEvent::RedrawRequested => {
                        match engine.render(&window) {
                            Ok(needs_upload) => {
                                if needs_upload {
                                    if !all_frames.is_empty() {
                                        engine.upload_frame(&all_frames[engine.current_frame].clone());
                                    }
                                }
                            }
                            Err(wgpu::SurfaceError::Lost) => {
                                let size = window.inner_size();
                                engine.resize(size.width, size.height);
                            }
                            Err(e) => eprintln!("[Render] Error: {:?}", e),
                        }
                    }

                    // ─── Keyboard ───
                    WindowEvent::KeyboardInput {
                        event:
                            winit::event::KeyEvent {
                                physical_key: winit::keyboard::PhysicalKey::Code(key_code),
                                state: ElementState::Pressed,
                                ..
                            },
                        ..
                    } if !consumed => match key_code {
                        KeyCode::Escape => elwt.exit(),
                        KeyCode::ArrowRight | KeyCode::Space => {
                            // Next frame
                            if !all_frames.is_empty() {
                                engine.current_frame = (engine.current_frame + 1) % all_frames.len();
                                engine.upload_frame(&all_frames[engine.current_frame]);
                                window.set_title(&format!(
                                    "ATLAS View — Frame {}/{} ({} atoms)",
                                    engine.current_frame + 1,
                                    all_frames.len(),
                                    all_frames[engine.current_frame].natoms
                                ));
                            }
                        }
                        KeyCode::ArrowLeft => {
                            // Previous frame
                            if !all_frames.is_empty() {
                                if engine.current_frame == 0 {
                                    engine.current_frame = all_frames.len() - 1;
                                } else {
                                    engine.current_frame -= 1;
                                }
                                engine.upload_frame(&all_frames[engine.current_frame]);
                                window.set_title(&format!(
                                    "ATLAS View — Frame {}/{} ({} atoms)",
                                    engine.current_frame + 1,
                                    all_frames.len(),
                                    all_frames[engine.current_frame].natoms
                                ));
                            }
                        }
                        KeyCode::KeyR => {
                            // Reset camera
                            if let Some(frame) = all_frames.get(engine.current_frame) {
                                let n = frame.natoms as usize;
                                if n > 0 {
                                    let mut min = [f32::MAX; 3];
                                    let mut max = [f32::MIN; 3];
                                    for i in 0..n {
                                        for d in 0..3 {
                                            let v = frame.positions[i * 3 + d];
                                            if v < min[d] { min[d] = v; }
                                            if v > max[d] { max[d] = v; }
                                        }
                                    }
                                    engine.camera.azimuth = std::f32::consts::FRAC_PI_4;
                                    engine.camera.elevation = std::f32::consts::FRAC_PI_6;
                                    engine.camera.frame_bounds(min, max);
                                }
                            }
                        }
                        KeyCode::KeyO | KeyCode::KeyP => {
                            engine.camera.is_orthographic = !engine.camera.is_orthographic;
                            window.request_redraw();
                        }
                        KeyCode::KeyB => {
                            engine.bg_color_index += 1;
                            window.request_redraw();
                        }
                        KeyCode::KeyM => { // Toggle bonds/connections
                            engine.show_bonds = !engine.show_bonds;
                            if !all_frames.is_empty() {
                                engine.upload_frame(&all_frames[engine.current_frame]);
                            }
                            window.request_redraw();
                        }
                        KeyCode::BracketRight => {
                            engine.global_radius_scale *= 1.1;
                            if !all_frames.is_empty() {
                                engine.upload_frame(&all_frames[engine.current_frame]);
                            }
                        }
                        KeyCode::BracketLeft => {
                            engine.global_radius_scale /= 1.1;
                            if !all_frames.is_empty() {
                                engine.upload_frame(&all_frames[engine.current_frame]);
                            }
                        }
                        KeyCode::Digit1 | KeyCode::Digit2 | KeyCode::Digit3 | KeyCode::Digit4 | 
                        KeyCode::Digit5 | KeyCode::Digit6 | KeyCode::Digit7 | KeyCode::Digit8 | KeyCode::Digit9 => {
                            let type_id = match key_code {
                                KeyCode::Digit1 => 1,
                                KeyCode::Digit2 => 2,
                                KeyCode::Digit3 => 3,
                                KeyCode::Digit4 => 4,
                                KeyCode::Digit5 => 5,
                                KeyCode::Digit6 => 6,
                                KeyCode::Digit7 => 7,
                                KeyCode::Digit8 => 8,
                                KeyCode::Digit9 => 9,
                                _ => unreachable!(),
                            };
                            if engine.hidden_types.contains(&type_id) {
                                engine.hidden_types.remove(&type_id);
                            } else {
                                engine.hidden_types.insert(type_id);
                            }
                            if !all_frames.is_empty() {
                                engine.upload_frame(&all_frames[engine.current_frame]);
                            }
                        }
                        KeyCode::KeyC => {
                            let width = 1920; let height = 1080;
                            println!("[Export] Capturing 1080p frame {}...", engine.current_frame);
                            match engine.render_offline_frame(width, height) {
                                Ok(pixels) => {
                                    let filename = format!("capture_frame_{:04}.png", engine.current_frame);
                                    if let Err(e) = image::save_buffer(&filename, &pixels, width, height, image::ColorType::Rgba8) {
                                        eprintln!("[Export] Failed: {}", e);
                                    } else {
                                        println!("[Export] Saved {}", filename);
                                    }
                                }
                                Err(e) => eprintln!("[Export] Render failure: {}", e),
                            }
                        }
                        KeyCode::KeyV => {
                            #[cfg(not(target_arch = "wasm32"))]
                            {
                                if !all_frames.is_empty() {
                                    println!("[Export] Starting full 1080p offline video export (Sequence of {} frames)...", all_frames.len());
                                    let width = 1920; let height = 1080;
                                    let old_frame = engine.current_frame;
                                    
                                    std::fs::create_dir_all("export").unwrap_or_default();
                                    
                                    for f in 0..all_frames.len() {
                                        engine.current_frame = f;
                                        engine.upload_frame(&all_frames[f]);
                                        if let Ok(pixels) = engine.render_offline_frame(width, height) {
                                            let filename = format!("export/frame_{:04}.png", f);
                                            let _ = image::save_buffer(&filename, &pixels, width, height, image::ColorType::Rgba8);
                                            print!("\r[Export] Rendered {}/{}", f + 1, all_frames.len());
                                            use std::io::Write;
                                            let _ = std::io::stdout().flush();
                                        }
                                    }
                                    println!("\n[Export] V-Sequence successfully exported to physical disk (export/)! Ready for pure uncompressed mapping.");
                                    
                                    engine.current_frame = old_frame;
                                    engine.upload_frame(&all_frames[old_frame]);
                                }
                            }
                        }
                        _ => {}
                    },

                    // ─── Mouse buttons ───
                    WindowEvent::MouseInput { state, button, .. } if !consumed => {
                        let pressed = *state == ElementState::Pressed;
                        match button {
                            MouseButton::Left => engine.camera.dragging_left = pressed,
                            MouseButton::Right => engine.camera.dragging_right = pressed,
                            _ => {}
                        }
                    }

                    // ─── Mouse motion ───
                    WindowEvent::CursorMoved { position, .. } if !consumed => {
                        engine.camera.on_mouse_move(position.x as f32, position.y as f32);
                    }

                    // ─── Scroll zoom ───
                    WindowEvent::MouseWheel { delta, .. } if !consumed => {
                        let scroll = match delta {
                            MouseScrollDelta::LineDelta(_, y) => *y,
                            MouseScrollDelta::PixelDelta(pos) => pos.y as f32 * 0.1,
                        };
                        engine.camera.on_scroll(scroll);
                    }

                    // ─── File drag-and-drop ───
                    WindowEvent::DroppedFile(path) => {
                        #[cfg(not(target_arch = "wasm32"))]
                        {
                            let path_str = path.to_string_lossy();
                            println!("[Drop] Loading: {}", path_str);

                            match std::fs::read_to_string(path) {
                                Ok(content) => {
                                    match dump::parse_dump_frames(&content) {
                                        Ok(frames) if !frames.is_empty() => {
                                            let n_frames = frames.len();
                                            let n_atoms = frames[0].natoms;
                                            all_frames = frames;
                                            engine.current_frame = 0;
                                            engine.total_frames = n_frames;
                                            engine.upload_frame(&all_frames[0]);
                                            window.set_title(&format!(
                                                "ATLAS View — {} ({} frames, {} atoms)",
                                                path_str.split(['/', '\\']).last().unwrap_or("file"),
                                                n_frames,
                                                n_atoms,
                                            ));
                                            println!("[Drop] Loaded {} frames, {} atoms", n_frames, n_atoms);
                                        }
                                        Ok(_) => eprintln!("[Drop] No frames found in file"),
                                        Err(e) => eprintln!("[Drop] Parse error: {}", e),
                                    }
                                }
                                Err(e) => eprintln!("[Drop] Read error: {}", e),
                            }
                        }
                    }

                    _ => {}
                }
            }
            Event::NewEvents(winit::event::StartCause::Init) => {
                #[cfg(not(target_arch = "wasm32"))]
                if let Some(ref export_dir) = export_dir_arg {
                    if !export_done {
                        export_done = true;
                        println!("[Export] Headless automated full 1080p offline video export starting ({} frames)...", all_frames.len());
                        let width = 1920; let height = 1080;
                        
                        std::fs::create_dir_all(export_dir).unwrap_or_default();
                        
                        for f in 0..all_frames.len() {
                            engine.current_frame = f;
                            engine.upload_frame(&all_frames[f]);
                            if let Ok(pixels) = engine.render_offline_frame(width, height) {
                                let filename = format!("{}/frame_{:04}.png", export_dir, f);
                                let _ = image::save_buffer(&filename, &pixels, width, height, image::ColorType::Rgba8);
                                print!("\r[Export] Rendered {}/{}", f + 1, all_frames.len());
                                use std::io::Write;
                                let _ = std::io::stdout().flush();
                            }
                        }
                        println!("\n[Export] V-Sequence successfully exported to physical disk ({}/)! Ready for Remotion/FFmpeg compilation.", export_dir);
                        elwt.exit();
                        return;
                    }
                }
            }

            Event::AboutToWait => {
                if !export_done && export_dir_arg.is_none() {
                    window.request_redraw();
                }
            }

            _ => {}
        }
    };

    #[cfg(target_arch = "wasm32")]
    {
        use winit::platform::web::EventLoopExtWebSys;
        event_loop.spawn(closure);
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        event_loop.run(closure)?;
    }

    Ok(())
}

fn print_controls() {
    println!("=== ATLAS View Controls ===");
    println!("  Left-drag     : Orbit camera");
    println!("  Right-drag    : Pan camera");
    println!("  Scroll        : Zoom in/out");
    println!("  Right / Space : Next frame");
    println!("  Left          : Previous frame");
    println!("  R             : Reset camera");
    println!("  O / P         : Toggle Orthographic/Perspective");
    println!("  B             : Cycle Background Color");
    println!("  [ / ]         : Decrease/Increase Atom Radii");
    println!("  1-9           : Toggle visibility of Atom Type 1-9");
    println!("  C             : Capture 1080p Screenshot (PNG)");
    println!("  V             : Render Entire Video to Image Sequence (1080p)");
    println!("  Escape        : Quit");
    println!("  Drag & Drop   : Load .lammpstrj file");
    println!("===========================");
}
