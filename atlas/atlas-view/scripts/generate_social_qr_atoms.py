#!/usr/bin/env python3
"""Generate atom-and-bond QR structures for LUPI social links.

The output is plain XYZ: every dark QR module becomes a carbon atom on an XY
lattice. Neighboring dark modules sit at a C-C-like spacing, so LUPI's normal
bond detector draws the QR as both atoms and bonds without a separate bond file.

This script intentionally carries a tiny QR encoder (byte mode, ECC-M,
versions 1-6) so regenerating the limited social archive does not require a
network install. Version 6 / ECC-M fits 108 bytes, which covers normal HTTPS
profile links; shorten very long URLs before turning them into atom QRs.
"""
from __future__ import annotations

import argparse
import dataclasses
import json
import re
from pathlib import Path
from typing import Iterable

# QR Code Model 2, error correction M, versions 1-6.
# Tuples are (block_count, total_codewords_per_block, data_codewords_per_block).
RS_BLOCKS_M: dict[int, list[tuple[int, int, int]]] = {
    1: [(1, 26, 16)],
    2: [(1, 44, 28)],
    3: [(1, 70, 44)],
    4: [(2, 50, 32)],
    5: [(2, 67, 43)],
    6: [(4, 43, 27)],
}
ALIGNMENT_POSITIONS: dict[int, list[int]] = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
}

# GF(256) tables for Reed-Solomon over primitive polynomial 0x11D.
GF_EXP = [0] * 512
GF_LOG = [0] * 256
_x = 1
for _i in range(255):
    GF_EXP[_i] = _x
    GF_LOG[_x] = _i
    _x <<= 1
    if _x & 0x100:
        _x ^= 0x11D
for _i in range(255, 512):
    GF_EXP[_i] = GF_EXP[_i - 255]


def gf_mul(a: int, b: int) -> int:
    if a == 0 or b == 0:
        return 0
    return GF_EXP[GF_LOG[a] + GF_LOG[b]]


def rs_generator(degree: int) -> list[int]:
    poly = [1]
    for i in range(degree):
        nxt = [0] * (len(poly) + 1)
        for j, coef in enumerate(poly):
            nxt[j] ^= gf_mul(coef, 1)
            nxt[j + 1] ^= gf_mul(coef, GF_EXP[i])
        poly = nxt
    return poly


def rs_remainder(data: list[int], degree: int) -> list[int]:
    gen = rs_generator(degree)
    rem = data[:] + [0] * degree
    for i in range(len(data)):
        factor = rem[i]
        if factor == 0:
            continue
        for j, coef in enumerate(gen):
            rem[i + j] ^= gf_mul(coef, factor)
    return rem[-degree:]


class BitBuffer:
    def __init__(self) -> None:
        self.bits: list[int] = []

    def append(self, value: int, width: int) -> None:
        for i in range(width - 1, -1, -1):
            self.bits.append((value >> i) & 1)

    def to_codewords(self) -> list[int]:
        return [sum(bit << (7 - i) for i, bit in enumerate(self.bits[j:j + 8])) for j in range(0, len(self.bits), 8)]


def pick_version(payload_len: int) -> int:
    # Byte mode: 4 mode bits + 8 count bits for versions 1-9.
    for version, groups in RS_BLOCKS_M.items():
        cap = sum(count * data for count, _total, data in groups)
        if 12 + payload_len * 8 <= cap * 8:
            return version
    raise ValueError(f"payload is {payload_len} bytes; max for ECC-M atom QR is 108 bytes")


def data_codewords(payload: bytes, version: int) -> list[int]:
    capacity = sum(count * data for count, _total, data in RS_BLOCKS_M[version])
    bits = BitBuffer()
    bits.append(0b0100, 4)  # byte mode
    bits.append(len(payload), 8)
    for b in payload:
        bits.append(b, 8)
    terminator = min(4, capacity * 8 - len(bits.bits))
    bits.append(0, terminator)
    while len(bits.bits) % 8:
        bits.append(0, 1)
    codewords = bits.to_codewords()
    pads = [0xEC, 0x11]
    i = 0
    while len(codewords) < capacity:
        codewords.append(pads[i % 2])
        i += 1
    return codewords


def interleave_with_ecc(data: list[int], version: int) -> list[int]:
    blocks: list[list[int]] = []
    eccs: list[list[int]] = []
    cursor = 0
    for count, total, data_len in RS_BLOCKS_M[version]:
        ecc_len = total - data_len
        for _ in range(count):
            block = data[cursor:cursor + data_len]
            cursor += data_len
            blocks.append(block)
            eccs.append(rs_remainder(block, ecc_len))
    out: list[int] = []
    for i in range(max(len(b) for b in blocks)):
        for block in blocks:
            if i < len(block):
                out.append(block[i])
    for i in range(max(len(e) for e in eccs)):
        for ecc in eccs:
            if i < len(ecc):
                out.append(ecc[i])
    return out


