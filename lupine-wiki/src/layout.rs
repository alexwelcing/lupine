use crate::graph::{Edge, Node, Sphere};
use rand::rngs::StdRng;
use rand::SeedableRng;
use rand::Rng;
use std::collections::HashMap;

const CLUSTER_RADIUS: f64 = 40.0; // radius on which sphere centers sit
const NODE_RADIUS: f64 = 8.0;     // radius of each sphere-cluster cloud
const REPULSIVE_STRENGTH: f64 = 500.0;
const ATTRACTIVE_STRENGTH: f64 = 0.05;
const CENTERING_STRENGTH: f64 = 0.02;
const DAMPING: f64 = 0.85;
const ITERATIONS: usize = 400;
const TIME_STEP: f64 = 0.5;
const MIN_DIST: f64 = 2.5; // Angstroms, keeps atoms from collapsing

/// Target maximum extent (Å) for the exported molecule. The force-directed
/// layout produces graph coordinates that are much larger than atomic length
/// scales; without scaling the camera fits to a ~500 Å box and individual
/// atoms become sub-pixel on the default canvas.
const TARGET_MAX_EXTENT: f64 = 50.0;

pub struct LayoutResult {
    pub positions: Vec<[f64; 3]>,
}

pub fn layout_graph(nodes: &[Node], edges: &[Edge], spheres: &[Sphere]) -> LayoutResult {
    let n = nodes.len();
    if n == 0 {
        return LayoutResult { positions: Vec::new() };
    }

    let mut rng = StdRng::seed_from_u64(42);

    // Map sphere_id -> center position
    let sphere_centers: HashMap<String, [f64; 3]> = spheres
        .iter()
        .enumerate()
        .map(|(i, s)| {
            let theta = 2.0 * std::f64::consts::PI * i as f64 / spheres.len().max(1) as f64;
            // arrange sphere centers in a large ring in XY, slight Z offset by priority
            let z = (s.priority as f64) * 0.3;
            let center = [
                CLUSTER_RADIUS * theta.cos(),
                CLUSTER_RADIUS * theta.sin(),
                z,
            ];
            (s.id.clone(), center)
        })
        .collect();

    // Initial positions: random cloud around sphere center
    let mut pos: Vec<[f64; 3]> = nodes
        .iter()
        .map(|node| {
            let center = sphere_centers.get(&node.sphere_id).copied().unwrap_or([0.0, 0.0, 0.0]);
            let u: f64 = rng.random();
            let v: f64 = rng.random();
            let theta = 2.0 * std::f64::consts::PI * u;
            let phi = (2.0 * v - 1.0).acos();
            let r = NODE_RADIUS * rng.random::<f64>().cbrt();
            let offset = [
                r * phi.sin() * theta.cos(),
                r * phi.sin() * theta.sin(),
                r * phi.cos(),
            ];
            [
                center[0] + offset[0],
                center[1] + offset[1],
                center[2] + offset[2],
            ]
        })
        .collect();

    let mut vel: Vec<[f64; 3]> = vec![[0.0, 0.0, 0.0]; n];

    // Build edge adjacency as index pairs
    let node_index: HashMap<String, usize> = nodes
        .iter()
        .enumerate()
        .map(|(i, n)| (n.id.clone(), i))
        .collect();

    let edge_pairs: Vec<(usize, usize)> = edges
        .iter()
        .filter_map(|e| {
            let a = node_index.get(&e.src_id)?;
            let b = node_index.get(&e.dst_id)?;
            Some((*a, *b))
        })
        .collect();

    for _iter in 0..ITERATIONS {
        let mut forces = vec![[0.0, 0.0, 0.0]; n];

        // Repulsive forces (all pairs)
        for i in 0..n {
            for j in (i + 1)..n {
                let dx = pos[i][0] - pos[j][0];
                let dy = pos[i][1] - pos[j][1];
                let dz = pos[i][2] - pos[j][2];
                let dist_sq = dx * dx + dy * dy + dz * dz;
                let dist = dist_sq.sqrt().max(0.1);
                let f = REPULSIVE_STRENGTH / (dist_sq.max(MIN_DIST * MIN_DIST));
                let fx = f * dx / dist;
                let fy = f * dy / dist;
                let fz = f * dz / dist;
                forces[i][0] += fx;
                forces[i][1] += fy;
                forces[i][2] += fz;
                forces[j][0] -= fx;
                forces[j][1] -= fy;
                forces[j][2] -= fz;
            }
        }

        // Attractive spring forces along edges
        for (a, b) in &edge_pairs {
            let dx = pos[*b][0] - pos[*a][0];
            let dy = pos[*b][1] - pos[*a][1];
            let dz = pos[*b][2] - pos[*a][2];
            let dist = (dx * dx + dy * dy + dz * dz).sqrt().max(0.1);
            let f = ATTRACTIVE_STRENGTH * (dist - 3.5); // rest length ~3.5 Å
            let fx = f * dx / dist;
            let fy = f * dy / dist;
            let fz = f * dz / dist;
            forces[*a][0] += fx;
            forces[*a][1] += fy;
            forces[*a][2] += fz;
            forces[*b][0] -= fx;
            forces[*b][1] -= fy;
            forces[*b][2] -= fz;
        }

        // Centering force toward sphere center
        for (i, node) in nodes.iter().enumerate() {
            let center = sphere_centers.get(&node.sphere_id).copied().unwrap_or([0.0, 0.0, 0.0]);
            let dx = center[0] - pos[i][0];
            let dy = center[1] - pos[i][1];
            let dz = center[2] - pos[i][2];
            forces[i][0] += CENTERING_STRENGTH * dx;
            forces[i][1] += CENTERING_STRENGTH * dy;
            forces[i][2] += CENTERING_STRENGTH * dz;
        }

        // Update velocities and positions
        for i in 0..n {
            vel[i][0] = (vel[i][0] + forces[i][0] * TIME_STEP) * DAMPING;
            vel[i][1] = (vel[i][1] + forces[i][1] * TIME_STEP) * DAMPING;
            vel[i][2] = (vel[i][2] + forces[i][2] * TIME_STEP) * DAMPING;
            pos[i][0] += vel[i][0] * TIME_STEP;
            pos[i][1] += vel[i][1] * TIME_STEP;
            pos[i][2] += vel[i][2] * TIME_STEP;
        }
    }

    // Center the whole structure at origin
    let mut centroid = [0.0, 0.0, 0.0];
    for p in &pos {
        centroid[0] += p[0];
        centroid[1] += p[1];
        centroid[2] += p[2];
    }
    centroid[0] /= n as f64;
    centroid[1] /= n as f64;
    centroid[2] /= n as f64;
    for p in &mut pos {
        p[0] -= centroid[0];
        p[1] -= centroid[1];
        p[2] -= centroid[2];
    }

    // Scale the layout to molecular length scales so LUPI's default camera
    // distance and atom radii make the structure visible.
    let (min, max) = bounds(&pos);
    let extent_x = max[0] - min[0];
    let extent_y = max[1] - min[1];
    let extent_z = max[2] - min[2];
    let max_extent = extent_x.max(extent_y).max(extent_z);
    if max_extent > 0.0 {
        let scale = TARGET_MAX_EXTENT / max_extent;
        for p in &mut pos {
            p[0] *= scale;
            p[1] *= scale;
            p[2] *= scale;
        }
    }

    LayoutResult { positions: pos }
}

fn bounds(positions: &[[f64; 3]]) -> ([f64; 3], [f64; 3]) {
    let mut min = [f64::INFINITY; 3];
    let mut max = [f64::NEG_INFINITY; 3];
    for [x, y, z] in positions {
        min[0] = min[0].min(*x);
        min[1] = min[1].min(*y);
        min[2] = min[2].min(*z);
        max[0] = max[0].max(*x);
        max[1] = max[1].max(*y);
        max[2] = max[2].max(*z);
    }
    (min, max)
}
