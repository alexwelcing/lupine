import { useRef, useMemo, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// CPK color mapping for atoms
const CPK_COLORS: Record<string, string> = {
  H: '#FFFFFF',
  C: '#909090',
  N: '#3050F8',
  O: '#FF0D0D',
  F: '#90E050',
  P: '#FF8000',
  S: '#FFFF30',
  Cl: '#1FF01F',
  Fe: '#E06633',
  Cu: '#C78033',
  Zn: '#7D80B0',
};

// Van der Waals radii (scaled down for visualization)
const VDW_RADIUS: Record<string, number> = {
  H: 0.15,
  C: 0.25,
  N: 0.23,
  O: 0.22,
  F: 0.21,
  P: 0.3,
  S: 0.28,
  Cl: 0.27,
  Fe: 0.35,
  Cu: 0.35,
  Zn: 0.34,
};

export interface Atom {
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface MoleculeData {
  atoms: Atom[];
  bonds?: [number, number][];
}

interface MoleculeViewerProps {
  moleculeData?: MoleculeData;
  width?: number | string;
  height?: number | string;
  autoRotate?: boolean;
  interactive?: boolean;
  showBonds?: boolean;
  atomScale?: number;
  className?: string;
}

// Default caffeine molecule XYZ data
const CAFFEINE_DATA: MoleculeData = {
  atoms: [
    { element: 'C', x: 1.028, y: -0.063, z: -0.111 },
    { element: 'N', x: 2.396, y: 0.141, z: -0.069 },
    { element: 'C', x: 3.081, y: -0.954, z: -0.672 },
    { element: 'N', x: 2.419, y: -1.972, z: -1.224 },
    { element: 'C', x: 1.081, y: -1.853, z: -1.092 },
    { element: 'C', x: 0.316, y: -2.892, z: -1.572 },
    { element: 'O', x: -0.889, y: -2.770, z: -1.514 },
    { element: 'N', x: 0.437, y: -0.764, z: -0.589 },
    { element: 'C', x: 0.888, y: 0.533, z: 1.282 },
    { element: 'O', x: 2.800, y: 1.108, z: 0.533 },
    { element: 'C', x: 4.477, y: 0.508, z: 0.398 },
    { element: 'C', x: 3.064, y: -0.753, z: -2.787 },
    { element: 'C', x: -0.831, y: -0.416, z: -0.684 },
    { element: 'C', x: -1.184, y: 0.962, z: -0.233 },
    { element: 'H', x: -0.871, y: 1.712, z: -0.981 },
    { element: 'H', x: -0.729, y: 1.251, z: 0.726 },
    { element: 'H', x: -2.267, y: 1.021, z: -0.109 },
    { element: 'H', x: 0.408, y: -0.117, z: 1.864 },
    { element: 'H', x: 0.706, y: 1.502, z: 1.762 },
    { element: 'H', x: 1.965, y: 0.439, z: 1.433 },
    { element: 'H', x: 4.735, y: 1.445, z: 0.900 },
    { element: 'H', x: 4.658, y: 0.640, z: -0.674 },
    { element: 'H', x: 5.133, y: -0.261, z: 0.753 },
    { element: 'H', x: 2.544, y: -1.599, z: -3.250 },
  ],
  bonds: [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [4, 7], [0, 7],
    [1, 9], [9, 10], [7, 12], [12, 13], [3, 11], [0, 8],
  ],
};

// Detect bonds from atomic distances (simplified)
function detectBonds(atoms: Atom[]): [number, number][] {
  const bonds: [number, number][] = [];
  const threshold = 1.8; // Angstroms
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const dx = atoms[i].x - atoms[j].x;
      const dy = atoms[i].y - atoms[j].y;
      const dz = atoms[i].z - atoms[j].z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < threshold) {
        bonds.push([i, j]);
      }
    }
  }
  return bonds;
}