@dataclasses.dataclass
class Matrix:
    version: int
    modules: list[list[bool]]
    function: list[list[bool]]

    @property
    def size(self) -> int:
        return len(self.modules)

    def set_function(self, x: int, y: int, dark: bool) -> None:
        if 0 <= x < self.size and 0 <= y < self.size:
            self.modules[y][x] = dark
            self.function[y][x] = True

    def set_data(self, x: int, y: int, dark: bool) -> None:
        self.modules[y][x] = dark


def empty_matrix(version: int) -> Matrix:
    size = 17 + 4 * version
    m = Matrix(version, [[False] * size for _ in range(size)], [[False] * size for _ in range(size)])

    def finder(left: int, top: int) -> None:
        for dy in range(-1, 8):
            for dx in range(-1, 8):
                x, y = left + dx, top + dy
                if not (0 <= x < size and 0 <= y < size):
                    continue
                dark = (0 <= dx <= 6 and 0 <= dy <= 6 and (dx in (0, 6) or dy in (0, 6) or (2 <= dx <= 4 and 2 <= dy <= 4)))
                m.set_function(x, y, dark)

    finder(0, 0)
    finder(size - 7, 0)
    finder(0, size - 7)

    for i in range(8, size - 8):
        m.set_function(i, 6, i % 2 == 0)
        m.set_function(6, i, i % 2 == 0)

    for cy in ALIGNMENT_POSITIONS[version]:
        for cx in ALIGNMENT_POSITIONS[version]:
            if m.function[cy][cx]:
                continue
            for dy in range(-2, 3):
                for dx in range(-2, 3):
                    dark = max(abs(dx), abs(dy)) != 1
                    m.set_function(cx + dx, cy + dy, dark)

    # Reserve format information strips and dark module.
    for i in range(9):
        if i != 6:
            m.function[8][i] = True
            m.function[i][8] = True
    for i in range(8):
        m.function[8][size - 1 - i] = True
        m.function[size - 1 - i][8] = True
    m.set_function(8, 4 * version + 9, True)
    return m


def place_data(m: Matrix, codewords: list[int]) -> None:
    bits = [(cw >> i) & 1 for cw in codewords for i in range(7, -1, -1)]
    size = m.size
    bit_index = 0
    upward = True
    x = size - 1
    while x > 0:
        if x == 6:
            x -= 1
        rows = range(size - 1, -1, -1) if upward else range(size)
        for y in rows:
            for dx in (0, 1):
                xx = x - dx
                if m.function[y][xx]:
                    continue
                m.set_data(xx, y, bool(bits[bit_index]) if bit_index < len(bits) else False)
                bit_index += 1
        upward = not upward
        x -= 2


