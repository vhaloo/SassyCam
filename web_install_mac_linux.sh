#!/usr/bin/env sh
set -eu
# Preserve previous installs, photos and settings in place.
command -v git >/dev/null 2>&1 || { printf '%s\n' 'Install Git first: https://git-scm.com'; exit 1; }
task_install_dir="$(mktemp -d "${HOME}/SassyCam-1.0.XXXXXX")"
git clone --depth 1 https://github.com/vhaloo/SassyCam.git "$task_install_dir/source"
printf 'Source checkout: %s\n' "$task_install_dir/source"
exec sh "$task_install_dir/source/install_mac_linux.sh"
