import os
import sys
import shutil
import subprocess
import zipfile
import build_v2

RELEASE_DIR = "dist/SassyCam"
VERSION = "v0.0.5"
ZIP_NAME = f"SassyCam_Windows_{VERSION}.zip"

def check_gh_auth():
    """Check if GitHub CLI is authenticated."""
    try:
        subprocess.run(["gh", "auth", "status"], check=True, capture_output=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: GitHub CLI (gh) not found or not authenticated.")
        print("Please install 'gh' and run 'gh auth login'.")
        return False

def build_project():
    """Run the build script."""
    print(f"Building project version {VERSION}...")
    build_v2.build()

def create_zip():
    """Zip the release folder."""
    print(f"Zipping {RELEASE_DIR} to {ZIP_NAME}...")
    shutil.make_archive(ZIP_NAME.replace(".zip", ""), 'zip', RELEASE_DIR)
    print("Zip created.")

def create_github_release():
    """Create a release on GitHub using gh."""
    print(f"Creating GitHub release {VERSION}...")
    
    # Check if release exists
    result = subprocess.run(["gh", "release", "view", VERSION], capture_output=True)
    if result.returncode == 0:
        print(f"Release {VERSION} already exists. Uploading assets...")
        cmd = ["gh", "release", "upload", VERSION, ZIP_NAME, "--clobber"]
    else:
        print(f"Creating new release {VERSION}...")
        cmd = [
            "gh", "release", "create", VERSION, 
            ZIP_NAME,
            "--title", f"SassyCam {VERSION}",
            "--notes", "v0.0.5 Hotfix: Fixed critical startup crash (IndentationError). Includes all v0.0.4 features: Emotional Damage Mode, Stable Gemini 2.5 Flash, Dynamic Roast Length."
        ]
    
    subprocess.run(cmd, check=True)
    print("Release uploaded successfully!")

def main():
    if not check_gh_auth():
        return

    try:
        build_project()
        create_zip()
        create_github_release()
        print("All done!")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
