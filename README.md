# Markdown WYSIWYG Editor

A lightweight Markdown/WYSIWYG editor that started as a single self-contained HTML file and later gained optional PWA support for installation, offline shell caching, and file handling where supported.

Web app: [https://giuseppelevibo.github.io/MD_Editor/](https://giuseppelevibo.github.io/MD_Editor/)

## Features

- Visual editor, Markdown source, and live HTML preview
- Single-page app with no runtime dependencies
- Open and edit `.md` files
- Link a project folder to resolve relative images and local assets
- Insert uploaded images directly into Markdown
- Special symbols and emoji picker
- Italian and English interface
- Installable PWA shell on supported browsers

## Recommended workflow for Markdown files with local images

1. Click `Link folder`.
2. Select the project folder or the folder that contains the Markdown file.
3. Click `Open .md`.
4. Open the Markdown document you want to edit.

If the browser supports it, the file picker will try to reopen from the linked folder.

## Notes about `Documents`

Some browsers treat special system folders such as `Documents` differently from normal folders.

- Opening and saving files in `Documents` may work.
- Linking `Documents` itself as a project folder may be blocked by the browser.
- Subfolders inside `Documents` usually work correctly and are the recommended choice.

This behavior comes from browser security rules, not from the editor itself.

## Privacy reset

`Clear local data` removes:

- the current draft stored in the browser
- saved interface preferences such as language and view mode
- local editor state for the current workstation/browser profile

It does not delete the original Markdown files on disk, inside the project folder, or on a USB drive.

## PWA support

The repository includes:

- `manifest.json`
- `sw.js`
- SVG icons for the installed app shell

File Handling API support depends on the browser and operating system. Chromium-based browsers generally offer the best support, especially after the app is installed.

## Development

This project is intentionally simple and easy to inspect. Most of the application still lives in `index.html`, with a small set of extra files required by the PWA layer.
