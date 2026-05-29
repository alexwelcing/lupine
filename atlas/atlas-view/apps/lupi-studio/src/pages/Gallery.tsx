import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Split,
  ArrowDownToLine,
  Flame,
  Layers,
  CircleDot,
  Waves,
  Droplets,
  Link,
  GitBranch,
  Dna,
  Zap,
  LayoutGrid,
  List as ListIcon,
  Atom,
  ExternalLink,
  Hexagon,
  type LucideIcon,
} from 'lucide-react';
import MoleculeViewer from '@/components/MoleculeViewer';
import type { MoleculeData } from '@/components/MoleculeViewer';

/* ─────────────────── easing ─────────────────── */
const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ═══════════════════════════════════════════════
   MOLECULE XYZ DATA
   ═══════════════════════════════════════════════ */

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

const ASPIRIN_DATA: MoleculeData = {
  atoms: [
    { element: 'C', x: 0.000, y: 0.000, z: 0.000 },
    { element: 'C', x: 1.402, y: 0.000, z: 0.000 },
    { element: 'C', x: 2.090, y: 1.210, z: 0.000 },
    { element: 'C', x: 1.402, y: 2.420, z: 0.000 },
    { element: 'C', x: 0.000, y: 2.420, z: 0.000 },
    { element: 'C', x: -0.688, y: 1.210, z: 0.000 },
    { element: 'C', x: -0.750, y: -1.280, z: 0.000 },
    { element: 'O', x: -0.280, y: -2.380, z: 0.000 },
    { element: 'O', x: -2.050, y: -1.050, z: 0.000 },
    { element: 'C', x: -2.780, y: -2.250, z: 0.000 },
    { element: 'O', x: 3.440, y: 1.210, z: 0.000 },
    { element: 'C', x: 4.130, y: 2.420, z: 0.000 },
    { element: 'O', x: 4.130, y: 3.580, z: 0.000 },
    { element: 'H', x: -2.400, y: -2.780, z: 0.890 },
    { element: 'H', x: -2.400, y: -2.780, z: -0.890 },
    { element: 'H', x: -3.820, y: -1.950, z: 0.000 },
    { element: 'H', x: 1.930, y: 3.380, z: 0.000 },
    { element: 'H', x: -0.530, y: 3.380, z: 0.000 },
    { element: 'H', x: 3.730, y: 0.320, z: 0.000 },
    { element: 'H', x: 5.170, y: 2.120, z: 0.000 },
    { element: 'H', x: 1.930, y: -0.960, z: 0.000 },
  ],
};

const DOPAMINE_DATA: MoleculeData = {
  atoms: [
    { element: 'C', x: 0.000, y: 0.000, z: 0.000 },
    { element: 'C', x: 1.402, y: 0.000, z: 0.000 },
    { element: 'C', x: 2.090, y: 1.210, z: 0.000 },
    { element: 'C', x: 1.402, y: 2.420, z: 0.000 },
    { element: 'C', x: 0.000, y: 2.420, z: 0.000 },
    { element: 'C', x: -0.688, y: 1.210, z: 0.000 },
    { element: 'O', x: 2.780, y: 3.440, z: 0.000 },
    { element: 'O', x: -1.990, y: 1.210, z: 0.000 },
    { element: 'C', x: -0.750, y: -1.390, z: 0.000 },
    { element: 'C', x: -2.200, y: -1.390, z: 0.000 },
    { element: 'N', x: -2.750, y: -2.720, z: 0.000 },
    { element: 'H', x: -0.280, y: 3.380, z: 0.000 },
    { element: 'H', x: 3.580, y: 2.780, z: 0.000 },
    { element: 'H', x: -2.400, y: 0.320, z: 0.000 },
    { element: 'H', x: -0.280, y: -2.120, z: 0.890 },
    { element: 'H', x: -0.280, y: -2.120, z: -0.890 },
    { element: 'H', x: -2.550, y: -0.660, z: 0.890 },
    { element: 'H', x: -2.550, y: -0.660, z: -0.890 },
    { element: 'H', x: -3.770, y: -2.550, z: 0.000 },
    { element: 'H', x: -2.400, y: -3.380, z: 0.890 },
    { element: 'H', x: -2.400, y: -3.380, z: -0.890 },
    { element: 'H', x: 1.930, y: -0.960, z: 0.000 },
  ],
};