def mask_bit(mask: int, x: int, y: int) -> bool:
    return [
        (x + y) % 2 == 0,
        y % 2 == 0,
        x % 3 == 0,
        (x + y) % 3 == 0,
        (y // 2 + x // 3) % 2 == 0,
        ((x * y) % 2 + (x * y) % 3) == 0,
        (((x * y) % 2 + (x * y) % 3) % 2) == 0,
        (((x + y) % 2 + (x * y) % 3) % 2) == 0,
    ][mask]


def apply_mask(src: Matrix, mask: int) -> Matrix:
    m = Matrix(src.version, [row[:] for row in src.modules], [row[:] for row in src.function])
    for y in range(m.size):
        for x in range(m.size):
            if not m.function[y][x] and mask_bit(mask, x, y):
                m.modules[y][x] = not m.modules[y][x]
    return m


def penalty(m: Matrix) -> int:
    n = m.size
    score = 0
    for rows in (m.modules, [[m.modules[y][x] for y in range(n)] for x in range(n)]):
        for row in rows:
            run_color = row[0]
            run = 1
            for cell in row[1:] + [not row[-1]]:
                if cell == run_color:
                    run += 1
                else:
                    if run >= 5:
                        score += 3 + (run - 5)
                    run_color = cell
                    run = 1
    for y in range(n - 1):
        for x in range(n - 1):
            if m.modules[y][x] == m.modules[y][x + 1] == m.modules[y + 1][x] == m.modules[y + 1][x + 1]:
                score += 3
    pattern = [True, False, True, True, True, False, True, False, False, False, False]
    for rows in (m.modules, [[m.modules[y][x] for y in range(n)] for x in range(n)]):
        for row in rows:
            for i in range(n - 10):
                chunk = row[i:i + 11]
                if chunk == pattern or chunk == pattern[::-1]:
                    score += 40
    dark = sum(cell for row in m.modules for cell in row)
    k = abs(dark * 20 - n * n * 10) // (n * n)
    return score + k * 10


def bch_format_bits(ecc_bits: int, mask: int) -> int:
    data = (ecc_bits << 3) | mask
    value = data << 10
    generator = 0b10100110111
    for i in range(14, 9, -1):
        if (value >> i) & 1:
            value ^= generator << (i - 10)
    return ((data << 10) | value) ^ 0b101010000010010


def add_format(m: Matrix, mask: int) -> None:
    bits = bch_format_bits(0b00, mask)  # ECC-M
    size = m.size
    coords_a = [(0, 8), (1, 8), (2, 8), (3, 8), (4, 8), (5, 8), (7, 8), (8, 8), (8, 7), (8, 5), (8, 4), (8, 3), (8, 2), (8, 1), (8, 0)]
    coords_b = ([(8, size - 1 - i) for i in range(7)] + [(8, size - 8)] + [(size - 8 + i, 8) for i in range(8)])
    for i, (x, y) in enumerate(coords_a):
        m.modules[y][x] = bool((bits >> i) & 1)
    for i, (x, y) in enumerate(coords_b):
        m.modules[y][x] = bool((bits >> i) & 1)


def qr_matrix(text: str) -> list[list[bool]]:
    payload = text.encode('utf-8')
    version = pick_version(len(payload))
    base = empty_matrix(version)
    place_data(base, interleave_with_ecc(data_codewords(payload, version), version))
    masked = [apply_mask(base, mask) for mask in range(8)]
    best_mask, best = min(enumerate(masked), key=lambda pair: penalty(pair[1]))
    add_format(best, best_mask)
    return best.modules


@dataclasses.dataclass
class SocialLink:
    id: str
    title: str
    url: str
    tags: list[str]


def slugify(value: str) -> str:
    return re.sub(r'[^a-z0-9_]+', '_', value.lower()).strip('_')


def matrix_to_xyz(matrix: list[list[bool]], title: str, url: str, spacing: float, z_lift: float) -> str:
    n = len(matrix)
    cx = (n - 1) / 2
    cy = (n - 1) / 2
    atoms: list[tuple[str, float, float, float]] = []
    for y, row in enumerate(matrix):
        for x, dark in enumerate(row):
            if dark:
                # Carbon makes robust inferred C-C bonds. Subtle z lift on finder
                # pattern modules keeps the archive visibly atomic at oblique angles
                # without breaking QR readability from the top camera.
                edge = x < 9 and y < 9 or x >= n - 9 and y < 9 or x < 9 and y >= n - 9
                atoms.append(('C', (x - cx) * spacing, (cy - y) * spacing, z_lift if edge else 0.0))
    lines = [str(len(atoms)), f'{title} atom QR | target={url} | spacing={spacing:.2f}A | bond_intent=C-C adjacency']
    lines += [f'{el} {x:.4f} {y:.4f} {z:.4f}' for el, x, y, z in atoms]
    return '\n'.join(lines) + '\n'


def load_links(path: Path) -> list[SocialLink]:
    data = json.loads(path.read_text())
    links = []
    for item in data['links']:
        links.append(SocialLink(
            id=slugify(item.get('id') or item['title']),
            title=item['title'],
            url=item['url'],
            tags=list(item.get('tags', [])),
        ))
    return links


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=Path('apps/web/public/social-qr/social-links.json'))
    parser.add_argument('--out-dir', type=Path, default=Path('apps/web/public/social-qr'))
    parser.add_argument('--spacing', type=float, default=1.55)
    parser.add_argument('--finder-z-lift', type=float, default=0.12)
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    links = load_links(args.config)
    manifest = []
    for link in links:
        matrix = qr_matrix(link.url)
        filename = f'{link.id}.xyz'
        xyz = matrix_to_xyz(matrix, link.title, link.url, args.spacing, args.finder_z_lift)
        (args.out_dir / filename).write_text(xyz)
        manifest.append({
            'id': link.id,
            'title': link.title,
            'url': link.url,
            'file': filename,
            'atoms': int(xyz.split('\n', 1)[0]),
            'qrModules': len(matrix),
            'tags': link.tags,
        })
    (args.out_dir / 'manifest.json').write_text(json.dumps({'links': manifest}, indent=2) + '\n')
    print(f'wrote {len(manifest)} atom QR structures to {args.out_dir}')


if __name__ == '__main__':
    main()
