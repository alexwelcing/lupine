#!/usr/bin/env python3
"""
glimbin_convert.py — Convert LAMMPS dump/XYZ/data files to .glimbin format

The .glimbin format is a chunked binary container optimized for HTTP Range
Requests and direct-to-GPU buffer upload. It enables streaming of multi-GB
trajectory files in the Atlas WebGPU viewer without loading the entire
dataset into memory.

Usage:
    python glimbin_convert.py input.lammpstrj -o output.glimbin
    python glimbin_convert.py input.xyz -o output.glimbin --compress
    python glimbin_convert.py input.lammpstrj --upload gs://glim-datasets/sims/

Requires: numpy (pip install numpy)
Optional: google-cloud-storage (for --upload)
"""

import argparse
import gzip
import io
import os
import struct
import sys
from pathlib import Path
from typing import BinaryIO

import numpy as np


# ═══════════════════════════════════════════════════════════════════
# Format constants (must match packages/core/src/glimbin.ts)
# ═══════════════════════════════════════════════════════════════════

MAGIC = b"GLIM"
VERSION = 1
HEADER_SIZE = 256
FRAME_ENTRY_SIZE = 24

FLAG_COMPRESSED     = 0x0001
FLAG_LITTLE_ENDIAN  = 0x0002
FLAG_VARIABLE_ATOMS = 0x0004
FLAG_HAS_BONDS      = 0x0008
FLAG_HAS_PROPERTIES = 0x0010


# ═══════════════════════════════════════════════════════════════════
# LAMMPS Dump Parser
# ═══════════════════════════════════════════════════════════════════

class Frame:
    """A single frame of atomic data."""

    def __init__(self):
        self.timestep: int = 0
        self.natoms: int = 0
        self.box_bounds = np.zeros(6, dtype=np.float64)  # xlo,xhi,ylo,yhi,zlo,zhi
        self.box_tilt = np.zeros(3, dtype=np.float64)     # xy,xz,yz
        self.triclinic: bool = False
        self.ids: np.ndarray = np.array([], dtype=np.int32)
        self.types: np.ndarray = np.array([], dtype=np.uint8)
        self.positions: np.ndarray = np.array([], dtype=np.float32)
        self.bonds: np.ndarray = np.array([], dtype=np.int32)
        self.properties: dict[str, np.ndarray] = {}


def parse_lammps_dump(filepath: str, progress_cb=None) -> list[Frame]:
    """Parse a LAMMPS dump/trajectory file into Frame objects."""
    frames = []
    
    opener = gzip.open if filepath.endswith(".gz") else open
    
    with opener(filepath, "rt") as f:
        lines = f.readlines()
    
    i = 0
    total_lines = len(lines)
    
    while i < total_lines:
        line = lines[i].strip()
        
        if line == "ITEM: TIMESTEP":
            frame = Frame()
            i += 1
            frame.timestep = int(lines[i].strip())
            i += 1
            
            # NUMBER OF ATOMS
            assert "ITEM: NUMBER OF ATOMS" in lines[i]
            i += 1
            frame.natoms = int(lines[i].strip())
            i += 1
            
            # BOX BOUNDS
            box_line = lines[i].strip()
            frame.triclinic = "xy" in box_line
            i += 1
            
            bounds = []
            for _ in range(3):
                vals = lines[i].strip().split()
                bounds.extend([float(vals[0]), float(vals[1])])
                if frame.triclinic and len(vals) > 2:
                    # tilt factors are in the 3rd column
                    pass  # Handled below
                i += 1
            frame.box_bounds = np.array(bounds, dtype=np.float64)
            
            # ATOMS
            atoms_line = lines[i].strip()
            assert "ITEM: ATOMS" in atoms_line
            columns = atoms_line.replace("ITEM: ATOMS ", "").split()
            i += 1
            
            # Find column indices
            id_col = columns.index("id") if "id" in columns else None
            type_col = columns.index("type") if "type" in columns else None
            x_col = columns.index("x") if "x" in columns else (columns.index("xu") if "xu" in columns else None)
            y_col = columns.index("y") if "y" in columns else (columns.index("yu") if "yu" in columns else None)
            z_col = columns.index("z") if "z" in columns else (columns.index("zu") if "zu" in columns else None)
            
            if x_col is None:
                # Try scaled coordinates
                x_col = columns.index("xs") if "xs" in columns else 0
                y_col = columns.index("ys") if "ys" in columns else 1
                z_col = columns.index("zs") if "zs" in columns else 2
            
            ids = np.zeros(frame.natoms, dtype=np.int32)
            types = np.zeros(frame.natoms, dtype=np.uint8)
            positions = np.zeros(frame.natoms * 3, dtype=np.float32)
            
            # Identify extra property columns
            skip_cols = {"id", "type", "x", "y", "z", "xu", "yu", "zu", "xs", "ys", "zs"}
            prop_cols = [(j, col) for j, col in enumerate(columns) if col not in skip_cols]
            prop_data = {name: np.zeros(frame.natoms, dtype=np.float32) for _, name in prop_cols}
            
            for atom_i in range(frame.natoms):
                vals = lines[i].strip().split()
                i += 1
                
                if id_col is not None:
                    ids[atom_i] = int(vals[id_col])
                else:
                    ids[atom_i] = atom_i + 1
                    
                if type_col is not None:
                    types[atom_i] = int(vals[type_col])
                else:
                    types[atom_i] = 1
                
                positions[atom_i * 3] = float(vals[x_col])
                positions[atom_i * 3 + 1] = float(vals[y_col])
                positions[atom_i * 3 + 2] = float(vals[z_col])
                
                for col_idx, col_name in prop_cols:
                    prop_data[col_name][atom_i] = float(vals[col_idx])
            
            frame.ids = ids
            frame.types = types
            frame.positions = positions
            frame.properties = prop_data
            
            frames.append(frame)
            
            if progress_cb:
                progress_cb(len(frames), i / total_lines)
        else:
            i += 1
    
    return frames