const SEROTONIN_DATA: MoleculeData = {
  atoms: [
    { element: 'C', x: 0.000, y: 0.000, z: 0.000 },
    { element: 'C', x: 1.402, y: 0.000, z: 0.000 },
    { element: 'C', x: 2.090, y: 1.210, z: 0.000 },
    { element: 'C', x: 1.402, y: 2.420, z: 0.000 },
    { element: 'C', x: 0.000, y: 2.420, z: 0.000 },
    { element: 'C', x: -0.688, y: 1.210, z: 0.000 },
    { element: 'N', x: -0.350, y: 3.650, z: 0.000 },
    { element: 'C', x: 0.200, y: 4.750, z: 0.000 },
    { element: 'C', x: -0.500, y: 6.050, z: 0.000 },
    { element: 'C', x: -1.850, y: 6.050, z: 0.000 },
    { element: 'C', x: -2.550, y: 4.850, z: 0.000 },
    { element: 'C', x: -1.850, y: 3.650, z: 0.000 },
    { element: 'N', x: -2.550, y: 2.450, z: 0.000 },
    { element: 'O', x: 3.440, y: 1.210, z: 0.000 },
    { element: 'H', x: -2.550, y: 7.000, z: 0.000 },
    { element: 'H', x: -3.630, y: 4.850, z: 0.000 },
    { element: 'H', x: 1.280, y: 4.750, z: 0.000 },
    { element: 'H', x: -3.520, y: 2.450, z: 0.000 },
    { element: 'H', x: -2.100, y: 1.600, z: 0.000 },
    { element: 'H', x: 1.930, y: -0.960, z: 0.000 },
    { element: 'H', x: 3.580, y: 0.320, z: 0.000 },
    { element: 'H', x: -0.280, y: -0.960, z: 0.000 },
    { element: 'H', x: -2.200, y: 6.900, z: 0.000 },
  ],
};

const THC_DATA: MoleculeData = {
  atoms: [
    { element: 'C', x: 0.000, y: 0.000, z: 0.000 },
    { element: 'C', x: 1.402, y: 0.000, z: 0.000 },
    { element: 'C', x: 2.090, y: 1.210, z: 0.000 },
    { element: 'C', x: 1.402, y: 2.420, z: 0.000 },
    { element: 'C', x: 0.000, y: 2.420, z: 0.000 },
    { element: 'C', x: -0.688, y: 1.210, z: 0.000 },
    { element: 'O', x: 2.780, y: 3.440, z: 0.000 },
    { element: 'C', x: 2.090, y: 4.650, z: 0.000 },
    { element: 'C', x: 0.688, y: 4.650, z: 0.000 },
    { element: 'C', x: 0.000, y: 3.440, z: 0.000 },
    { element: 'C', x: 3.440, y: 5.850, z: 0.000 },
    { element: 'C', x: 4.130, y: 6.200, z: 1.210 },
    { element: 'C', x: 4.820, y: 7.450, z: 1.210 },
    { element: 'C', x: 5.500, y: 7.850, z: 2.420 },
    { element: 'C', x: 5.500, y: 7.850, z: 0.000 },
    { element: 'C', x: 6.200, y: 9.100, z: 2.420 },
    { element: 'C', x: 4.130, y: 6.200, z: -1.210 },
    { element: 'C', x: 4.820, y: 7.450, z: -1.210 },
    { element: 'C', x: 5.500, y: 7.850, z: -2.420 },
    { element: 'C', x: 6.200, y: 9.100, z: -2.420 },
    { element: 'O', x: 3.080, y: 1.210, z: 0.000 },
    { element: 'C', x: -0.750, y: 3.800, z: 0.000 },
    { element: 'H', x: -1.280, y: 3.380, z: 0.890 },
    { element: 'H', x: -1.280, y: 3.380, z: -0.890 },
    { element: 'H', x: -0.660, y: 4.880, z: 0.000 },
    { element: 'H', x: 1.930, y: -0.960, z: 0.000 },
    { element: 'H', x: -0.530, y: -0.960, z: 0.000 },
    { element: 'H', x: 3.080, y: 0.320, z: 0.000 },
    { element: 'H', x: 6.200, y: 9.100, z: 3.380 },
    { element: 'H', x: 7.240, y: 8.850, z: 2.420 },
    { element: 'H', x: 5.750, y: 9.750, z: 2.420 },
    { element: 'H', x: 6.200, y: 9.100, z: -3.380 },
    { element: 'H', x: 7.240, y: 8.850, z: -2.420 },
    { element: 'H', x: 5.750, y: 9.750, z: -2.420 },
    { element: 'H', x: 5.500, y: 7.850, z: 3.380 },
    { element: 'H', x: 5.500, y: 7.850, z: -3.380 },
    { element: 'H', x: 4.440, y: 8.720, z: 1.210 },
    { element: 'H', x: 4.440, y: 8.720, z: -1.210 },
    { element: 'H', x: 5.300, y: 7.000, z: 1.210 },
    { element: 'H', x: 5.300, y: 7.000, z: -1.210 },
    { element: 'H', x: 3.680, y: 5.480, z: 1.890 },
    { element: 'H', x: 3.680, y: 5.480, z: -1.890 },
    { element: 'H', x: 2.700, y: 6.580, z: 0.000 },
    { element: 'H', x: -1.450, y: 1.210, z: 0.000 },
    { element: 'H', x: 0.000, y: 1.210, z: 0.000 },
    { element: 'H', x: 1.402, y: 1.210, z: 0.000 },
    { element: 'H', x: 3.440, y: 5.850, z: 0.890 },
  ],
};

