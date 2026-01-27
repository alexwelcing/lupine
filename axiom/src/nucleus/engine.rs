use wgpu;

pub struct Nucleus {
    pub instance: wgpu::Instance,
    pub adapter: Option<wgpu::Adapter>,
    pub device: Option<wgpu::Device>,
    pub queue: Option<wgpu::Queue>,
}

impl Nucleus {
    pub async fn new() -> Self {
        println!("[Nucleus] Booting Hardware Abstraction Layer...");
        
        let instance = wgpu::Instance::default();
        
        let adapter = instance.request_adapter(
            &wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: None,
                force_fallback_adapter: false,
            },
        ).await;

        let mut device = None;
        let mut queue = None;

        if let Some(ref a) = adapter {
            println!("[Nucleus] Dedicated GPU Detected: {:?}", a.get_info().name);
            // Request device
            if let Ok((d, q)) = a.request_device(
                &wgpu::DeviceDescriptor {
                    label: Some("Nucleus Main Device"),
                    required_features: wgpu::Features::empty(),
                    required_limits: wgpu::Limits::default(),
                },
                None,
            ).await {
                device = Some(d);
                queue = Some(q);
                println!("[Nucleus] Device & Queue acquired.");
            }
        } else {
             println!("[Nucleus] Warning: No High-Performance Adapter found.");
        }

        Self {
            instance,
            adapter,
            device,
            queue,
        }
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        if width > 0 && height > 0 {
            println!("[Nucleus] Resized to {}x{}", width, height);
            // Recreate surface config here in real impl
        }
    }

    pub fn render(&mut self) -> Result<(), wgpu::SurfaceError> {
        // println!("[Nucleus] Render Cycle"); // Commented to avoid log spam
        // Real impl: surface.get_current_texture(), render_pass()
        Ok(())
    }
}