function AtomSphere({
  atom,
  index,
  atomScale,
  isHovered,
  onHover,
  onLeave,
}: {
  atom: Atom;
  index: number;
  atomScale: number;
  isHovered: boolean;
  onHover: (idx: number) => void;
  onLeave: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = CPK_COLORS[atom.element] || '#CCCCCC';
  const radius = (VDW_RADIUS[atom.element] || 0.2) * atomScale;

  useFrame(() => {
    if (meshRef.current) {
      const targetScale = isHovered ? 1.3 : 1.0;
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.15
      );
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[atom.x, atom.y, atom.z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(index);
      }}
      onPointerOut={onLeave}
    >
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isHovered ? 0.8 : 0.2}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
}

function BondCylinder({
  atom1,
  atom2,
  isHighlighted,
}: {
  atom1: Atom;
  atom2: Atom;
  isHighlighted: boolean;
}) {
  const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
  const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const orientation = new THREE.Matrix4().lookAt(start, end, new THREE.Object3D().up);
  const rotation = new THREE.Euler();
  rotation.setFromRotationMatrix(orientation);

  return (
    <mesh position={mid} rotation={[rotation.x + Math.PI / 2, rotation.y, rotation.z]}>
      <cylinderGeometry args={[0.04, 0.04, length, 8]} />
      <meshStandardMaterial
        color="#FFFFFF"
        transparent
        opacity={isHighlighted ? 0.5 : 0.2}
        emissive="#7B5CFF"
        emissiveIntensity={isHighlighted ? 0.3 : 0}
      />
    </mesh>
  );
}

function MoleculeScene({
  moleculeData,
  autoRotate,
  interactive,
  showBonds,
  atomScale,
}: {
  moleculeData: MoleculeData;
  autoRotate: boolean;
  interactive: boolean;
  showBonds: boolean;
  atomScale: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredAtom, setHoveredAtom] = useState<number | null>(null);
  const rotationSpeed = useRef(0.003);

  const bonds = useMemo(() => {
    return moleculeData.bonds || detectBonds(moleculeData.atoms);
  }, [moleculeData]);

  // Center the molecule
  const center = useMemo(() => {
    const atoms = moleculeData.atoms;
    const cx = atoms.reduce((s, a) => s + a.x, 0) / atoms.length;
    const cy = atoms.reduce((s, a) => s + a.y, 0) / atoms.length;
    const cz = atoms.reduce((s, a) => s + a.z, 0) / atoms.length;
    return new THREE.Vector3(cx, cy, cz);
  }, [moleculeData]);

  useFrame((_) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += rotationSpeed.current;
    }
    if (hoveredAtom !== null) {
      rotationSpeed.current *= 0.95;
      if (rotationSpeed.current < 0.0005) rotationSpeed.current = 0;
    } else {
      rotationSpeed.current += (0.003 - rotationSpeed.current) * 0.05;
    }
  });

  const handleAtomHover = useCallback((idx: number) => {
    setHoveredAtom(idx);
  }, []);

  const handleAtomLeave = useCallback(() => {
    setHoveredAtom(null);
  }, []);

  return (
    <>
      <ambientLight color="#404060" intensity={0.8} />
      <directionalLight position={[-5, 8, 5]} intensity={1.2} color="#FFFFFF" />
      <pointLight position={[0, 0, 3]} intensity={0.5} color="#7B5CFF" />
      <pointLight position={[-3, -2, -2]} intensity={0.3} color="#00E5FF" />

      <group ref={groupRef} position={[-center.x, -center.y, -center.z]}>
        {showBonds &&
          bonds.map(([i, j], idx) => (
            <BondCylinder
              key={`bond-${idx}`}
              atom1={moleculeData.atoms[i]}
              atom2={moleculeData.atoms[j]}
              isHighlighted={hoveredAtom === i || hoveredAtom === j}
            />
          ))}

        {moleculeData.atoms.map((atom, idx) => (
          <AtomSphere
            key={`atom-${idx}`}
            atom={atom}
            index={idx}
            atomScale={atomScale}
            isHovered={hoveredAtom === idx}
            onHover={handleAtomHover}
            onLeave={handleAtomLeave}
          />
        ))}
      </group>

      {interactive && (
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          enableZoom
          enablePan={false}
          minDistance={3}
          maxDistance={15}
        />
      )}
    </>
  );
}

export default function MoleculeViewer({
  moleculeData = CAFFEINE_DATA,
  width = '100%',
  height = 400,
  autoRotate = true,
  interactive = true,
  showBonds = true,
  atomScale = 1.0,
  className,
}: MoleculeViewerProps) {
  const numericWidth = typeof width === 'number' ? width : undefined;
  const numericHeight = typeof height === 'number' ? height : undefined;

  return (
    <div
      className={className}
      style={{
        width: numericWidth ? `${numericWidth}px` : width,
        height: numericHeight ? `${numericHeight}px` : height,
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-surface">
            <div className="w-8 h-8 border-2 border-lupi-violet border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0, 8], fov: 50 }}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
          }}
          style={{ background: 'transparent' }}
        >
          <MoleculeScene
            moleculeData={moleculeData}
            autoRotate={autoRotate}
            interactive={interactive}
            showBonds={showBonds}
            atomScale={atomScale}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