const LSD_DATA: MoleculeData = {
  atoms: [
    { element: 'C', x: 0.000, y: 0.000, z: 0.000 },
    { element: 'C', x: 1.402, y: 0.000, z: 0.000 },
    { element: 'C', x: 2.090, y: 1.210, z: 0.000 },
    { element: 'C', x: 1.402, y: 2.420, z: 0.000 },
    { element: 'C', x: 0.000, y: 2.420, z: 0.000 },
    { element: 'C', x: -0.688, y: 1.210, z: 0.000 },
    { element: 'N', x: -0.350, y: 3.650, z: 0.000 },
    { element: 'C', x: 0.300, y: 4.750, z: 0.000 },
    { element: 'C', x: -0.400, y: 6.050, z: 0.000 },
    { element: 'C', x: -1.750, y: 6.050, z: 0.000 },
    { element: 'C', x: -2.450, y: 4.850, z: 0.000 },
    { element: 'C', x: -1.750, y: 3.650, z: 0.000 },
    { element: 'N', x: -2.450, y: 2.450, z: 0.000 },
    { element: 'C', x: -3.800, y: 2.450, z: 0.000 },
    { element: 'C', x: -4.500, y: 3.650, z: 0.000 },
    { element: 'C', x: -3.800, y: 4.850, z: 0.000 },
    { element: 'C', x: -4.500, y: 1.280, z: 0.000 },
    { element: 'C', x: -5.850, y: 1.280, z: 0.000 },
    { element: 'C', x: -6.550, y: 2.420, z: 0.000 },
    { element: 'C', x: -5.850, y: 3.650, z: 0.000 },
    { element: 'N', x: -6.200, y: 4.850, z: 0.000 },
    { element: 'C', x: 1.750, y: 4.750, z: 0.000 },
    { element: 'C', x: 2.450, y: 6.050, z: 0.000 },
    { element: 'O', x: 1.750, y: 7.150, z: 0.000 },
    { element: 'N', x: 3.800, y: 6.050, z: 0.000 },
    { element: 'H', x: 1.930, y: -0.960, z: 0.000 },
    { element: 'H', x: -0.530, y: -0.960, z: 0.000 },
    { element: 'H', x: -2.450, y: 7.000, z: 0.000 },
    { element: 'H', x: -4.200, y: 5.850, z: 0.000 },
    { element: 'H', x: -5.300, y: 0.380, z: 0.000 },
    { element: 'H', x: -7.600, y: 2.420, z: 0.000 },
    { element: 'H', x: -7.200, y: 5.300, z: 0.000 },
    { element: 'H', x: -5.700, y: 5.700, z: 0.000 },
    { element: 'H', x: 2.150, y: 3.800, z: 0.000 },
    { element: 'H', x: 2.150, y: 3.800, z: 0.000 },
    { element: 'H', x: 4.200, y: 5.200, z: 0.000 },
    { element: 'H', x: 4.200, y: 6.850, z: 0.000 },
    { element: 'H', x: 4.200, y: 6.050, z: 0.890 },
    { element: 'H', x: -3.200, y: 1.380, z: 0.000 },
    { element: 'H', x: -6.400, y: 0.380, z: 0.000 },
    { element: 'H', x: 2.090, y: 1.210, z: 0.890 },
    { element: 'H', x: 2.090, y: 1.210, z: -0.890 },
    { element: 'H', x: 0.000, y: 3.650, z: 0.890 },
    { element: 'H', x: -3.450, y: 2.450, z: 0.890 },
    { element: 'H', x: -3.450, y: 2.450, z: -0.890 },
    { element: 'H', x: -6.200, y: 4.850, z: 0.890 },
    { element: 'H', x: -6.200, y: 4.850, z: -0.890 },
    { element: 'H', x: -4.500, y: 3.650, z: 0.890 },
    { element: 'H', x: -4.500, y: 3.650, z: -0.890 },
  ],
};

