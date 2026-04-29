/// ATLAS View Engine — Native WGPU atom rendering pipeline.
/// Adapted from Axiom's Nucleus kernel, redesigned for impostor sphere atoms.

use crate::camera::{CameraUniform, OrbitalCamera};
use crate::coloring;
use crate::parsers::types::Frame;

/// Atom coloring modes
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ColorMode {
    /// Color by atom type (default CPK-style)
    Type,
    /// Color by velocity magnitude (blue-white-red)
    VelocityMagnitude,
    /// Color by kinetic energy (blue-yellow-red)
    KineticEnergy,
    /// Color by per-atom property (e.g., c_pe, c_stress)
    Property(usize), // index into frame.properties
}

#[repr(C)]
#[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
pub struct LightingUniform {
    pub direction: [f32; 3],
    pub intensity: f32,
    pub ambient: f32,
    pub specular: f32,
    pub shininess: f32,
    pub _pad: f32,
}

impl Default for LightingUniform {
    fn default() -> Self {
        Self {
            direction: [0.5, 0.8, 0.6],
            intensity: 1.0,
            ambient: 0.25,
            specular: 0.5,
            shininess: 32.0,
            _pad: 0.0,
        }
    }
}

pub struct Engine {
    // Core WGPU — same pattern as Axiom Nucleus
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    pub surface: wgpu::Surface<'static>,
    pub config: wgpu::SurfaceConfiguration,
    pub size: winit::dpi::PhysicalSize<u32>,

    // Render pipeline
    render_pipeline: wgpu::RenderPipeline,
    depth_texture: wgpu::TextureView,
    msaa_texture: wgpu::TextureView,
    sample_count: u32,

    // Uniform buffers
    camera_buffer: wgpu::Buffer,
    lighting_buffer: wgpu::Buffer,
    uniform_bind_group: wgpu::BindGroup,

    // Per-atom storage buffers
    position_buffer: wgpu::Buffer,
    radii_buffer: wgpu::Buffer,
    color_buffer: wgpu::Buffer,
    atom_bind_group: wgpu::BindGroup,
    atom_bind_group_layout: wgpu::BindGroupLayout,

    // State
    pub atom_count: u32,
    pub camera: OrbitalCamera,
    pub current_frame: usize,
    pub total_frames: usize,
    pub global_radius_scale: f32,
    pub hidden_types: std::collections::HashSet<i32>,
    pub bg_color_index: usize,
    pub show_bonds: bool,

    bond_pipeline: wgpu::RenderPipeline,
    bond_position_buffer: wgpu::Buffer,
    bond_color_buffer: wgpu::Buffer,
    bond_count: u32,

    pub gui: crate::gui::EguiRenderer,

    max_atoms: u32,

    // Playback state
    pub is_playing: bool,
    pub playback_fps: f32,
    pub last_frame_time: std::time::Instant,

    // Coloring mode
    pub color_mode: ColorMode,
}

impl Engine {
    const MAX_ATOMS: u32 = 2_000_000; // 2M atoms max

