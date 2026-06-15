#!/usr/bin/env python3
"""Build and package the Projection Law (P2) paper.

Usage:
    python build_paper.py [--figures] [--latex] [--bundle] [--all]

Steps:
1. Patch scienceplots for matplotlib >= 3.9 compatibility (one-time).
2. Regenerate figures from committed replication kit.
3. Compile projection-law.tex to PDF.
4. Produce a submission bundle (source + figures + replication pointer).
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).parent.resolve()
FIGURES = ROOT / "figures"
REPLICATION = ROOT.parent / "replication" / "error-geometry"
VENV = ROOT / ".venv-figures"
PY = VENV / "Scripts" / "python.exe" if sys.platform == "win32" else VENV / "bin" / "python"


def find_pdflatex() -> Path:
    """Locate TinyTeX / system pdflatex on Windows."""
    candidates = [
        Path.home() / "AppData" / "Local" / "TinyTeX" / "TinyTeX" / "bin" / "windows" / "pdflatex.exe",
        Path.home() / "AppData" / "Roaming" / "TinyTeX" / "bin" / "windows" / "pdflatex.exe",
    ]
    for c in candidates:
        if c.exists():
            return c
    return Path("pdflatex")


PDFLATEX = find_pdflatex()
BIBTEX = PDFLATEX.parent / "bibtex.exe" if sys.platform == "win32" else PDFLATEX.parent / "bibtex"


def run(cmd: list[str] | str, cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess:
    print(f"> {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    return subprocess.run(cmd, cwd=cwd, check=check, shell=isinstance(cmd, str))


def patch_scienceplots() -> None:
    """Make scienceplots 2.2.1 compatible with matplotlib >= 3.9."""
    if not VENV.exists():
        print("No venv found; skipping scienceplots patch.")
        return
    site = VENV / "Lib" / "site-packages" / "scienceplots"
    if not site.exists():
        return
    init = site / "__init__.py"
    discovery = site / "styles_discovery.py"

    def patch(path: Path, replacements: dict[str, str], add_import: str | None = None) -> None:
        txt = path.read_text(encoding="utf-8")
        if "matplotlib.style" in txt:
            return  # already patched
        for old, new in replacements.items():
            txt = txt.replace(old, new)
        if add_import and add_import not in txt:
            txt = txt.replace("import matplotlib.pyplot as plt", f"import matplotlib.pyplot as plt\n{add_import}")
        path.write_text(txt, encoding="utf-8")
        print(f"Patched {path.name}")

    patch(
        discovery,
        {"plt.style.core.read_style_directory": "matplotlib.style.read_style_directory"},
        "import matplotlib.style",
    )
    patch(
        init,
        {
            "plt.style.core.update_nested_dict": "matplotlib.style.update_nested_dict",
            "plt.style.core.available[:]": "matplotlib.style.available[:]",
        },
        "import matplotlib.style",
    )


def ensure_venv() -> None:
    if PY.exists():
        return
    print("Creating isolated figure environment...")
    run([sys.executable, "-m", "venv", str(VENV)], cwd=ROOT)
    run([str(PY), "-m", "pip", "install", "--upgrade", "pip"], cwd=ROOT)
    run([str(PY), "-m", "pip", "install", "-r", "requirements-figures.txt"], cwd=ROOT)
    patch_scienceplots()


def build_figures() -> None:
    ensure_venv()
    print("Regenerating figures...")
    run([str(PY), "make_figures.py"], cwd=FIGURES)
    for name in ["fig1_law_and_stack", "fig2_mlip_matrix", "fig3_acwf_matrix", "fig4_gauge_decoupling"]:
        pdf = FIGURES / f"{name}.pdf"
        png = FIGURES / f"{name}.png"
        if not pdf.exists() or not png.exists():
            raise FileNotFoundError(f"Missing figure output: {pdf} / {png}")
    print("Figures OK.")


def compile_tex(stem: str, cwd: Path) -> Path:
    """Compile a LaTeX document with bibtex and two resolution passes."""
    print(f"Compiling {stem}.tex...")
    run([str(PDFLATEX), "-interaction=nonstopmode", "-halt-on-error", f"{stem}.tex"], cwd=cwd)
    run([str(BIBTEX), stem], cwd=cwd)
    for _ in range(2):
        run([str(PDFLATEX), "-interaction=nonstopmode", "-halt-on-error", f"{stem}.tex"], cwd=cwd)
    pdf = cwd / f"{stem}.pdf"
    if not pdf.exists():
        raise FileNotFoundError(f"LaTeX compilation did not produce {pdf.name}")
    verify_pdf(pdf)
    print(f"PDF: {pdf}")
    return pdf


def build_latex() -> None:
    compile_tex("projection-law", ROOT)


def build_immi_latex() -> None:
    compile_tex("projection-law-immi", ROOT / "immi")


def verify_pdf(pdf: Path) -> None:
    try:
        from pypdf import PdfReader
    except ImportError:
        print("  (pypdf not installed; skipping PDF verification)")
        return
    reader = PdfReader(pdf)
    text = "\n".join(p.extract_text() or "" for p in reader.pages)
    if len(reader.pages) < 5:
        raise ValueError(f"PDF has only {len(reader.pages)} pages — build is broken")
    leaks = sum(text.count(x) for x in [r"\textbf", r"\noindent", r"\texttt", "$C_{"])
    if leaks:
        raise ValueError(f"PDF text layer leaked {leaks} raw-LaTeX fragments")
    print(f"  PDF verification: {len(reader.pages)} pages, 0 LaTeX leaks")


def write_replication_readme(zf: zipfile.ZipFile, prefix: str) -> None:
    readme = (
        "Replication kit (not bundled due to size):\n"
        f"  Local: {REPLICATION}\n"
        "  Public mirror: https://storage.googleapis.com/shed-489901-replication/error-geometry/v1-10c18ace/\n"
    )
    zf.writestr(f"{prefix}/REPLICATION.txt", readme)


def build_bundle() -> None:
    bundle = ROOT / "projection-law-submission-bundle.zip"
    print(f"Creating {bundle.name}...")
    with zipfile.ZipFile(bundle, "w", zipfile.ZIP_DEFLATED) as zf:
        for pat in ["*.tex", "*.bib", "*.pdf"]:
            for f in ROOT.glob(pat):
                zf.write(f, f"projection-law/{f.name}")
        for f in FIGURES.glob("*.pdf"):
            zf.write(f, f"projection-law/figures/{f.name}")
        write_replication_readme(zf, "projection-law")
    print(f"Bundle: {bundle}")


def build_immi_bundle() -> None:
    immi = ROOT / "immi"
    bundle = immi / "projection-law-immi-submission-bundle.zip"
    print(f"Creating {bundle.name}...")
    with zipfile.ZipFile(bundle, "w", zipfile.ZIP_DEFLATED) as zf:
        for pat in ["*.tex", "*.bib", "*.pdf"]:
            for f in immi.glob(pat):
                zf.write(f, f"projection-law-immi/{f.name}")
        for f in FIGURES.glob("*.pdf"):
            zf.write(f, f"projection-law-immi/figures/{f.name}")
        write_replication_readme(zf, "projection-law-immi")
    print(f"Bundle: {bundle}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Projection Law paper")
    parser.add_argument("--figures", action="store_true", help="Regenerate figures")
    parser.add_argument("--latex", action="store_true", help="Compile LaTeX")
    parser.add_argument("--bundle", action="store_true", help="Create submission bundle")
    parser.add_argument("--immi", action="store_true", help="Also compile/bundle IMMI companion")
    parser.add_argument("--patch-scienceplots", action="store_true", help="Patch scienceplots in venv")
    parser.add_argument("--all", action="store_true", help="Run figures, latex, and bundle")
    args = parser.parse_args()

    if args.patch_scienceplots:
        patch_scienceplots()
        return 0

    if args.all:
        args.figures = args.latex = args.bundle = True

    if args.figures:
        build_figures()
    if args.latex:
        build_latex()
        if args.immi:
            build_immi_latex()
    if args.bundle:
        build_bundle()
        if args.immi:
            build_immi_bundle()

    if not any([args.figures, args.latex, args.bundle, args.patch_scienceplots]):
        parser.print_help()
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