const PSILOCYBIN_DATA: MoleculeData = {
  atoms: [
    { element: 'C', x: 0.000, y: 0.000, z: 0.000 },
    { element: 'C', x: 1.402, y: 0.000, z: 0.000 },
    { element: 'C', x: 2.090, y: 1.210, z: 0.000 },
    { element: 'C', x: 1.402, y: 2.420, z: 0.000 },
    { element: 'C', x: 0.000, y: 2.420, z: 0.000 },
    { element: 'C', x: -0.688, y: 1.210, z: 0.000 },
    { element: 'N', x: -0.350, y: 3.650, z: 0.000 },
    { element: 'C', x: 0.300, y: 4.750, z: 0.000 },
    { element: 'C', x: -0.400, y: 6.050, z: 0.000 },
    { element: 'C', x: -1.750, y: 6.050, z: 0.000 },
    { element: 'C', x: -2.450, y: 4.850, z: 0.000 },
    { element: 'C', x: -1.750, y: 3.650, z: 0.000 },
    { element: 'N', x: -2.450, y: 2.450, z: 0.000 },
    { element: 'C', x: -0.750, y: -1.390, z: 0.000 },
    { element: 'C', x: -2.150, y: -1.390, z: 0.000 },
    { element: 'O', x: -2.750, y: -2.500, z: 0.000 },
    { element: 'P', x: -4.350, y: -2.500, z: 0.000 },
    { element: 'O', x: -4.950, y: -1.200, z: 0.000 },
    { element: 'O', x: -4.350, y: -3.800, z: 0.000 },
    { element: 'O', x: -4.950, y: -2.500, z: 1.280 },
    { element: 'H', x: -0.280, y: 3.380, z: 0.000 },
    { element: 'H', x: -2.450, y: 7.000, z: 0.000 },
    { element: 'H', x: -3.530, y: 4.850, z: 0.000 },
    { element: 'H', x: 0.200, y: 6.850, z: 0.000 },
    { element: 'H', x: 1.350, y: 4.750, z: 0.000 },
    { element: 'H', x: 1.930, y: -0.960, z: 0.000 },
    { element: 'H', x: -0.530, y: -0.960, z: 0.000 },
    { element: 'H', x: -0.280, y: -2.120, z: 0.890 },
    { element: 'H', x: -0.280, y: -2.120, z: -0.890 },
    { element: 'H', x: -2.550, y: -0.660, z: 0.890 },
    { element: 'H', x: -2.550, y: -0.660, z: -0.890 },
    { element: 'H', x: -3.520, y: 2.450, z: 0.000 },
    { element: 'H', x: -2.100, y: 1.600, z: 0.000 },
    { element: 'H', x: -4.900, y: -1.200, z: 0.890 },
    { element: 'H', x: -4.900, y: -1.200, z: -0.890 },
    { element: 'H', x: -5.920, y: -2.500, z: 1.280 },
  ],
};

