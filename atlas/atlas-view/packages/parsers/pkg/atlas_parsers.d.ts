/* tslint:disable */
/* eslint-disable */

/**
 * A single frame of atomic data from a LAMMPS dump file.
 * Positions and properties are stored as flat Float64Arrays for zero-copy
 * transfer to WebGPU buffers via JavaScript.
 */
export class Frame {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Get a named property array by column name
     */
    getProperty(name: string): Float32Array | undefined;
    /**
     * List all available property names beyond id/type/position
     */
    propertyNames(): any[];
    /**
     * Get bonds array tracking [a1, b1, a2, b2, ...] as Int32Array
     */
    readonly bonds: Int32Array;
    /**
     * Get box bounds as a JS Float64Array: [xlo, xhi, ylo, yhi, zlo, zhi]
     */
    readonly boxBounds: Float64Array;
    /**
     * Get box tilt factors [xy, xz, yz]
     */
    readonly boxTilt: Float64Array;
    /**
     * Get column names
     */
    readonly columns: any[];
    /**
     * Get atom IDs as Int32Array
     */
    readonly ids: Int32Array;
    /**
     * Get flat position array [x0,y0,z0, x1,y1,z1, ...] as Float32Array
     */
    readonly positions: Float32Array;
    /**
     * Get atom types as Int32Array
     */
    readonly types: Int32Array;
    /**
     * Number of atoms in this frame
     */
    natoms: number;
    /**
     * Timestep number from LAMMPS
     */
    timestep: bigint;
    /**
     * Whether the box is triclinic
     */
    triclinic: boolean;
}

/**
 * Result of parsing a LAMMPS log file — thermo data from one or more runs.
 */
export class ThermoData {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Get a specific column's data as Float64Array for a given run
     */
    getColumn(run: number, name: string): Float64Array | undefined;
    /**
     * Get column names for a specific run
     */
    getColumns(run: number): any[];
    /**
     * Get all data for a run as a flat Float64Array (row-major)
     */
    getRunData(run: number): Float64Array | undefined;
    /**
     * Get number of rows in a specific run
     */
    getRunLength(run: number): number;
    /**
     * Number of runs found in the log
     */
    num_runs: number;
}

/**
 * Count the number of frames in a dump file without full parsing.
 * Useful for UI (show total frame count before loading all data).
 */
export function countDumpFrames(content: string): number;

/**
 * Count the number of thermo output runs in a log file.
 */
export function countLogRuns(content: string): number;

/**
 * Build a frame offset index for random access.
 * Returns byte offsets of each "ITEM: TIMESTEP" header.
 */
export function indexDumpFrames(content: string): Uint32Array;

/**
 * Initialize panic hook for better error messages in browser console
 */
export function init(): void;

/**
 * Parse a LAMMPS data file (read_data format).
 * Extracts atom coordinates, types, and bond topology.
 */
export function parseDataFile(content: string): any;

/**
 * Parse a complete LAMMPS dump file (text format) and return all frames.
 *
 * Supports `dump atom` and `dump custom` formats with arbitrary columns.
 * Handles both Cartesian (x,y,z) and scaled (xs,ys,zs) coordinates.
 *
 * # Format reference
 * ```text
 * ITEM: TIMESTEP
 * 100
 * ITEM: NUMBER OF ATOMS
 * 1000
 * ITEM: BOX BOUNDS pp pp pp
 * 0.0 10.0
 * 0.0 10.0
 * 0.0 10.0
 * ITEM: ATOMS id type x y z vx vy vz
 * 1 1 0.123 4.567 8.901 0.01 -0.02 0.03
 * ...
 * ```
 */
export function parseDump(content: string): any[];

/**
 * Parse a single frame from a dump file by index (0-based).
 * More memory-efficient than parsing all frames for large files.
 */
export function parseDumpFrame(content: string, frame_index: number): Frame;

/**
 * Parse a LAMMPS log file and extract thermodynamic data from all runs.
 *
 * Handles the standard "line" thermo_style output format:
 * ```text
 * Step Temp E_pair E_mol TotEng Press
 *     0    300   -4.200    0.000   -3.900    1.234
 *   100    298   -4.195    0.000   -3.897    2.345
 * ...
 * Loop time of 12.3456 on 4 procs ...
 * ```
 *
 * Detection strategy:
 * - Header line: all tokens are non-numeric (column names)
 * - Data lines: all tokens are numeric
 * - End markers: "Loop time", "ERROR", "WARNING", empty line, or new header
 */
export function parseLog(content: string): ThermoData;

export function parseXyzFile(content: string): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly countDumpFrames: (a: number, b: number) => number;
    readonly indexDumpFrames: (a: number, b: number) => [number, number];
    readonly parseDump: (a: number, b: number) => [number, number, number, number];
    readonly parseDumpFrame: (a: number, b: number, c: number) => [number, number, number];
    readonly parseDataFile: (a: number, b: number) => [number, number, number];
    readonly parseXyzFile: (a: number, b: number) => [number, number, number];
    readonly __wbg_frame_free: (a: number, b: number) => void;
    readonly __wbg_get_frame_natoms: (a: number) => number;
    readonly __wbg_get_frame_timestep: (a: number) => bigint;
    readonly __wbg_get_frame_triclinic: (a: number) => number;
    readonly __wbg_get_thermodata_num_runs: (a: number) => number;
    readonly __wbg_set_frame_natoms: (a: number, b: number) => void;
    readonly __wbg_set_frame_timestep: (a: number, b: bigint) => void;
    readonly __wbg_set_frame_triclinic: (a: number, b: number) => void;
    readonly __wbg_set_thermodata_num_runs: (a: number, b: number) => void;
    readonly __wbg_thermodata_free: (a: number, b: number) => void;
    readonly frame_bonds: (a: number) => [number, number];
    readonly frame_boxBounds: (a: number) => [number, number];
    readonly frame_boxTilt: (a: number) => [number, number];
    readonly frame_columns: (a: number) => [number, number];
    readonly frame_getProperty: (a: number, b: number, c: number) => [number, number];
    readonly frame_ids: (a: number) => [number, number];
    readonly frame_positions: (a: number) => [number, number];
    readonly frame_propertyNames: (a: number) => [number, number];
    readonly frame_types: (a: number) => [number, number];
    readonly thermodata_getColumn: (a: number, b: number, c: number, d: number) => [number, number];
    readonly thermodata_getColumns: (a: number, b: number) => [number, number];
    readonly thermodata_getRunData: (a: number, b: number) => [number, number];
    readonly thermodata_getRunLength: (a: number, b: number) => number;
    readonly init: () => void;
    readonly countLogRuns: (a: number, b: number) => number;
    readonly parseLog: (a: number, b: number) => [number, number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