    pub async fn new(window: std::sync::Arc<winit::window::Window>) -> Self {
        let size = window.inner_size();

        // ─── WGPU Init (Axiom Nucleus pattern) ───
        let instance = wgpu::Instance::default();
        let surface = instance.create_surface(window.clone()).expect("Failed to create surface");

        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: Some(&surface),
                force_fallback_adapter: false,
            })
            .await
            .expect("No suitable GPU found");

        // Use downlevel_webgl2_defaults as a safe baseline for browser WebGPU,
        // then raise only the limits we actually need. Limits::default() includes
        // fields like maxInterStageShaderComponents that some browsers reject.
        let mut limits = wgpu::Limits::downlevel_webgl2_defaults();
        limits.max_storage_buffer_binding_size = 256 * 1024 * 1024; // 256MB for large atom buffers
        limits.max_buffer_size = 256 * 1024 * 1024;
        limits.max_bind_groups = 4;
        limits.max_storage_buffers_per_shader_stage = 8;
        limits.max_uniform_buffer_binding_size = 65536;

        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    label: Some("ATLAS Device"),
                    required_features: wgpu::Features::empty(),
                    required_limits: limits,
                },
                None,
            )
            .await
            .expect("Failed to create device");

        let caps = surface.get_capabilities(&adapter);
        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: caps.formats[0],
            width: size.width.max(1),
            height: size.height.max(1),
            present_mode: wgpu::PresentMode::Fifo,
            alpha_mode: caps.alpha_modes[0],
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        surface.configure(&device, &config);

        let max_atoms = Self::MAX_ATOMS;

        // ─── Shader ───
        let shader = device.create_shader_module(wgpu::include_wgsl!("shaders/atom.wgsl"));

        // ─── Uniform Bind Group Layout (group 0: camera + lighting) ───
        let uniform_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                entries: &[
                    wgpu::BindGroupLayoutEntry {
                        binding: 0,
                        visibility: wgpu::ShaderStages::VERTEX | wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Uniform,
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        count: None,
                    },
                    wgpu::BindGroupLayoutEntry {
                        binding: 1,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Uniform,
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        count: None,
                    },
                ],
                label: Some("uniform_bind_group_layout"),
            });

        // ─── Atom Bind Group Layout (group 1: positions, radii, colors) ───
        let atom_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                entries: &[
                    wgpu::BindGroupLayoutEntry {
                        binding: 0,
                        visibility: wgpu::ShaderStages::VERTEX,
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Storage { read_only: true },
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        count: None,
                    },
                    wgpu::BindGroupLayoutEntry {
                        binding: 1,
                        visibility: wgpu::ShaderStages::VERTEX,
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Storage { read_only: true },
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        count: None,
                    },
                    wgpu::BindGroupLayoutEntry {
                        binding: 2,
                        visibility: wgpu::ShaderStages::VERTEX | wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Storage { read_only: true },
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        count: None,
                    },
                ],
                label: Some("atom_bind_group_layout"),
            });

        // ─── Pipeline Layout ───
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Atom Pipeline Layout"),
            bind_group_layouts: &[&uniform_bind_group_layout, &atom_bind_group_layout],
            push_constant_ranges: &[],
        });

        // ─── Render Pipeline ───
        let depth_format = wgpu::TextureFormat::Depth32Float;
        let sample_count = 4; // 4x MSAA

        let render_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Atom Render Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: "vs_main",
                buffers: &[], // No vertex buffers — all per-instance data in storage
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: "fs_main",
                targets: &[Some(wgpu::ColorTargetState {
                    format: config.format,
                    blend: Some(wgpu::BlendState::REPLACE),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleStrip,
                strip_index_format: Some(wgpu::IndexFormat::Uint32),
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: None, // Billboards face camera, no culling needed
                polygon_mode: wgpu::PolygonMode::Fill,
                unclipped_depth: false,
                conservative: false,
            },
            depth_stencil: Some(wgpu::DepthStencilState {
                format: depth_format,
                depth_write_enabled: true,
                depth_compare: wgpu::CompareFunction::Less,
                stencil: wgpu::StencilState::default(),
                bias: wgpu::DepthBiasState::default(),
            }),
            multisample: wgpu::MultisampleState {
                count: sample_count,
                mask: !0,
                alpha_to_coverage_enabled: false,
            },
            multiview: None,
        });

        // ─── Bond Pipeline ───
        let bond_shader = device.create_shader_module(wgpu::include_wgsl!("shaders/bonds.wgsl"));
        let bond_pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Bond Pipeline Layout"),
            bind_group_layouts: &[&uniform_bind_group_layout],
            push_constant_ranges: &[],
        });
        
        let bond_vertex_buffers = [
            wgpu::VertexBufferLayout {
                array_stride: 12,
                step_mode: wgpu::VertexStepMode::Vertex,
                attributes: &[wgpu::VertexAttribute { format: wgpu::VertexFormat::Float32x3, offset: 0, shader_location: 0 }],
            },
            wgpu::VertexBufferLayout {
                array_stride: 16,
                step_mode: wgpu::VertexStepMode::Vertex,
                attributes: &[wgpu::VertexAttribute { format: wgpu::VertexFormat::Float32x4, offset: 0, shader_location: 1 }],
            },
        ];

        let bond_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Bond Render Pipeline"),
            layout: Some(&bond_pipeline_layout),
            vertex: wgpu::VertexState {
                module: &bond_shader,
                entry_point: "vs_main",
                buffers: &bond_vertex_buffers,
            },
            fragment: Some(wgpu::FragmentState {
                module: &bond_shader,
                entry_point: "fs_main",
                targets: &[Some(wgpu::ColorTargetState {
                    format: config.format,
                    blend: Some(wgpu::BlendState::ALPHA_BLENDING),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::LineList,
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: None,
                polygon_mode: wgpu::PolygonMode::Fill,
                unclipped_depth: false,
                conservative: false,
            },
            depth_stencil: Some(wgpu::DepthStencilState {
                format: depth_format,
                depth_write_enabled: false,
                depth_compare: wgpu::CompareFunction::Less,
                stencil: wgpu::StencilState::default(),
                bias: wgpu::DepthBiasState::default(),
            }),
            multisample: wgpu::MultisampleState {
                count: sample_count,
                mask: !0,
                alpha_to_coverage_enabled: false,
            },
            multiview: None,
        });

        // ─── Buffers ───
        use wgpu::util::DeviceExt;

        let camera_uniform = CameraUniform {
            view: [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0], [0.0, 0.0, 1.0, 0.0], [0.0, 0.0, 0.0, 1.0]],
            projection: [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0], [0.0, 0.0, 1.0, 0.0], [0.0, 0.0, 0.0, 1.0]],
            view_proj: [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0], [0.0, 0.0, 1.0, 0.0], [0.0, 0.0, 0.0, 1.0]],
            position: [0.0, 0.0, 20.0],
            near: 0.1,
            far: 1000.0,
            width: size.width as f32,
            height: size.height as f32,
            _pad: 0.0,
        };

        let camera_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Camera Buffer"),
            contents: bytemuck::cast_slice(&[camera_uniform]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        let lighting = LightingUniform::default();
        let lighting_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Lighting Buffer"),
            contents: bytemuck::cast_slice(&[lighting]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        let uniform_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            layout: &uniform_bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: camera_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: lighting_buffer.as_entire_binding(),
                },
            ],
            label: Some("uniform_bind_group"),
        });

        // Storage buffers — pre-allocate for max atoms
        let position_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Position Storage"),
            size: (max_atoms as u64) * 3 * 4,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let radii_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Radii Storage"),
            size: (max_atoms as u64) * 4,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let color_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Color Storage"),
            size: (max_atoms as u64) * 4 * 4, // vec4<f32> per atom
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let max_bond_verts = 5_000_000;
        let bond_position_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Bond Position Storage"),
            size: (max_bond_verts as u64) * 12,
            usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let bond_color_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Bond Color Storage"),
            size: (max_bond_verts as u64) * 16,
            usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let atom_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            layout: &atom_bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: position_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: radii_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: color_buffer.as_entire_binding(),
                },
            ],
            label: Some("atom_bind_group"),
        });

        let depth_texture = Self::create_depth_texture(&device, config.width, config.height, depth_format, sample_count);
        let msaa_texture = Self::create_msaa_texture(&device, config.width, config.height, config.format, sample_count);

        let mut camera = OrbitalCamera::new();
        camera.on_resize(size.width as f32, size.height as f32);

        let gui = crate::gui::EguiRenderer::new(&device, config.format, None, 1, &window);

        Self {
            device,
            queue,
            surface,
            config,
            size,
            render_pipeline,
            depth_texture,
            msaa_texture,
            sample_count,
            camera_buffer,
            lighting_buffer,
            uniform_bind_group,
            position_buffer,
            radii_buffer,
            color_buffer,
            atom_bind_group,
            atom_bind_group_layout,
            atom_count: 0,
            camera,
            current_frame: 0,
            total_frames: 0,
            global_radius_scale: 1.0,
            hidden_types: std::collections::HashSet::new(),
            bg_color_index: 0,
            show_bonds: false,
            bond_pipeline,
            bond_position_buffer,
            bond_color_buffer,
            bond_count: 0,
            gui,
            max_atoms,
            is_playing: false,
            playback_fps: 30.0,
            last_frame_time: std::time::Instant::now(),
            color_mode: ColorMode::Type,
        }
    }

    fn create_depth_texture(
        device: &wgpu::Device,
        width: u32,
        height: u32,
        format: wgpu::TextureFormat,
        sample_count: u32,
    ) -> wgpu::TextureView {
        let tex = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Depth Texture"),
            size: wgpu::Extent3d {
                width: width.max(1),
                height: height.max(1),
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count,
            dimension: wgpu::TextureDimension::D2,
            format,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        });
        tex.create_view(&wgpu::TextureViewDescriptor::default())
    }

    fn create_msaa_texture(
        device: &wgpu::Device,
        width: u32,
        height: u32,
        format: wgpu::TextureFormat,
        sample_count: u32,
    ) -> wgpu::TextureView {
        let tex = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("MSAA Color Texture"),
            size: wgpu::Extent3d {
                width: width.max(1),
                height: height.max(1),
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count,
            dimension: wgpu::TextureDimension::D2,
            format,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        });
        tex.create_view(&wgpu::TextureViewDescriptor::default())
    }

    /// Extract velocity magnitudes and property arrays from a frame for coloring.
    fn extract_color_data(&self, frame: &Frame, n: usize) -> (Option<Vec<f32>>, Vec<Option<Vec<f32>>>) {
        // Find velocity columns (vx, vy, vz)
        let vx = frame.properties.iter().find(|(k, _)| k == "vx").map(|(_, v)| v);
        let vy = frame.properties.iter().find(|(k, _)| k == "vy").map(|(_, v)| v);
        let vz = frame.properties.iter().find(|(k, _)| k == "vz").map(|(_, v)| v);

        let velocities = match (vx, vy, vz) {
            (Some(vx), Some(vy), Some(vz)) if vx.len() >= n && vy.len() >= n && vz.len() >= n => {
                let mut mags = Vec::with_capacity(n);
                for i in 0..n {
                    let vmag = (vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]).sqrt();
                    mags.push(vmag);
                }
                Some(mags)
            }
            _ => None,
        };

        // Extract all property arrays for Property coloring mode
        let prop_values: Vec<Option<Vec<f32>>> = frame
            .properties
            .iter()
            .map(|(_, v)| {
                if v.len() >= n {
                    Some(v[..n].to_vec())
                } else {
                    None
                }
            })
            .collect();

        (velocities, prop_values)
    }

    /// Resize the surface and depth buffer (same pattern as Axiom Nucleus::resize).
    pub fn resize(&mut self, width: u32, height: u32) {
        if width > 0 && height > 0 {
            self.size = winit::dpi::PhysicalSize::new(width, height);
            self.config.width = width;
            self.config.height = height;
            self.surface.configure(&self.device, &self.config);
            self.depth_texture = Self::create_depth_texture(
                &self.device,
                self.config.width,
                self.config.height,
                wgpu::TextureFormat::Depth32Float,
                self.sample_count,
            );
            self.msaa_texture = Self::create_msaa_texture(
                &self.device,
                self.config.width,
                self.config.height,
                self.config.format,
                self.sample_count,
            );
            self.camera.on_resize(width as f32, height as f32);
        }
    }

    /// Upload atom data from a parsed LAMMPS frame to the GPU.
    pub fn upload_frame(&mut self, frame: &Frame) {
        let natoms = (frame.natoms as u32).min(self.max_atoms);
        self.atom_count = natoms;

        // Positions — direct copy from parser output
        let pos_bytes = bytemuck::cast_slice(&frame.positions[..natoms as usize * 3]);
        self.queue.write_buffer(&self.position_buffer, 0, pos_bytes);

        // Build radii and colors based on color mode
        let n = natoms as usize;
        let mut radii = Vec::with_capacity(n);
        let mut colors: Vec<[f32; 4]> = Vec::with_capacity(n);

        // Pre-compute property data for velocity/energy coloring
        let (velocities, prop_values) = self.extract_color_data(frame, n);

        for i in 0..n {
            let atom_type = frame.types[i];
            if self.hidden_types.contains(&atom_type) {
                radii.push(0.0);
            } else {
                radii.push(coloring::radius_for_type(atom_type) * self.global_radius_scale);
            }

            let color = match self.color_mode {
                ColorMode::Type => coloring::color_for_type(atom_type),
                ColorMode::VelocityMagnitude => {
                    if let Some(ref vels) = velocities {
                        let vmag = vels[i];
                        coloring::velocity_to_color(vmag, vels)
                    } else {
                        coloring::color_for_type(atom_type)
                    }
                }
                ColorMode::KineticEnergy => {
                    if let Some(ref vels) = velocities {
                        // KE ∝ v² (mass assumed uniform)
                        let ke = vels[i] * vels[i];
                        let ke_vals: Vec<f32> = vels.iter().map(|v| v * v).collect();
                        coloring::velocity_to_color(ke.sqrt(), &ke_vals.iter().map(|k| k.sqrt()).collect::<Vec<_>>())
                    } else {
                        coloring::color_for_type(atom_type)
                    }
                }
                ColorMode::Property(idx) => {
                    if let Some(ref vals) = prop_values.get(idx).and_then(|v| v.as_ref()) {
                        coloring::property_to_color(vals[i], vals)
                    } else {
                        coloring::color_for_type(atom_type)
                    }
                }
            };
            colors.push(color);
        }

        self.queue
            .write_buffer(&self.radii_buffer, 0, bytemuck::cast_slice(&radii));
        self.queue
            .write_buffer(&self.color_buffer, 0, bytemuck::cast_slice(&colors));

        // Auto-frame camera to fit atoms
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
            self.camera.frame_bounds(min, max);
        }

        if self.show_bonds {
            let (bond_positions, bond_colors) = if let Some(ref topo) = frame.topological_bonds {
                let mut p = Vec::with_capacity(topo.len() * 6);
                let mut c = Vec::with_capacity(topo.len() * 8);
                for &(i1, i2) in topo {
                    let idx1 = i1 as usize;
                    let idx2 = i2 as usize;
                    if idx1 < n && idx2 < n {
                        p.extend_from_slice(&frame.positions[idx1*3 .. idx1*3+3]);
                        c.extend_from_slice(&colors[idx1]);
                        p.extend_from_slice(&frame.positions[idx2*3 .. idx2*3+3]);
                        c.extend_from_slice(&colors[idx2]);
                    }
                }
                (p, c)
            } else {
                let cutoff = 3.2; // Generous cutoff for most crystal/melt pairs like CuZr
                crate::bonds::compute_bonds(
                    &frame.positions[..natoms as usize * 3],
                    &frame.types[..natoms as usize],
                    &self.hidden_types,
                    cutoff,
                )
            };
            
            let num_verts = bond_positions.len() / 3;
            let limit = 5_000_000;
            self.bond_count = (num_verts as u32).min(limit as u32);
            
            if self.bond_count > 0 {
                let limit_pos = (self.bond_count as usize) * 3;
                let limit_col = (self.bond_count as usize) * 4;
                self.queue.write_buffer(&self.bond_position_buffer, 0, bytemuck::cast_slice(&bond_positions[..limit_pos]));
                self.queue.write_buffer(&self.bond_color_buffer, 0, bytemuck::cast_slice(&bond_colors[..limit_col]));
            }
        } else {
            self.bond_count = 0;
        }

        println!(
            "[Engine] Uploaded {} atoms (frame {}/{})",
            natoms, self.current_frame + 1, self.total_frames
        );
    }

    /// Render one frame — the main draw call.
    pub fn render(&mut self, window: &winit::window::Window) -> Result<bool, wgpu::SurfaceError> {
        // Update camera uniform
        let cam_uniform = self.camera.uniform();
        self.queue
            .write_buffer(&self.camera_buffer, 0, bytemuck::cast_slice(&[cam_uniform]));

        let output = self.surface.get_current_texture()?;
        let view = output
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());

        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("Main Encoder"),
            });

        let bg_colors = [
            wgpu::Color { r: 0.06, g: 0.06, b: 0.10, a: 1.0 }, // Dark Blue
            wgpu::Color { r: 0.00, g: 0.00, b: 0.00, a: 1.0 }, // Pure Black
            wgpu::Color { r: 1.00, g: 1.00, b: 1.00, a: 1.0 }, // Pure White
            wgpu::Color { r: 0.15, g: 0.15, b: 0.15, a: 1.0 }, // Neutral Gray
        ];
        let clear_color = bg_colors[self.bg_color_index % bg_colors.len()];

        {
            // Render to MSAA texture and resolve to swapchain
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Atom Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &self.msaa_texture,
                    resolve_target: Some(&view),
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(clear_color),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                    view: &self.depth_texture,
                    depth_ops: Some(wgpu::Operations {
                        load: wgpu::LoadOp::Clear(1.0),
                        store: wgpu::StoreOp::Store,
                    }),
                    stencil_ops: None,
                }),
                occlusion_query_set: None,
                timestamp_writes: None,
            });
            if self.atom_count > 0 {
                if self.show_bonds && self.bond_count > 0 {
                    render_pass.set_pipeline(&self.bond_pipeline);
                    render_pass.set_bind_group(0, &self.uniform_bind_group, &[]);
                    render_pass.set_vertex_buffer(0, self.bond_position_buffer.slice(..));
                    render_pass.set_vertex_buffer(1, self.bond_color_buffer.slice(..));
                    render_pass.draw(0..self.bond_count, 0..1);
                }

                render_pass.set_pipeline(&self.render_pipeline);
                render_pass.set_bind_group(0, &self.uniform_bind_group, &[]);
                render_pass.set_bind_group(1, &self.atom_bind_group, &[]);
                // 4 vertices per quad (triangle strip), instanced per atom
                render_pass.draw(0..4, 0..self.atom_count);
            }
        } // Drop render pass

        let screen_desc = egui_wgpu::ScreenDescriptor {
            size_in_pixels: [self.config.width, self.config.height],
            pixels_per_point: window.scale_factor() as f32,
        };

        let mut global_radius_scale = self.global_radius_scale;
        let mut bg_color_index = self.bg_color_index;
        let mut show_bonds = self.show_bonds;
        let mut is_ortho = self.camera.is_orthographic;
        let mut hidden_types = self.hidden_types.clone();
        let mut is_playing = self.is_playing;
        let mut playback_fps = self.playback_fps;
        let mut color_mode_idx = match self.color_mode {
            ColorMode::Type => 0,
            ColorMode::VelocityMagnitude => 1,
            ColorMode::KineticEnergy => 2,
            ColorMode::Property(_) => 3,
        };
        let current_frame = self.current_frame;
        let total_frames = self.total_frames;

        self.gui.draw(
            &self.device,
            &self.queue,
            &mut encoder,
            window,
            &view,
            screen_desc,
            |ctx| {
                egui::Window::new("ATLAS View Controls")
                    .default_pos([20.0, 20.0])
                    .show(ctx, |ui| {
                        // ─── Playback Controls ───
                        let has_animation = total_frames > 1;
                        ui.heading("Playback");
                        ui.add_enabled_ui(has_animation, |ui| {
                            ui.horizontal(|ui| {
                                if ui.button(if is_playing { "⏸ Pause" } else { "▶ Play" }).clicked() {
                                    is_playing = !is_playing;
                                }
                                ui.label(format!("Frame {}/{}", current_frame + 1, total_frames));
                            });
                            ui.add(egui::Slider::new(&mut playback_fps, 1.0..=120.0).text("FPS"));
                        });

                        ui.separator();

                        // ─── Coloring Mode ───
                        ui.heading("Coloring");
                        // Only disable velocity/energy toggles if we had a flag for it, but for static .data files we naturally fallback to By Type. We will let the user click them, but they just act as fallback, which is standard. 
                        egui::ComboBox::from_label("Mode")
                            .selected_text(match color_mode_idx {
                                0 => "By Type",
                                1 => "Velocity",
                                2 => "Kinetic Energy",
                                _ => "Property",
                            })
                            .show_ui(ui, |ui| {
                                ui.selectable_value(&mut color_mode_idx, 0, "By Type");
                                ui.selectable_value(&mut color_mode_idx, 1, "Velocity");
                                ui.selectable_value(&mut color_mode_idx, 2, "Kinetic Energy");
                            });

                        ui.separator();

                        // ─── Render Settings ───
                        ui.heading("Render Settings");
                        ui.add(egui::Slider::new(&mut global_radius_scale, 0.05..=5.0).text("Radius Scale"));
                        ui.checkbox(&mut is_ortho, "Orthographic Projection");
                        ui.checkbox(&mut show_bonds, "Compute & Render Bonds");

                        ui.separator();
                        ui.heading("Background");
                        ui.horizontal(|ui| {
                            if ui.button("Dark").clicked() { bg_color_index = 0; }
                            if ui.button("Black").clicked() { bg_color_index = 1; }
                            if ui.button("White").clicked() { bg_color_index = 2; }
                            if ui.button("Gray").clicked() { bg_color_index = 3; }
                        });

                        ui.separator();
                        ui.heading("Atom Types");
                        ui.horizontal_wrapped(|ui| {
                            for i in 1..=10 {
                                let mut visible = !hidden_types.contains(&i);
                                if ui.checkbox(&mut visible, format!("T{}", i)).changed() {
                                    if visible {
                                        hidden_types.remove(&i);
                                    } else {
                                        hidden_types.insert(i);
                                    }
                                }
                            }
                        });
                    });
            },
        );

        let mut needs_upload = false;
        if self.global_radius_scale != global_radius_scale {
            self.global_radius_scale = global_radius_scale;
            needs_upload = true;
        }
        if self.hidden_types != hidden_types {
            self.hidden_types = hidden_types;
            needs_upload = true;
        }
        if self.show_bonds != show_bonds {
            self.show_bonds = show_bonds;
            needs_upload = true;
        }

        // Update color mode
        let new_color_mode = match color_mode_idx {
            0 => ColorMode::Type,
            1 => ColorMode::VelocityMagnitude,
            2 => ColorMode::KineticEnergy,
            _ => ColorMode::Property(0),
        };
        if self.color_mode != new_color_mode {
            self.color_mode = new_color_mode;
            needs_upload = true;
        }

        self.bg_color_index = bg_color_index;
        self.camera.is_orthographic = is_ortho;
        self.is_playing = is_playing;
        self.playback_fps = playback_fps;

        self.queue.submit(std::iter::once(encoder.finish()));
        output.present();

        // Check if we should advance to the next frame (playback)
        let should_advance = if self.is_playing && self.total_frames > 1 {
            let frame_duration = std::time::Duration::from_secs_f32(1.0 / self.playback_fps);
            let elapsed = self.last_frame_time.elapsed();
            if elapsed >= frame_duration {
                self.last_frame_time = std::time::Instant::now();
                self.current_frame = (self.current_frame + 1) % self.total_frames;
                true
            } else {
                false
            }
        } else {
            false
        };

        Ok(needs_upload || should_advance)
    }

    /// Extracts a raw RGBA byte vector of the scene at an exact target resolution,
    /// regardless of current window bounds.
    pub fn render_offline_frame(&mut self, width: u32, height: u32) -> anyhow::Result<Vec<u8>> {
        let align = wgpu::COPY_BYTES_PER_ROW_ALIGNMENT;
        let unpadded_bytes_per_row = width * 4;
        let padded_bytes_per_row = (unpadded_bytes_per_row + align - 1) & !(align - 1);

        // MSAA render target (matches pipeline sample_count)
        let msaa_tex = self.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Offline MSAA Texture"),
            size: wgpu::Extent3d { width, height, depth_or_array_layers: 1 },
            mip_level_count: 1,
            sample_count: self.sample_count,
            dimension: wgpu::TextureDimension::D2,
            format: self.config.format,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        });
        let msaa_view = msaa_tex.create_view(&wgpu::TextureViewDescriptor::default());

        // Resolve target (sample_count: 1) for final output
        let resolve_tex = self.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Offline Resolve Texture"),
            size: wgpu::Extent3d { width, height, depth_or_array_layers: 1 },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: self.config.format,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::COPY_SRC,
            view_formats: &[],
        });
        let resolve_view = resolve_tex.create_view(&wgpu::TextureViewDescriptor::default());

        let depth_tex = Self::create_depth_texture(&self.device, width, height, wgpu::TextureFormat::Depth32Float, self.sample_count);

        let out_buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Offline Output Buffer"),
            size: (padded_bytes_per_row * height) as u64,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        // Temp update camera bounds
        let old_w = self.camera.width;
        let old_h = self.camera.height;
        self.camera.on_resize(width as f32, height as f32);
        
        let cam_uniform = self.camera.uniform();
        self.queue.write_buffer(&self.camera_buffer, 0, bytemuck::cast_slice(&[cam_uniform]));

        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: Some("Offline Encoder") });

        let bg_colors = [
            wgpu::Color { r: 0.06, g: 0.06, b: 0.10, a: 1.0 },
            wgpu::Color { r: 0.00, g: 0.00, b: 0.00, a: 1.0 },
            wgpu::Color { r: 1.00, g: 1.00, b: 1.00, a: 1.0 },
            wgpu::Color { r: 0.15, g: 0.15, b: 0.15, a: 1.0 },
        ];
        let clear_color = bg_colors[self.bg_color_index % bg_colors.len()];

        {
            // Render to MSAA texture and resolve to output texture
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Offline Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &msaa_view,
                    resolve_target: Some(&resolve_view),
                    ops: wgpu::Operations { load: wgpu::LoadOp::Clear(clear_color), store: wgpu::StoreOp::Store },
                })],
                depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                    view: &depth_tex,
                    depth_ops: Some(wgpu::Operations { load: wgpu::LoadOp::Clear(1.0), store: wgpu::StoreOp::Store }),
                    stencil_ops: None,
                }),
                occlusion_query_set: None,
                timestamp_writes: None,
            });

            if self.atom_count > 0 {
                if self.show_bonds && self.bond_count > 0 {
                    render_pass.set_pipeline(&self.bond_pipeline);
                    render_pass.set_bind_group(0, &self.uniform_bind_group, &[]);
                    render_pass.set_vertex_buffer(0, self.bond_position_buffer.slice(..));
                    render_pass.set_vertex_buffer(1, self.bond_color_buffer.slice(..));
                    render_pass.draw(0..self.bond_count, 0..1);
                }

                render_pass.set_pipeline(&self.render_pipeline);
                render_pass.set_bind_group(0, &self.uniform_bind_group, &[]);
                render_pass.set_bind_group(1, &self.atom_bind_group, &[]);
                render_pass.draw(0..4, 0..self.atom_count);
            }
        }

        // Copy from resolved texture (not MSAA)
        encoder.copy_texture_to_buffer(
            wgpu::ImageCopyTexture { texture: &resolve_tex, mip_level: 0, origin: wgpu::Origin3d::ZERO, aspect: wgpu::TextureAspect::All },
            wgpu::ImageCopyBuffer {
                buffer: &out_buffer,
                layout: wgpu::ImageDataLayout { offset: 0, bytes_per_row: Some(padded_bytes_per_row), rows_per_image: Some(height) },
            },
            wgpu::Extent3d { width, height, depth_or_array_layers: 1 },
        );

        self.queue.submit(std::iter::once(encoder.finish()));

        // Map buffer async
        let buffer_slice = out_buffer.slice(..);
        let (tx, rx) = std::sync::mpsc::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |v| tx.send(v).unwrap());
        self.device.poll(wgpu::Maintain::Wait);
        rx.recv()??;

        // Extract and strip padding
        let mapped = buffer_slice.get_mapped_range();
        let mut pixels = Vec::with_capacity((width * height * 4) as usize);
        for row in 0..height {
            let start = (row * padded_bytes_per_row) as usize;
            let end = start + unpadded_bytes_per_row as usize;
            pixels.extend_from_slice(&mapped[start..end]);
        }
        
        drop(mapped);
        out_buffer.unmap();

        // Swap channels from BGRA -> RGBA if needed
        if self.config.format == wgpu::TextureFormat::Bgra8UnormSrgb || self.config.format == wgpu::TextureFormat::Bgra8Unorm {
            for chunk in pixels.chunks_exact_mut(4) {
                chunk.swap(0, 2); // B <-> R
            }
        }

        // Restore camera
        self.camera.on_resize(old_w, old_h);

        Ok(pixels)
    }
}