const CHOLESTEROL_DATA: MoleculeData = {
  atoms: [
    { element: 'C', x: 0.000, y: 0.000, z: 0.000 },
    { element: 'C', x: 1.540, y: 0.000, z: 0.000 },
    { element: 'C', x: 2.090, y: 1.210, z: 0.890 },
    { element: 'C', x: 1.540, y: 2.420, z: 0.000 },
    { element: 'C', x: 0.000, y: 2.420, z: 0.000 },
    { element: 'C', x: -0.550, y: 1.210, z: -0.890 },
    { element: 'C', x: -0.550, y: 1.210, z: 0.890 },
    { element: 'C', x: 2.090, y: -1.280, z: 0.000 },
    { element: 'C', x: 3.580, y: -1.280, z: 0.000 },
    { element: 'C', x: 4.130, y: 0.000, z: 0.000 },
    { element: 'C', x: 3.580, y: 1.210, z: 0.000 },
    { element: 'C', x: 4.130, y: 2.420, z: 0.000 },
    { element: 'C', x: 3.580, y: 3.630, z: 0.000 },
    { element: 'C', x: 4.130, y: 4.840, z: 0.000 },
    { element: 'C', x: 3.580, y: 6.050, z: 0.000 },
    { element: 'C', x: 2.090, y: 6.050, z: 0.000 },
    { element: 'C', x: 1.540, y: 4.840, z: 0.000 },
    { element: 'C', x: 2.090, y: 3.630, z: 0.000 },
    { element: 'C', x: 4.680, y: 6.050, z: 0.000 },
    { element: 'C', x: 5.230, y: 7.260, z: 0.000 },
    { element: 'C', x: 4.680, y: 8.470, z: 0.000 },
    { element: 'C', x: 5.230, y: 9.680, z: 0.000 },
    { element: 'C', x: 4.680, y: 10.890, z: 0.000 },
    { element: 'C', x: 3.180, y: 10.890, z: 0.000 },
    { element: 'C', x: 2.630, y: 9.680, z: 0.000 },
    { element: 'C', x: 3.180, y: 8.470, z: 0.000 },
    { element: 'C', x: 2.630, y: 7.260, z: 0.000 },
    { element: 'O', x: 1.080, y: 3.630, z: 0.000 },
    { element: 'C', x: -2.090, y: 1.210, z: 0.000 },
    { element: 'C', x: -2.640, y: 0.000, z: 0.000 },
    { element: 'C', x: -2.090, y: -1.210, z: 0.000 },
    { element: 'C', x: -0.550, y: -1.210, z: 0.000 },
    { element: 'H', x: -0.280, y: 3.380, z: 0.000 },
    { element: 'H', x: 1.930, y: 1.210, z: 1.870 },
    { element: 'H', x: 2.090, y: -1.280, z: 1.020 },
    { element: 'H', x: 2.090, y: -1.280, z: -1.020 },
    { element: 'H', x: 3.900, y: -2.240, z: 0.000 },
    { element: 'H', x: 3.900, y: -2.240, z: 0.000 },
    { element: 'H', x: 5.220, y: 0.000, z: 0.000 },
    { element: 'H', x: 3.900, y: 2.240, z: 0.000 },
    { element: 'H', x: 5.220, y: 2.420, z: 0.000 },
    { element: 'H', x: 3.900, y: 4.590, z: 0.000 },
    { element: 'H', x: 5.220, y: 4.840, z: 0.000 },
    { element: 'H', x: 1.930, y: 6.850, z: 0.000 },
    { element: 'H', x: 0.550, y: 6.200, z: 0.000 },
    { element: 'H', x: 1.080, y: 4.590, z: 0.000 },
    { element: 'H', x: 4.680, y: 6.050, z: 1.020 },
    { element: 'H', x: 4.680, y: 6.050, z: -1.020 },
    { element: 'H', x: 6.320, y: 7.260, z: 0.000 },
    { element: 'H', x: 5.500, y: 10.890, z: 0.890 },
    { element: 'H', x: 5.500, y: 10.890, z: -0.890 },
    { element: 'H', x: 4.680, y: 11.960, z: 0.000 },
    { element: 'H', x: 2.770, y: 11.850, z: 0.000 },
    { element: 'H', x: 1.550, y: 9.680, z: 0.000 },
    { element: 'H', x: 2.630, y: 6.200, z: 0.000 },
    { element: 'H', x: 0.340, y: 3.380, z: 0.890 },
    { element: 'H', x: 0.340, y: 3.380, z: -0.890 },
    { element: 'H', x: -2.450, y: 2.170, z: 0.000 },
    { element: 'H', x: -3.720, y: 0.000, z: 0.000 },
    { element: 'H', x: -2.450, y: -2.170, z: 0.000 },
    { element: 'H', x: -0.280, y: -2.170, z: 0.000 },
    { element: 'H', x: -0.280, y: 1.210, z: 1.870 },
    { element: 'H', x: -0.280, y: 1.210, z: -1.870 },
    { element: 'H', x: 2.090, y: 1.210, z: -0.890 },
    { element: 'H', x: 1.540, y: 0.000, z: 1.020 },
    { element: 'H', x: 1.540, y: 0.000, z: -1.020 },
  ],
};

/* Diamond crystal lattice */
const DIAMOND_DATA: MoleculeData = {
  atoms: Array.from({ length: 64 }, (_, i) => {
    const a = 3.567;
    const fx = [0, 0.5, 0.5, 0, 0.25, 0.75, 0.75, 0.25];
    const fy = [0, 0.5, 0, 0.5, 0.25, 0.75, 0.25, 0.75];
    const fz = [0, 0, 0.5, 0.5, 0.25, 0.25, 0.75, 0.75];
    const si = i % 8;
    const cx = Math.floor(i / 8) % 2;
    const cy = Math.floor(i / 16) % 2;
    const cz = Math.floor(i / 32);
    return {
      element: 'C',
      x: (fx[si] + cx) * a + (Math.random() - 0.5) * 0.05,
      y: (fy[si] + cy) * a + (Math.random() - 0.5) * 0.05,
      z: (fz[si] + cz) * a + (Math.random() - 0.5) * 0.05,
    };
  }),
};

/* ═══════════════════════════════════════════════
   POPULAR MOLECULES DATA
   ═══════════════════════════════════════════════ */

interface PopularMolecule {
  name: string;
  formula: string;
  atomCount: number;
  source: string;
  data: MoleculeData;
  category: string;
}

