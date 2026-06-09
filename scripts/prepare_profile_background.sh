#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/licensed-vcg-image" >&2
  exit 64
fi

source_image=$1
repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
target_image="$repo_root/images/profile-bg-medtech.jpg"

if [[ ! -f "$source_image" ]]; then
  echo "Source image not found: $source_image" >&2
  exit 66
fi

if ! command -v sips >/dev/null 2>&1; then
  echo "This script needs macOS sips to resize and convert the licensed image." >&2
  exit 69
fi

tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT

tmp_image="$tmp_dir/profile-bg-medtech.jpg"
backup_image="$repo_root/images/profile-bg-medtech.previous.jpg"

width=$(sips -g pixelWidth "$source_image" 2>/dev/null | awk '/pixelWidth/ {print $2; exit}')
if [[ -z "${width:-}" ]]; then
  echo "Could not read image width. Is this a supported image file?" >&2
  exit 65
fi

cp "$source_image" "$tmp_image"

if [[ "$width" -gt 2400 ]]; then
  sips --resampleWidth 2400 "$tmp_image" >/dev/null
fi

sips --setProperty format jpeg --setProperty formatOptions 82 "$tmp_image" --out "$tmp_image.converted" >/dev/null

if [[ -f "$target_image" ]]; then
  cp "$target_image" "$backup_image"
fi

mv "$tmp_image.converted" "$target_image"

echo "Updated $target_image"
if [[ -f "$backup_image" ]]; then
  echo "Backup saved at $backup_image"
fi
echo "Remember: commit this file only if the source is a licensed VCG download."
