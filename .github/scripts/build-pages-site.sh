#!/usr/bin/env bash
# Builds the GitHub Pages site: main in the site root and a preview copy of a
# development branch in dev/. Every deployment replaces the whole site, so both
# copies are rebuilt each time.
#
# Run from the repository root after fetching all branches. Environment:
#   SITE_DIR        output folder (default: _site)
#   PREVIEW_BRANCH  branch to publish in dev/; when empty, the most recently
#                   updated claude/* branch, or main if there is none
set -euo pipefail

site_dir="${SITE_DIR:-_site}"
preview_dir="$site_dir/dev"
production_ref="origin/main"

preview_branch="${PREVIEW_BRANCH:-}"
if [ -z "$preview_branch" ]; then
  preview_branch="$(git for-each-ref --sort=-committerdate --count=1 \
    --format='%(refname:lstrip=3)' refs/remotes/origin/claude)"
fi
preview_branch="${preview_branch:-main}"
preview_ref="origin/$preview_branch"

rm -rf "$site_dir"
mkdir -p "$preview_dir"
git archive "$production_ref" | tar -x -C "$site_dir"
git archive "$preview_ref" | tar -x -C "$preview_dir"

production_commit="$(git rev-parse --short=7 "$production_ref^{commit}")"
preview_commit="$(git rev-parse --short=7 "$preview_ref^{commit}")"

# Mark the copy in dev/ as a preview: the app then keeps its data apart from
# the published app (same origin), shows "preview" next to the version, and
# installs as a separate app. A branch older than v0.66.2 has no channel
# marker and would share data with the published app, so it is not published.
if python3 - "$preview_dir" "$preview_branch" "$preview_commit" <<'PY'
import html
import json
import sys
from pathlib import Path

preview_dir, branch, commit = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
index_path = preview_dir / "index.html"
marker = '<meta name="md-editor-channel" content="production">'
page = index_path.read_text(encoding="utf-8")
if marker not in page:
    sys.exit(1)
page = page.replace(
    marker,
    '<meta name="md-editor-channel" content="preview"'
    f' data-commit="{html.escape(commit)}" data-branch="{html.escape(branch)}">\n'
    '  <meta name="robots" content="noindex">',
    1,
)
index_path.write_text(page, encoding="utf-8")

manifest_path = preview_dir / "manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
# The app id is resolved against the origin, not the manifest folder: with the
# published app's "./" both copies would be the same app for the browser, and
# visiting one would rename and redirect the installed other one.
manifest["id"] = "md-editor-preview"
manifest["name"] = f'{manifest["name"]} (preview)'
manifest["short_name"] = "MD Preview"
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY
then
  preview_status="published in dev/"
else
  rm -rf "$preview_dir"
  preview_status="not published: the branch has no preview channel marker"
  echo "::warning::$preview_branch ($preview_commit) $preview_status"
fi

summary="${GITHUB_STEP_SUMMARY:-/dev/null}"
{
  echo "### GitHub Pages site"
  echo
  echo "| Copy | Source | Commit |"
  echo "| --- | --- | --- |"
  echo "| Published app (root) | main | $production_commit |"
  echo "| Preview (dev/) | $preview_branch | $preview_commit — $preview_status |"
} >> "$summary"
echo "Production: main@$production_commit; preview: $preview_branch@$preview_commit ($preview_status)"