const POPULAR_MOLECULES: PopularMolecule[] = [
  { name: 'Caffeine', formula: 'C8H10N4O2', atomCount: 24, source: 'PubChem', data: CAFFEINE_DATA, category: 'Organic' },
  { name: 'Aspirin', formula: 'C9H8O4', atomCount: 21, source: 'PubChem', data: ASPIRIN_DATA, category: 'Pharmaceutical' },
  { name: 'Dopamine', formula: 'C8H11NO2', atomCount: 22, source: 'PubChem', data: DOPAMINE_DATA, category: 'Biomolecular' },
  { name: 'Serotonin', formula: 'C10H12N2O', atomCount: 23, source: 'PubChem', data: SEROTONIN_DATA, category: 'Biomolecular' },
  { name: 'THC', formula: 'C21H30O2', atomCount: 53, source: 'PubChem', data: THC_DATA, category: 'Pharmaceutical' },
  { name: 'LSD', formula: 'C20H25N3O', atomCount: 49, source: 'PubChem', data: LSD_DATA, category: 'Pharmaceutical' },
  { name: 'Psilocybin', formula: 'C12H17N2O4P', atomCount: 36, source: 'PubChem', data: PSILOCYBIN_DATA, category: 'Pharmaceutical' },
  { name: 'Cholesterol', formula: 'C27H46O', atomCount: 74, source: 'PubChem', data: CHOLESTEROL_DATA, category: 'Biomolecular' },
  { name: 'Diamond Crystal', formula: 'C', atomCount: 64, source: 'LAMMPS', data: DIAMOND_DATA, category: 'Materials' },
];

/* ═══════════════════════════════════════════════
   SIMULATION DOMAINS DATA
   ═══════════════════════════════════════════════ */

interface SimulationDomain {
  name: string;
  description: string;
  icon: LucideIcon;
  structureCount: number;
  color: string;
}

const SIMULATION_DOMAINS: SimulationDomain[] = [
  { name: 'Crack Propagation', description: 'Fracture mechanics at the atomic scale', icon: Split, structureCount: 24, color: '#FF2E63' },
  { name: 'Nanoindentation', description: 'Probing mechanical properties', icon: ArrowDownToLine, structureCount: 18, color: '#7B5CFF' },
  { name: 'Rapid Melt', description: 'Phase transitions and melting', icon: Flame, structureCount: 31, color: '#FF8000' },
  { name: 'Granular Pour', description: 'Granular material dynamics', icon: Layers, structureCount: 15, color: '#90E050' },
  { name: 'Micelle Self-Assembly', description: 'Soft matter self-organization', icon: CircleDot, structureCount: 22, color: '#00E5FF' },
  { name: 'Couette Flow', description: 'Fluid dynamics simulation', icon: Waves, structureCount: 19, color: '#3050F8' },
  { name: 'Colloid in Solvent', description: 'Colloidal suspension behavior', icon: Droplets, structureCount: 27, color: '#FFFF30' },
  { name: 'Polymer in Water', description: 'Polymer chain hydration', icon: Link, structureCount: 33, color: '#1FF01F' },
  { name: 'CNT Tensile Pull', description: 'Carbon nanotube mechanics', icon: Hexagon, structureCount: 12, color: '#909090' },
  { name: 'Dislocation Glide', description: 'Crystal plasticity studies', icon: GitBranch, structureCount: 20, color: '#E06633' },
  { name: 'Protein Folding', description: 'Biomolecular structure prediction', icon: Dna, structureCount: 45, color: '#FF0D0D' },
  { name: 'Ion Migration', description: 'Ionic conduction pathways', icon: Zap, structureCount: 16, color: '#7D80B0' },
];

/* ═══════════════════════════════════════════════
   CATEGORY & SOURCE FILTERS
   ═══════════════════════════════════════════════ */

const CATEGORIES = ['All', 'Organic', 'Pharmaceutical', 'Biomolecular', 'Materials'];
const SOURCES = ['All Sources', 'PubChem', 'LAMMPS', 'AI-Generated'];

/* ─── Formula colorizer helper ─── */
function FormulaDisplay({ formula }: { formula: string }) {
  const parts = formula.match(/([A-Z][a-z]*)(\d*)/g) || [];
  const elementColors: Record<string, string> = {
    C: 'text-[#909090]',
    H: 'text-[#FFFFFF]',
    N: 'text-[#3050F8]',
    O: 'text-[#FF0D0D]',
    P: 'text-[#FF8000]',
    S: 'text-[#FFFF30]',
    F: 'text-[#90E050]',
    Cl: 'text-[#1FF01F]',
  };
  return (
    <span className="font-mono text-caption">
      {parts.map((part, i) => {
        const match = part.match(/([A-Z][a-z]*)(\d*)/);
        if (!match) return part;
        const [, el, num] = match;
        const colorClass = elementColors[el] || 'text-white';
        return (
          <span key={i}>
            <span className={colorClass}>{el}</span>
            {num && <sub className="text-[10px]">{num}</sub>}
          </span>
        );
      })}
    </span>
  );
}

/* ═══════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════ */

