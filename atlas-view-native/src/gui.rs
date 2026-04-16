use egui::{Context, Visuals};
use egui_wgpu::{Renderer, ScreenDescriptor};
use egui_winit::State;
use winit::window::Window;

pub struct EguiRenderer {
    pub context: Context,
    pub state: State,
    pub renderer: Renderer,
}

impl EguiRenderer {
    pub fn new(
        device: &wgpu::Device,
        output_color_format: wgpu::TextureFormat,
        output_depth_format: Option<wgpu::TextureFormat>,
        msaa_samples: u32,
        window: &Window,
    ) -> Self {
        let context = Context::default();
        context.set_visuals(Visuals::dark());
        
        // Disable pixels per point as the winit integration sets it automatically.
        let state = State::new(
            context.clone(),
            egui::viewport::ViewportId::ROOT,
            window,
            Some(window.scale_factor() as f32),
            None,
        );

        let renderer = Renderer::new(device, output_color_format, output_depth_format, msaa_samples);

        Self {
            context,
            state,
            renderer,
        }
    }

    pub fn handle_input(&mut self, window: &Window, event: &winit::event::WindowEvent) -> bool {
        let response = self.state.on_window_event(window, event);
        response.consumed
    }

    pub fn draw(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        encoder: &mut wgpu::CommandEncoder,
        window: &Window,
        window_surface_view: &wgpu::TextureView,
        screen_descriptor: ScreenDescriptor,
        run_ui: impl FnOnce(&Context),
    ) {
        let raw_input = self.state.take_egui_input(window);
        self.context.begin_frame(raw_input);

        run_ui(&self.context);

        let full_output = self.context.end_frame();
        self.state.handle_platform_output(window, full_output.platform_output);

        let tris = self.context.tessellate(full_output.shapes, full_output.pixels_per_point);
        for (id, image_delta) in &full_output.textures_delta.set {
            self.renderer.update_texture(device, queue, *id, image_delta);
        }

        self.renderer.update_buffers(
            device,
            queue,
            encoder,
            &tris,
            &screen_descriptor,
        );

        {
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("egui pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: window_surface_view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Load,
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                occlusion_query_set: None,
                timestamp_writes: None,
            });
            self.renderer.render(&mut pass, &tris, &screen_descriptor);
        }

        for x in &full_output.textures_delta.free {
            self.renderer.free_texture(x);
        }
    }
}
