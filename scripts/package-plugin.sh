#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="$(sed -n 's/^ \* Version: *//p' "$root_dir/animations-for-blocks.php" | head -n 1)"
plugin_dir="animations-for-blocks"
output_dir="$root_dir/dist"
archive="$output_dir/$plugin_dir-$version.zip"
staging_dir="$(mktemp -d)"

cleanup() {
	rm -rf "$staging_dir"
}
trap cleanup EXIT

if [[ -z "$version" ]]; then
	echo "Could not read the plugin version from animations-for-blocks.php." >&2
	exit 1
fi

mkdir -p "$output_dir" "$staging_dir/$plugin_dir"
cp "$root_dir/animations-for-blocks.php" "$root_dir/LICENSE" "$root_dir/readme.txt" "$staging_dir/$plugin_dir/"
cp -R "$root_dir/build" "$root_dir/includes" "$root_dir/licenses" "$staging_dir/$plugin_dir/"
find "$staging_dir" -name '.DS_Store' -delete

rm -f "$archive"
(cd "$staging_dir" && zip -qr "$archive" "$plugin_dir")

archive_files="$(unzip -Z1 "$archive")"
for required in \
	"$plugin_dir/animations-for-blocks.php" \
	"$plugin_dir/build/aos.js" \
	"$plugin_dir/build/init.js" \
	"$plugin_dir/build/blocks/animation-container/block.json" \
	"$plugin_dir/includes/cli.php" \
	"$plugin_dir/licenses/aos.txt" \
	"$plugin_dir/LICENSE" \
	"$plugin_dir/readme.txt"; do
	if ! grep -Fqx "$required" <<<"$archive_files"; then
		echo "Production archive is missing required file: $required" >&2
		exit 1
	fi
done

if grep -Eq '(^|/)(src|tests|docs|patches|tasks|node_modules)/|(^|/)(package\.json|pnpm-lock\.yaml|AGENTS\.md|README\.md)$' <<<"$archive_files"; then
	echo "Production archive contains development-only files." >&2
	exit 1
fi

echo "Created $archive"