/* ─── Domain Card ─── */
function DomainCard({ domain, index }: { domain: SimulationDomain; index: number }) {
  const Icon = domain.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay: index * 0.06, ease }}
      whileHover={{ y: -4, transition: { duration: 0.3 } }}
      className="group relative bg-surface border border-[rgba(255,255,255,0.06)] rounded-[14px] p-6 cursor-pointer transition-colors duration-300 hover:border-[rgba(255,255,255,0.15)]"
      style={{ '--accent': domain.color } as React.CSSProperties}
    >
      <div className="flex items-start justify-between mb-4">
        <Icon
          className="w-8 h-8 transition-transform duration-300 group-hover:scale-110"
          style={{ color: domain.color }}
        />
        <span className="text-caption text-[rgba(255,255,255,0.3)]">
          {domain.structureCount} structures
        </span>
      </div>
      <h3 className="font-body text-[18px] font-medium text-white mb-1">{domain.name}</h3>
      <p className="font-body text-body-sm text-[rgba(255,255,255,0.6)]">{domain.description}</p>
      <div className="flex gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full opacity-40"
            style={{ backgroundColor: domain.color }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Molecule Card (Grid view) ─── */
function MoleculeGridCard({ molecule, index }: { molecule: PopularMolecule; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease }}
      whileHover={{ y: -4, transition: { duration: 0.3 } }}
      className="group bg-surface border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden cursor-pointer transition-colors duration-300 hover:border-[rgba(123,92,255,0.4)] hover:shadow-[0_0_20px_rgba(123,92,255,0.15)]"
    >
      <div className="h-[180px] bg-[#050508] relative overflow-hidden">
        <MoleculeViewer
          moleculeData={molecule.data}
          width="100%"
          height={180}
          autoRotate={true}
          interactive={false}
          showBonds={true}
          atomScale={1.0}
        />
      </div>
      <div className="p-4">
        <h3 className="font-body text-[16px] font-medium text-white mb-1">{molecule.name}</h3>
        <div className="mb-2">
          <FormulaDisplay formula={molecule.formula} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-caption text-[rgba(255,255,255,0.3)]">{molecule.atomCount} atoms</span>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
              molecule.source === 'PubChem'
                ? 'bg-[rgba(48,80,248,0.15)] text-[#3050F8]'
                : molecule.source === 'LAMMPS'
                ? 'bg-[rgba(144,224,80,0.15)] text-[#90E050]'
                : 'bg-[rgba(123,92,255,0.15)] text-lupi-violet'
            }`}
          >
            {molecule.source}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Molecule List Row ─── */
function MoleculeListRow({ molecule, index }: { molecule: PopularMolecule; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease }}
      whileHover={{ backgroundColor: 'rgba(16, 16, 28, 1)' }}
      className="group flex items-center gap-4 p-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-surface cursor-pointer transition-all duration-200 hover:border-[rgba(123,92,255,0.3)]"
    >
      <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#050508] shrink-0">
        <MoleculeViewer
          moleculeData={molecule.data}
          width={80}
          height={80}
          autoRotate={true}
          interactive={false}
          showBonds={true}
          atomScale={0.7}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-body text-[16px] font-medium text-white">{molecule.name}</h3>
        <div className="mt-0.5">
          <FormulaDisplay formula={molecule.formula} />
        </div>
        <span className="text-caption text-[rgba(255,255,255,0.3)] mt-1 block">
          {molecule.atomCount} atoms
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            molecule.source === 'PubChem'
              ? 'bg-[rgba(48,80,248,0.15)] text-[#3050F8]'
              : molecule.source === 'LAMMPS'
              ? 'bg-[rgba(144,224,80,0.15)] text-[#90E050]'
              : 'bg-[rgba(123,92,255,0.15)] text-lupi-violet'
          }`}
        >
          {molecule.source}
        </span>
        <ExternalLink className="w-4 h-4 text-[rgba(255,255,255,0.3)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease }}
      className="flex flex-col items-center justify-center py-20"
    >
      <Atom className="w-16 h-16 text-[rgba(255,255,255,0.2)] mb-4" />
      <p className="font-body text-[18px] text-white mb-2">No molecules found</p>
      <p className="font-body text-body-sm text-[rgba(255,255,255,0.6)] mb-6">
        Try adjusting your search or filters
      </p>
      <button
        onClick={onClear}
        className="px-5 py-2.5 border border-[rgba(255,255,255,0.15)] text-white font-body text-button rounded-lg hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.3)] transition-all duration-200"
      >
        Clear Filters
      </button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN GALLERY PAGE
   ═══════════════════════════════════════════════ */

