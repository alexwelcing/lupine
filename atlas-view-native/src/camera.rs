/// Orbital camera for 3D atom visualization.
/// Supports orbit (left-drag), zoom (scroll), and pan (right-drag).

#[repr(C)]
#[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
pub struct CameraUniform {
    pub view: [[f32; 4]; 4],
    pub projection: [[f32; 4]; 4],
    pub view_proj: [[f32; 4]; 4],
    pub position: [f32; 3],
    pub near: f32,
    pub far: f32,
    pub width: f32,
    pub height: f32,
    pub _pad: f32,
}

pub struct OrbitalCamera {
    /// Focus point the camera orbits around
    pub target: nalgebra_glm::Vec3,
    /// Distance from target
    pub distance: f32,
    /// Azimuthal angle (radians, around Y axis)
    pub azimuth: f32,
    /// Elevation angle (radians, from XZ plane)
    pub elevation: f32,
    /// Field of view (radians)
    pub fov: f32,
    /// Near clip plane
    pub near: f32,
    /// Far clip plane
    pub far: f32,
    /// Viewport width
    pub width: f32,
    /// Viewport height
    pub height: f32,
    /// Mouse state for drag tracking
    pub dragging_left: bool,
    pub dragging_right: bool,
    pub last_mouse: [f32; 2],
    pub is_orthographic: bool,
}

impl OrbitalCamera {
    pub fn new() -> Self {
        Self {
            target: nalgebra_glm::vec3(0.0, 0.0, 0.0),
            distance: 20.0,
            azimuth: std::f32::consts::FRAC_PI_4,
            elevation: std::f32::consts::FRAC_PI_6,
            fov: std::f32::consts::FRAC_PI_4,
            near: 0.1,
            far: 1000.0,
            width: 1280.0,
            height: 720.0,
            dragging_left: false,
            dragging_right: false,
            last_mouse: [0.0, 0.0],
            is_orthographic: false,
        }
    }

    /// Compute the camera's world-space position from orbital parameters.
    pub fn position(&self) -> nalgebra_glm::Vec3 {
        let x = self.distance * self.elevation.cos() * self.azimuth.sin();
        let y = self.distance * self.elevation.sin();
        let z = self.distance * self.elevation.cos() * self.azimuth.cos();
        self.target + nalgebra_glm::vec3(x, y, z)
    }

    /// Compute the view matrix (look-at).
    pub fn view_matrix(&self) -> nalgebra_glm::Mat4 {
        let pos = self.position();
        let up = nalgebra_glm::vec3(0.0, 1.0, 0.0);
        nalgebra_glm::look_at(&pos, &self.target, &up)
    }

    /// Compute the perspective projection matrix.
    pub fn projection_matrix(&self) -> nalgebra_glm::Mat4 {
        let aspect = self.width / self.height.max(1.0);
        if self.is_orthographic {
            let half_height = self.distance * (self.fov * 0.5).tan();
            let half_width = half_height * aspect;
            nalgebra_glm::ortho(-half_width, half_width, -half_height, half_height, self.near, self.far)
        } else {
            nalgebra_glm::perspective(aspect, self.fov, self.near, self.far)
        }
    }

    /// Build a GPU-ready CameraUniform struct.
    pub fn uniform(&self) -> CameraUniform {
        let view = self.view_matrix();
        let proj = self.projection_matrix();
        let vp = proj * view;
        let pos = self.position();

        CameraUniform {
            view: mat4_to_array(&view),
            projection: mat4_to_array(&proj),
            view_proj: mat4_to_array(&vp),
            position: [pos.x, pos.y, pos.z],
            near: self.near,
            far: self.far,
            width: self.width,
            height: self.height,
            _pad: 0.0,
        }
    }

    /// Handle mouse motion for orbit (left) and pan (right).
    pub fn on_mouse_move(&mut self, x: f32, y: f32) {
        let dx = x - self.last_mouse[0];
        let dy = y - self.last_mouse[1];
        self.last_mouse = [x, y];

        if self.dragging_left {
            // Orbit
            self.azimuth -= dx * 0.005;
            self.elevation += dy * 0.005;
            // Clamp elevation to avoid gimbal lock
            self.elevation = self.elevation.clamp(
                -std::f32::consts::FRAC_PI_2 + 0.01,
                std::f32::consts::FRAC_PI_2 - 0.01,
            );
        }

        if self.dragging_right {
            // Pan — move target in screen-space
            let view = self.view_matrix();
            let right = nalgebra_glm::vec3(view[(0, 0)], view[(1, 0)], view[(2, 0)]);
            let up = nalgebra_glm::vec3(view[(0, 1)], view[(1, 1)], view[(2, 1)]);
            let pan_speed = self.distance * 0.002;
            self.target -= right * dx * pan_speed;
            self.target += up * dy * pan_speed;
        }
    }

    /// Handle scroll for zoom.
    pub fn on_scroll(&mut self, delta: f32) {
        self.distance *= 1.0 - delta * 0.1;
        self.distance = self.distance.clamp(0.5, 500.0);
    }

    /// Handle resize.
    pub fn on_resize(&mut self, width: f32, height: f32) {
        self.width = width;
        self.height = height;
    }

    /// Auto-frame the camera to fit a bounding box.
    pub fn frame_bounds(&mut self, min: [f32; 3], max: [f32; 3]) {
        let center = nalgebra_glm::vec3(
            (min[0] + max[0]) * 0.5,
            (min[1] + max[1]) * 0.5,
            (min[2] + max[2]) * 0.5,
        );
        let extent = nalgebra_glm::vec3(
            max[0] - min[0],
            max[1] - min[1],
            max[2] - min[2],
        );
        let radius = nalgebra_glm::length(&extent) * 0.5;

        self.target = center;
        let fov_half = self.fov * 0.5;
        self.distance = (radius / fov_half.sin()).max(1.0) * 1.3;
        // Azimuth and Elevation are PRESERVED here so custom angles don't reset on every frame of a simulation video!
    }
}

/// Convert a nalgebra Mat4 to a [[f32; 4]; 4] for GPU upload.
fn mat4_to_array(m: &nalgebra_glm::Mat4) -> [[f32; 4]; 4] {
    let s = m.as_slice();
    [
        [s[0], s[1], s[2], s[3]],
        [s[4], s[5], s[6], s[7]],
        [s[8], s[9], s[10], s[11]],
        [s[12], s[13], s[14], s[15]],
    ]
}
