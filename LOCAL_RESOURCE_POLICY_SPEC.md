# Local Resource Policy Spec

## Goal

Make local images and linked local files in Markdown intuitive for users and safe for shared environments.

The software must feel simple:

- open a Markdown file
- authorize the folder that contains it if needed
- use only resources inside that project folder

The user should not need to understand browser permission internals.

## Core Principle

A Markdown document can use:

- embedded images as `base64`
- local files relative to the document folder
- local files in subdirectories of the document folder

A Markdown document cannot use:

- paths that escape the document folder
- files in sibling folders
- files in parent folders
- arbitrary absolute local file paths

## User Mental Model

The mental model should be:

`The document can only see its own project folder.`

The user should not have to think about:

- directory handles
- browser filesystem APIs
- sandbox details
- path normalization rules

## Product Rule

If an image is not embedded as `base64`, it must live:

- in the same directory as the Markdown file, or
- in a subdirectory of that directory

This same rule applies to other linked local resources that the editor resolves from Markdown.

## UX Flow

1. The user opens a `.md` file.
2. The editor always shows the Markdown content immediately.
3. If the document contains local relative resources, the editor asks the user to authorize the folder containing the document.
4. After authorization, the editor resolves only resources inside that folder or its subdirectories.

## UX Copy

Recommended wording:

- `This document uses local images or files.`
- `To display them, select the folder that contains this document.`
- Button: `Authorize document folder`
- Help text: `Only this folder and its subfolders will be accessible.`
- Wrong folder message: `Some linked files were not found in this project folder.`
- Out-of-scope path message: `This link points outside the document folder and cannot be opened.`

Italian draft:

- `Questo documento usa immagini o file locali.`
- `Per mostrarli, seleziona la cartella che contiene questo documento.`
- Button: `Autorizza cartella del documento`
- Help text: `Saranno accessibili solo questa cartella e le sue sottocartelle.`
- Wrong folder message: `Alcuni file collegati non sono stati trovati in questa cartella progetto.`
- Out-of-scope path message: `Questo collegamento punta fuori dalla cartella del documento e non puo' essere aperto.`

## Expected Behavior

- If the document uses only `base64` images or external `https` URLs, no extra folder authorization is needed.
- If the document uses local relative resources, the editor requests access to the document folder.
- If the user does not authorize the folder, the document remains editable, but local linked resources are not resolved.
- If the user authorizes the wrong folder, the editor must fail safely and keep the document usable.

## Security Rules

Base path:

- the directory that contains the opened Markdown document

Allowed:

- `image.png`
- `images/photo.jpg`
- `assets/figures/chart.svg`
- `notes/lesson-1.md`

Blocked:

- `../shared/image.png`
- `../../secret.png`
- absolute filesystem paths
- `file:///...`
- `javascript:...`
- non-image `data:` payloads for image rendering

## Resource Resolution Rules

For image rendering:

- allow `data:image/...`
- allow `https://...`
- allow relative paths only if they resolve inside the document folder scope
- block `javascript:`
- block `file:`
- block `data:text/html`
- block relative paths that escape via `..`

For local Markdown links:

- allow relative links only if they stay inside the document folder scope
- allow external `https` links as external navigation
- block `file:` and dangerous schemes

## Image Insertion Rules

When inserting an image, the editor offers:

1. embed as `base64`
2. link as local file

If the user chooses a local linked image:

- the file must be stored in the document folder or one of its subdirectories
- the generated Markdown path must be relative to the document
- the editor must never generate absolute local paths
- the editor must never generate `file:///...`

Examples:

- `![Diagram](diagram.png)`
- `![Photo](img/photo.jpg)`

## Link Opening Rules

If a clicked link is:

- a relative Markdown link inside the allowed folder scope: open it
- a relative image or local asset inside the allowed folder scope: resolve it
- an external `https` link: open externally
- a path outside scope: block it
- a dangerous scheme: block it

## Safety Constraints

The app must normalize local paths before resolution:

- collapse repeated separators
- resolve `.` segments
- reject any path that escapes through `..`

The app must also escape untrusted values before creating DOM HTML for:

- image `src`
- `data-md-src`
- link `href`
- `data-md-href`
- captions and labels

## Failure Handling

If authorization is missing:

- show the document
- keep editing enabled
- do not render blocked local resources
- show a non-invasive message explaining what is missing

If authorization is wrong:

- keep the document usable
- show linked resources as unavailable
- avoid destructive or confusing fallback behavior

## Acceptance Criteria

1. A Markdown file with only embedded images works with no folder authorization.
2. A Markdown file with a relative image in the same folder works after authorizing the document folder.
3. A Markdown file with a relative image in a subfolder works after authorization.
4. A relative path that escapes with `..` is blocked.
5. `file:///...` image sources are blocked.
6. `javascript:` links and image sources are blocked.
7. Choosing the wrong folder does not break editing.
8. A relative Markdown link inside scope can open correctly.
9. A hostile file name cannot inject attributes or scripts into rendered figure HTML.
10. Object URLs created for local resources are revoked when appropriate.

## Test Cases

- Embedded image with `data:image/...`
- Relative image in same folder
- Relative image in nested folder
- Relative Markdown link in same folder
- Relative Markdown link in nested folder
- Path traversal attempt with `../`
- Encoded traversal attempt with `%2e%2e`
- Backslash traversal attempt
- Dangerous `javascript:` image source
- Dangerous `file:` image source
- Dangerous `data:text/html` image source
- Hostile local file name containing quotes
- Wrong authorized folder
- Close/reset cleanup of object URLs

## Open Questions

These still need product decisions:

1. If the user opens a Markdown file via drag and drop, should the behavior match `Open .md` exactly?
2. If the user authorizes a parent folder instead of the exact document folder, should that be accepted or rejected?
3. For non-Markdown local files inside scope, should the app open them, preview them, or only signal their existence?

## Implementation Reminder

The user-facing policy is not:

`First link a project folder because the browser needs it.`

The user-facing policy is:

`This document can only use files inside its own project folder.`

Folder authorization is only the technical mechanism used to enforce that rule.