def parse_xyz(filepath: str, progress_cb=None) -> list[Frame]:
    """Parse an XYZ trajectory file."""
    frames = []
    
    # Element to type mapping
    element_map: dict[str, int] = {}
    next_type = 1
    
    opener = gzip.open if filepath.endswith(".gz") else open
    
    with opener(filepath, "rt") as f:
        lines = f.readlines()
    
    i = 0
    total_lines = len(lines)
    
    while i < total_lines:
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        
        try:
            natoms = int(line)
        except ValueError:
            i += 1
            continue
        
        i += 1
        frame = Frame()
        frame.natoms = natoms
        frame.timestep = len(frames)
        
        # Comment line (may contain box info)
        if i < total_lines:
            comment = lines[i].strip()
            # Try to parse lattice from extended XYZ format
            if 'Lattice=' in comment:
                try:
                    lat_str = comment.split('Lattice="')[1].split('"')[0]
                    lat_vals = [float(v) for v in lat_str.split()]
                    if len(lat_vals) >= 9:
                        frame.box_bounds = np.array([
                            0.0, lat_vals[0],
                            0.0, lat_vals[4],
                            0.0, lat_vals[8],
                        ], dtype=np.float64)
                except (IndexError, ValueError):
                    pass
            i += 1
        
        ids = np.zeros(natoms, dtype=np.int32)
        types = np.zeros(natoms, dtype=np.uint8)
        positions = np.zeros(natoms * 3, dtype=np.float32)
        
        for atom_i in range(natoms):
            if i >= total_lines:
                break
            vals = lines[i].strip().split()
            i += 1
            
            element = vals[0]
            if element not in element_map:
                element_map[element] = next_type
                next_type += 1
            
            ids[atom_i] = atom_i + 1
            types[atom_i] = element_map[element]
            positions[atom_i * 3] = float(vals[1])
            positions[atom_i * 3 + 1] = float(vals[2])
            positions[atom_i * 3 + 2] = float(vals[3])
        
        frame.ids = ids
        frame.types = types
        frame.positions = positions
        frames.append(frame)
        
        if progress_cb:
            progress_cb(len(frames), i / total_lines)
    
    return frames


# ═══════════════════════════════════════════════════════════════════
# .glimbin Writer
# ═══════════════════════════════════════════════════════════════════

