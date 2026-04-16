"""Pre-compress all compressible assets in the deploy bundle with gzip.

Creates .gz variants alongside originals so nginx gzip_static can serve
them directly with zero runtime CPU cost.
"""
import os, gzip, glob

DEPLOY_PUBLIC = os.path.join(os.path.dirname(__file__), "deploy_bundle", "public")

# Extensions worth pre-compressing (text-heavy or wasm binary)
COMPRESS_EXTS = {".html", ".css", ".js", ".json", ".wasm", ".svg",
                 ".lammpstrj", ".xyz", ".dump", ".txt", ".xml"}

def precompress():
    total_saved = 0
    compressed_count = 0
    
    for root, _dirs, files in os.walk(DEPLOY_PUBLIC):
        for fname in files:
            fpath = os.path.join(root, fname)
            ext = os.path.splitext(fname)[1].lower()
            
            if ext not in COMPRESS_EXTS:
                continue
            
            gz_path = fpath + ".gz"
            original_size = os.path.getsize(fpath)
            
            # Skip tiny files (gzip overhead not worth it)
            if original_size < 256:
                continue
            
            with open(fpath, "rb") as f_in:
                with gzip.open(gz_path, "wb", compresslevel=9) as f_out:
                    f_out.write(f_in.read())
            
            gz_size = os.path.getsize(gz_path)
            ratio = gz_size / original_size if original_size > 0 else 1.0
            saved = original_size - gz_size
            total_saved += saved
            compressed_count += 1
            
            rel = os.path.relpath(fpath, DEPLOY_PUBLIC)
            print(f"  {rel:60s}  {original_size:>10,} → {gz_size:>10,}  ({ratio:.1%})")
    
    print(f"\n  Compressed {compressed_count} files")
    print(f"  Total transfer savings: {total_saved / 1024 / 1024:.1f} MB")

if __name__ == "__main__":
    print("Pre-compressing deploy bundle assets...\n")
    precompress()
    print("\nDone.")