export default function Gallery() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSource, setActiveSource] = useState('All Sources');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  /* Debounced search could be added here — using direct filter for simplicity */
  const filteredMolecules = useMemo(() => {
    return POPULAR_MOLECULES.filter((mol) => {
      const matchesSearch =
        searchQuery === '' ||
        mol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mol.formula.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mol.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || mol.category === activeCategory;
      const matchesSource = activeSource === 'All Sources' || mol.source === activeSource;
      return matchesSearch && matchesCategory && matchesSource;
    });
  }, [searchQuery, activeCategory, activeSource]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setActiveCategory('All');
    setActiveSource('All Sources');
  }, []);

  return (
    <div className="min-h-[100dvh]">
      {/* ── Section 1: Page Header ── */}
      <section className="pt-[80px] pb-[60px] px-6">
        <div className="max-w-content mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
            className="font-display text-[56px] font-light text-white leading-tight tracking-tight mb-4"
          >
            Molecule Gallery
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
            className="font-body text-body text-[rgba(255,255,255,0.6)] max-w-[600px] mx-auto mb-8"
          >
            Explore curated molecular structures and simulation domains. From simple organic
            compounds to complex materials — all rendered in real-time 3D.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease }}
            className="flex items-center justify-center gap-8"
          >
            {[
              { value: '12', label: 'Simulation Domains' },
              { value: '50,000+', label: 'Structures' },
              { value: '\u221E', label: 'Generated by AI' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1, ease }}
                className="text-center"
              >
                <div className="font-display text-[24px] font-medium text-white">{stat.value}</div>
                <div className="font-body text-[14px] text-[rgba(255,255,255,0.6)]">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Section 2: Search & Filter Bar ── */}
      <section className="sticky top-16 z-50 bg-surface/95 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)]">
        <div className="max-w-content mx-auto px-6 py-4">
          {/* Search Input */}
          <div className="relative max-w-[800px] mx-auto mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgba(255,255,255,0.3)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, formula, or SMILES..."
              className="w-full bg-surface-elevated border border-[rgba(255,255,255,0.08)] rounded-xl py-3 pl-12 pr-10 text-white font-body text-[16px] placeholder:text-[rgba(255,255,255,0.3)] placeholder:italic focus:outline-none focus:border-lupi-violet focus:ring-1 focus:ring-lupi-violet transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
              {CATEGORIES.map((cat) => {
                const count =
                  cat === 'All'
                    ? POPULAR_MOLECULES.length
                    : POPULAR_MOLECULES.filter((m) => m.category === cat).length;
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 px-4 py-1.5 rounded-full font-body text-[13px] font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-lupi-violet text-white'
                        : 'bg-surface-elevated text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)]'
                    }`}
                  >
                    {cat}
                    <span className={`ml-1.5 text-[11px] ${isActive ? 'text-white/70' : 'text-[rgba(255,255,255,0.3)]'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Source Filter + View Toggle */}
            <div className="flex items-center gap-3">
              <select
                value={activeSource}
                onChange={(e) => setActiveSource(e.target.value)}
                className="bg-surface-elevated border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-1.5 text-[13px] text-[rgba(255,255,255,0.6)] focus:outline-none focus:border-lupi-violet cursor-pointer"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <div className="flex items-center bg-surface-elevated rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-lupi-violet text-white'
                      : 'text-[rgba(255,255,255,0.3)] hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-lupi-violet text-white'
                      : 'text-[rgba(255,255,255,0.3)] hover:text-white'
                  }`}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Simulation Domains ── */}
      <section className="py-section-mobile lg:py-section-desktop px-6">
        <div className="max-w-content mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease }}
            className="font-display text-h3 text-white mb-8"
          >
            Simulation Domains
          </motion.h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {SIMULATION_DOMAINS.map((domain, i) => (
              <DomainCard key={domain.name} domain={domain} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Molecule Grid ── */}
      <section className="pb-section-mobile lg:pb-section-desktop px-6">
        <div className="max-w-content mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease }}
            className="font-display text-h3 text-white mb-8"
          >
            Popular Molecules
          </motion.h2>

          <AnimatePresence mode="wait">
            {filteredMolecules.length === 0 ? (
              <EmptyState key="empty" onClear={clearFilters} />
            ) : viewMode === 'grid' ? (
              <motion.div
                key="grid"
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {filteredMolecules.map((mol, i) => (
                  <MoleculeGridCard key={mol.name} molecule={mol} index={i} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                layout
                className="flex flex-col gap-3"
              >
                {filteredMolecules.map((mol, i) => (
                  <MoleculeListRow key={mol.name} molecule={mol} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Section 5: CTA Banner ── */}
      <section className="px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease }}
          className="max-w-content mx-auto bg-lupi-violet rounded-2xl p-10 md:p-16 text-center"
        >
          <h2 className="font-display text-[32px] font-light text-white mb-3">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="font-body text-[14px] text-white/70 mb-6">
            Generate any molecule instantly in the Studio
          </p>
          <a
            href="#/studio"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-void-black font-body text-button rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg"
          >
            Open Studio
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>
      </section>
    </div>
  );
}
