#!/usr/bin/env python3
"""
Generate favicon.ico from two PNG files (16x16 and 32x32).

ICO format: header + directory entries + image data.
Modern ICO files can embed PNG data directly (Vista+ PNG ICO).
"""
import struct
import sys
from pathlib import Path

def make_ico(png_paths: list[Path], output: Path) -> None:
    images = [p.read_bytes() for p in png_paths]
    count = len(images)

    # ICO header: reserved(2), type=1(2), count(2)
    header = struct.pack('<HHH', 0, 1, count)

    # Directory entries are 16 bytes each, placed right after header.
    dir_offset = 6 + count * 16
    entries = b''
    offsets = []

    for i, data in enumerate(images):
        # Peek at PNG IHDR to get dimensions (bytes 16-23)
        w_px = struct.unpack('>I', data[16:20])[0]
        h_px = struct.unpack('>I', data[20:24])[0]
        # ICO width/height field: 0 means 256
        w_byte = w_px if w_px < 256 else 0
        h_byte = h_px if h_px < 256 else 0
        offset = dir_offset + sum(len(images[j]) for j in range(i))
        offsets.append(offset)
        # width(1), height(1), colorCount(1), reserved(1),
        # planes(2), bitCount(2), sizeInBytes(4), offset(4)
        entries += struct.pack('<BBBBHHII', w_byte, h_byte, 0, 0, 1, 32, len(data), offset)

    with output.open('wb') as f:
        f.write(header + entries + b''.join(images))

    print(f"Written {output} ({output.stat().st_size} bytes)")

if __name__ == '__main__':
    public = Path(__file__).parent.parent / 'frontend' / 'public'
    make_ico(
        [public / 'favicon-16x16.png', public / 'favicon-32x32.png'],
        public / 'favicon.ico',
    )
