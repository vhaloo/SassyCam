"""Lightweight compatibility launcher for SassyCam 1.0. No AI imports at startup."""
from pathlib import Path
import argparse
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description="SassyCam 1.0")
    parser.add_argument("--legacy", action="store_true", help="Run the preserved Qt interface")
    parser.add_argument("--web", action="store_true", help="Serve the studio on 127.0.0.1:4174")
    parser.add_argument("--version", action="version", version="SassyCam 1.0.0")
    args = parser.parse_args()
    if args.legacy:
        from legacy_main import main as legacy
        legacy()
        return
    node = shutil.which("node")
    if not node:
        parser.exit(1, "Install Node.js 22.13+ or use the standalone SassyCam package.\n")
    target = ROOT / "server" / "local.mjs" if args.web else ROOT / "node_modules" / "electron" / "cli.js"
    if not target.exists() or not (ROOT / "dist" / "index.html").exists():
        parser.exit(1, "Run install_windows.bat or install_mac_linux.sh first. Original data is preserved.\n")
    command = [node, str(target)] + ([] if args.web else [str(ROOT)])
    sys.exit(subprocess.call(command, cwd=ROOT))


if __name__ == "__main__":
    main()
