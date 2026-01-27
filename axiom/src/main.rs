mod nucleus;
// mod cortex;
mod capsule;

use nucleus::engine::Nucleus;
use winit::{
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop},
    window::WindowBuilder,
};

fn main() -> anyhow::Result<()> {
    println!("=== Axiom Universal Platform (WGPU Enabled) ===");

    // 1. Initialize Async Runtime
    let rt = tokio::runtime::Runtime::new()?;

    // 2. Event Loop
    let event_loop = EventLoop::new()?;
    
    // 3. Window
    let window = WindowBuilder::new()
        .with_title("Axiom Cortex")
        .with_inner_size(winit::dpi::LogicalSize::new(1280.0, 720.0))
        .build(&event_loop)?;

    // 4. Initialize Nucleus (Async)
    println!("Initializing Nucleus...");
    let mut nucleus = rt.block_on(Nucleus::new());
    println!("Nucleus Online.");

    // 5. Run Loop
    event_loop.run(move |event, elwt| {
        elwt.set_control_flow(ControlFlow::Poll);

        match event {
            Event::WindowEvent {
                ref event,
                window_id,
            } if window_id == window.id() => {
                match event {
                    WindowEvent::CloseRequested => elwt.exit(),
                    WindowEvent::Resized(physical_size) => {
                        nucleus.resize(physical_size.width, physical_size.height);
                    },
                    WindowEvent::RedrawRequested => {
                        match nucleus.render() {
                            Ok(_) => {}
                            Err(e) => eprintln!("Render error: {:?}", e),
                        }
                    },
                    _ => {}
                }
            },
            Event::AboutToWait => {
                window.request_redraw();
            },
            _ => {}
        }
    })?;

    Ok(())
}
