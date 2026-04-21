use wgpu::util::DeviceExt;

/// WGPU GPU Compute Experiment
/// Validates connecting Rust with the NVIDIA GPU to massively parallelize
/// molecular dynamics data processing (e.g. pairwise distances for RDF).

async fn run_gpu_experiment() {
    let instance = wgpu::Instance::default();

    println!("  ✦ Requesting GPU adapter...");
    let adapter = instance
        .request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance, // Request NVIDIA discrete
            force_fallback_adapter: false,
            compatible_surface: None,
        })
        .await
        .expect("Failed to find an appropriate adapter");

    let info = adapter.get_info();
    println!("  ✅ Target API: {:?}", info.backend);
    println!("  ✅ GPU Render: {}", info.name);
    println!("  ✅ Vendor: {:?}", info.vendor);

    // 1. Initialize Device & Queue
    let (device, queue) = adapter
        .request_device(&wgpu::DeviceDescriptor::default(), None)
        .await
        .unwrap();

    // 2. Generate Dummy MD Data (e.g. 5,000 particles -> 15,000 f32s)
    let num_particles = 5_000u32;
    let num_pairs = (num_particles * (num_particles - 1)) / 2;
    
    println!("  ✦ Generating {} particles ({} distances)...", num_particles, num_pairs);
    
    let mut particle_data: Vec<f32> = Vec::with_capacity((num_particles * 3) as usize);
    for i in 0..num_particles {
        particle_data.push(i as f32 * 0.1); // x
        particle_data.push(i as f32 * 0.2); // y
        particle_data.push(i as f32 * 0.3); // z
    }

    // 3. Create GPU Buffers
    let particle_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some("Particles"),
        contents: bytemuck::cast_slice(&particle_data),
        usage: wgpu::BufferUsages::STORAGE,
    });

    let distances_buffer = device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("Distances"),
        size: (num_pairs as usize * std::mem::size_of::<f32>()) as u64,
        usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
        mapped_at_creation: false,
    });

    let mut config_data = [0u32; 64];
    config_data[0] = num_particles;
    let config_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some("Config"),
        contents: bytemuck::cast_slice(&config_data),
        usage: wgpu::BufferUsages::UNIFORM,
    });

    // We only read back a small portion for verification (first 4 floats)
    let staging_buffer = device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("Staging"),
        size: 16, 
        usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
        mapped_at_creation: false,
    });

    // 4. Load WGSL Compute Shader
    let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
        label: Some("RDF Compute Shader"),
        source: wgpu::ShaderSource::Wgsl(include_str!("rdf_compute.wgsl").into()),
    });

    let compute_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
        label: Some("RDF Compute Pipeline"),
        layout: None,
        module: &shader,
        entry_point: "main",
        compilation_options: Default::default(),
        cache: None,
    });

    let bind_group_layout = compute_pipeline.get_bind_group_layout(0);
    let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
        label: None,
        layout: &bind_group_layout,
        entries: &[
            wgpu::BindGroupEntry {
                binding: 0,
                resource: particle_buffer.as_entire_binding(),
            },
            wgpu::BindGroupEntry {
                binding: 1,
                resource: distances_buffer.as_entire_binding(),
            },
            wgpu::BindGroupEntry {
                binding: 2,
                resource: config_buffer.as_entire_binding(),
            },
        ],
    });

    // 5. Execute Compute Workflow
    println!("  ✦ Dispatching compute shader to GPU...");
    let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });
    {
        let mut cpass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor::default());
        cpass.set_pipeline(&compute_pipeline);
        cpass.set_bind_group(0, &bind_group, &[]);
        
        // Dispatch enough workgroups of size 64
        let workgroups = (num_particles as f32 / 64.0).ceil() as u32;
        cpass.dispatch_workgroups(workgroups, 1, 1);
    }

    // Copy just the first 4 computed distances to CPU readable buffer
    encoder.copy_buffer_to_buffer(&distances_buffer, 0, &staging_buffer, 0, 16);
    queue.submit(Some(encoder.finish()));

    // 6. Readback & Verify
    let buffer_slice = staging_buffer.slice(..);
    let (sender, receiver) = std::sync::mpsc::channel();
    buffer_slice.map_async(wgpu::MapMode::Read, move |v| sender.send(v).unwrap());

    device.poll(wgpu::Maintain::Wait); // Block until GPU finishes computation
    if let Ok(Ok(())) = receiver.recv() {
        let data = buffer_slice.get_mapped_range();
        let result: &[f32] = bytemuck::cast_slice(&data);
        println!("  ✅ GPU Execution Successful!");
        println!("  ✦ Sample distances from GPU: {:?}", result);
        drop(data);
        staging_buffer.unmap();
    }
}

fn main() {
    env_logger::init();
    
    println!();
    println!("  ╔══════════════════════════════════════════════════════════╗");
    println!("  ║   Academic Research / GPU Discovery Proof of Concept     ║");
    println!("  ╚══════════════════════════════════════════════════════════╝");
    
    pollster::block_on(run_gpu_experiment());
    
    println!("  ===============================================================");
}