def write_glimbin(frames: list[Frame], output: str, compress: bool = False):
    """Write frames to a .glimbin file."""
    if not frames:
        raise ValueError("No frames to write")
    
    # Compute global bounds and collect atom types
    all_types = set()
    min_bounds = np.array([np.inf, np.inf, np.inf], dtype=np.float32)
    max_bounds = np.array([-np.inf, -np.inf, -np.inf], dtype=np.float32)
    
    variable_atoms = len(set(f.natoms for f in frames)) > 1
    has_bonds = any(len(f.bonds) > 0 for f in frames)
    has_properties = any(len(f.properties) > 0 for f in frames)
    
    for frame in frames:
        for j in range(frame.natoms):
            all_types.add(int(frame.types[j]))
            x = frame.positions[j * 3]
            y = frame.positions[j * 3 + 1]
            z = frame.positions[j * 3 + 2]
            min_bounds[0] = min(min_bounds[0], x)
            min_bounds[1] = min(min_bounds[1], y)
            min_bounds[2] = min(min_bounds[2], z)
            max_bounds[0] = max(max_bounds[0], x)
            max_bounds[1] = max(max_bounds[1], y)
            max_bounds[2] = max(max_bounds[2], z)
    
    atom_types = sorted(all_types)
    
    # Build flags
    flags = FLAG_LITTLE_ENDIAN
    if compress:
        flags |= FLAG_COMPRESSED
    if variable_atoms:
        flags |= FLAG_VARIABLE_ATOMS
    if has_bonds:
        flags |= FLAG_HAS_BONDS
    if has_properties:
        flags |= FLAG_HAS_PROPERTIES
    
    # First pass: serialize all frame data to get sizes
    frame_blobs: list[bytes] = []
    frame_raw_sizes: list[int] = []
    
    for frame in frames:
        blob = _serialize_frame(frame, flags)
        frame_raw_sizes.append(len(blob))
        
        if compress:
            blob = gzip.compress(blob, compresslevel=6)
        
        frame_blobs.append(blob)
    
    # Layout:
    #   [HEADER: 256 bytes]
    #   [FRAME DATA: variable]
    #   [FRAME INDEX: totalFrames * 24 bytes]
    
    # Frame data starts right after header
    frame_data_offset = HEADER_SIZE
    
    # Calculate frame offsets
    frame_offsets: list[int] = []
    offset = frame_data_offset
    for blob in frame_blobs:
        frame_offsets.append(offset)
        offset += len(blob)
    
    # Frame index starts after all frame data
    frame_index_offset = offset
    
    # Write file
    with open(output, "wb") as f:
        # ── Header (256 bytes) ────────────────────────────────
        header = bytearray(HEADER_SIZE)
        
        # Magic
        header[0:4] = MAGIC
        
        # Version (u16 LE)
        struct.pack_into("<H", header, 4, VERSION)
        
        # Flags (u16 LE)
        struct.pack_into("<H", header, 6, flags)
        
        # Total frames (u32 LE)
        struct.pack_into("<I", header, 8, len(frames))
        
        # Atoms per frame (u32 LE) — first frame's count if variable
        struct.pack_into("<I", header, 12, frames[0].natoms)
        
        # Atom types (u8 count + up to 32 u8 values)
        header[16] = min(len(atom_types), 32)
        for i, t in enumerate(atom_types[:32]):
            header[17 + i] = t
        
        # Global bounds: 6 × f32 at offset 52
        struct.pack_into("<6f", header, 52,
                         min_bounds[0], min_bounds[1], min_bounds[2],
                         max_bounds[0], max_bounds[1], max_bounds[2])
        
        # Box bounds: 6 × f64 at offset 76
        bb = frames[0].box_bounds
        struct.pack_into("<6d", header, 76, *bb)
        
        # Box tilt: 3 × f64 at offset 124
        bt = frames[0].box_tilt
        struct.pack_into("<3d", header, 124, *bt)
        
        # Triclinic: u8 at offset 148
        header[148] = 1 if frames[0].triclinic else 0
        
        # Unit style: u8 at offset 149 (0 = unknown)
        header[149] = 0
        
        # Frame index offset: u64 at offset 152
        struct.pack_into("<Q", header, 152, frame_index_offset)
        
        f.write(header)
        
        # ── Frame data ────────────────────────────────────────
        for blob in frame_blobs:
            f.write(blob)
        
        # ── Frame index ───────────────────────────────────────
        for i, frame in enumerate(frames):
            entry = struct.pack("<QIIIi",
                                frame_offsets[i],         # offset (u64)
                                len(frame_blobs[i]),      # compressedSize (u32)
                                frame_raw_sizes[i],       # rawSize (u32)
                                frame.timestep,           # timestep (u32)
                                frame.natoms)             # natoms (u32, signed for compat)
            f.write(entry)
    
    file_size = os.path.getsize(output)
    return file_size


def _serialize_frame(frame: Frame, flags: int) -> bytes:
    """Serialize a single frame to raw bytes."""
    buf = io.BytesIO()
    
    # ids: Int32Array(natoms)
    buf.write(frame.ids.astype(np.int32).tobytes())
    
    # types: Uint8Array(natoms)
    buf.write(frame.types.astype(np.uint8).tobytes())
    
    # Align to 4 bytes
    padding = (4 - (frame.natoms % 4)) % 4
    buf.write(b"\x00" * padding)
    
    # positions: Float32Array(natoms * 3)
    buf.write(frame.positions.astype(np.float32).tobytes())
    
    # bonds (optional)
    if flags & FLAG_HAS_BONDS:
        nbonds = len(frame.bonds) // 2
        buf.write(struct.pack("<I", nbonds))
        if nbonds > 0:
            buf.write(frame.bonds.astype(np.int32).tobytes())
    
    # properties (optional)
    if flags & FLAG_HAS_PROPERTIES:
        props = frame.properties
        buf.write(struct.pack("<I", len(props)))
        for name, data in props.items():
            name_bytes = name.encode("utf-8")
            buf.write(struct.pack("<H", len(name_bytes)))
            buf.write(name_bytes)
            # Align to 4 bytes
            total = 2 + len(name_bytes)
            pad = (4 - (total % 4)) % 4
            buf.write(b"\x00" * pad)
            buf.write(data.astype(np.float32).tobytes())
    
    return buf.getvalue()


# ═══════════════════════════════════════════════════════════════════
# GCS Upload
# ═══════════════════════════════════════════════════════════════════

def upload_to_gcs(local_path: str, gcs_uri: str):
    """Upload a file to Google Cloud Storage."""
    try:
        from google.cloud import storage
    except ImportError:
        print("ERROR: google-cloud-storage not installed.")
        print("  pip install google-cloud-storage")
        sys.exit(1)
    
    # Parse gs://bucket/path
    assert gcs_uri.startswith("gs://"), f"Expected gs:// URI, got: {gcs_uri}"
    parts = gcs_uri[5:].split("/", 1)
    bucket_name = parts[0]
    prefix = parts[1] if len(parts) > 1 else ""
    
    filename = os.path.basename(local_path)
    blob_name = os.path.join(prefix, filename).replace("\\", "/")
    
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    
    # Set cache-control for CDN
    blob.cache_control = "public, max-age=2592000, immutable"
    blob.content_type = "application/octet-stream"
    
    print(f"Uploading {local_path} → gs://{bucket_name}/{blob_name} ...")
    blob.upload_from_filename(local_path)
    print(f"Uploaded: gs://{bucket_name}/{blob_name}")
    print(f"Public URL: https://storage.googleapis.com/{bucket_name}/{blob_name}")


# ═══════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Convert simulation files to .glimbin format for streaming",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s input.lammpstrj -o output.glimbin
  %(prog)s input.xyz -o output.glimbin --compress
  %(prog)s input.lammpstrj --upload gs://glim-datasets/sims/
  %(prog)s input.lammpstrj --info  # Just show stats, don't convert
        """,
    )
    
    parser.add_argument("input", help="Input file (LAMMPS dump, XYZ)")
    parser.add_argument("-o", "--output", help="Output .glimbin file path")
    parser.add_argument("--compress", action="store_true", help="Enable gzip compression per frame")
    parser.add_argument("--upload", metavar="GCS_URI", help="Upload to GCS after conversion (gs://bucket/path)")
    parser.add_argument("--info", action="store_true", help="Show file info without converting")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    input_path = args.input
    if not os.path.exists(input_path):
        print(f"ERROR: Input file not found: {input_path}")
        sys.exit(1)
    
    # Detect format
    lower = input_path.lower()
    if lower.endswith(".xyz") or lower.endswith(".xyz.gz"):
        file_format = "xyz"
    else:
        file_format = "dump"
    
    print(f"Parsing {input_path} (format: {file_format}) ...")
    
    def progress(nframes, pct):
        if args.verbose:
            print(f"  Parsed {nframes} frames ({pct:.0%})", end="\r")
    
    if file_format == "xyz":
        frames = parse_xyz(input_path, progress_cb=progress)
    else:
        frames = parse_lammps_dump(input_path, progress_cb=progress)
    
    if args.verbose:
        print()
    
    if not frames:
        print("ERROR: No frames found in input file")
        sys.exit(1)
    
    # Compute stats
    total_atoms = sum(f.natoms for f in frames)
    unique_types = sorted(set(int(t) for f in frames for t in f.types))
    input_size = os.path.getsize(input_path)
    
    print(f"\n{'=' * 50}")
    print(f"  Frames:     {len(frames)}")
    print(f"  Atoms/frame: {frames[0].natoms:,}" + (f" (variable)" if len(set(f.natoms for f in frames)) > 1 else ""))
    print(f"  Total atoms: {total_atoms:,}")
    print(f"  Atom types:  {unique_types}")
    print(f"  Properties:  {list(frames[0].properties.keys()) if frames[0].properties else '(none)'}")
    print(f"  Input size:  {input_size / 1e6:.1f} MB")
    print(f"{'=' * 50}")
    
    if args.info:
        return
    
    # Default output path
    output_path = args.output
    if not output_path:
        output_path = os.path.splitext(input_path)[0]
        if output_path.endswith(".lammpstrj"):
            output_path = output_path[:-10]
        output_path += ".glimbin"
    
    print(f"\nWriting {output_path} (compress={'yes' if args.compress else 'no'}) ...")
    
    output_size = write_glimbin(frames, output_path, compress=args.compress)
    
    ratio = input_size / output_size if output_size > 0 else 0
    print(f"  Output size: {output_size / 1e6:.1f} MB")
    print(f"  Compression: {ratio:.1f}× smaller")
    print(f"  ✓ Written: {output_path}")
    
    # Upload
    if args.upload:
        upload_to_gcs(output_path, args.upload)


if __name__ == "__main__":
    main()
