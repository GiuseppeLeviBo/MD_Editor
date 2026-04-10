# Test Map

This document is the living test-design map for `MD_Editor`.

It is meant to support:

- release stabilization
- Playwright end-to-end tests
- manual exploratory sessions
- future feature planning

The goal is not to prove the absence of bugs.
The goal is to protect the most important promises of the product.

## Critical

- Startup language matches default document
- Visual editor, Markdown, and preview stay aligned for normal typing
- Unsaved changes trigger warning on tab/window close
- `Ctrl/Cmd + S` opens a single save flow, with no duplicate fallback
- `Close document` warns if the latest version is not saved
- `Clear local data` never deletes original files
- Open existing `.md` and preserve content correctly
- Save edited `.md` and reopen with the same content
- Relative local images render when the project folder is linked
- Relative local Markdown links open inside the editor

## Important

- Default language follows browser/system language
- Default document text matches the active language
- Changing language on the initial screen updates the initial document too
- Bold updates visual editor, Markdown, and preview coherently
- Italic updates visual editor, Markdown, and preview coherently
- Strikethrough toggles on and off
- Task list Markdown renders as interactive checkboxes in visual editor
- Toggling a task checkbox updates Markdown and preview coherently
- Task list can be created from selected visual blocks through the toolbar
- The whole current ordered list can become a task list from a single cursor position
- Clicking task text keeps it editable instead of toggling the checkbox
- A current task list can become bullets or numbered list without losing items
- A standard Markdown table can be created from toolbar prompts
- Table editing stays aligned between visual editor, Markdown, and preview
- Table keyboard navigation does not create accidental rows
- Block commands are disabled when the cursor is inside a table cell
- Invalid Markdown tables fall back to plain text with a clear status message
- Paragraph toggles correctly from headings, code blocks, and list items
- `H1/H2/H3` work on single-block selections
- Bullet list toggles on/off
- Ordered list toggles on/off
- Switching bullet list to ordered list keeps a valid structure
- Paste into the visual editor re-normalizes and keeps views aligned
- `Ctrl/Cmd + P` opens a printable rendered preview
- Keyboard shortcuts work on desktop without corrupting content
- Closing and reopening restores the per-tab draft correctly
- `Clear local data` resets local/session state and returns to the initial screen

## Useful

- Symbol picker inserts the selected symbol at the cursor
- Symbol picker search works in both Italian and English
- Language switch updates visible UI strings live
- Mobile mode switches correctly between Visual/Markdown/Preview
- `Write`, `Preview`, and `All` use the expected layout width
- Build badge is visible and changes with releases
- PWA shell loads correctly and updates through the service worker
- App start works both on GitHub Pages and on a local static server
- README screenshot and repository links stay valid
- Save-as suggested location behaves coherently with linked-folder state

## Exploratory

- Save into `Documents`, then try to link `Documents`
- Open a file without a linked folder, then link the folder later
- Rapid switching between list, heading, and paragraph commands
- Repeated language switching with a draft already open
- Open multiple tabs with different drafts
- Close app window, browser tab, and browser refresh in different states
- Compare installed PWA behavior with normal browser-tab behavior
- Paste large text blocks into the visual editor
- Edit mixed Markdown structures manually in the Markdown panel
- Browser-blocked popup behavior for print or save flows

## Product decisions to clarify

- Should `Open .md` and `Save as...` be disabled until a project folder is chosen?
- Is `Documents` an acceptable default save location if it cannot be linked as a project folder?
- Is the project folder a required part of the workflow or only an optional enhancement?
- Should printing remain a two-step flow by design?
- Should complex multi-line structural edits stay unsupported in visual mode, or should they become a future feature?

## Known gaps to turn into future regression tests

- Manual-selection edge cases around list-to-heading transforms may still exist and should be explored further
- Additional mixed-selection edge cases should be explored beyond the current guardrail behavior
- Multi-cell inline formatting inside tables should be explored beyond the current v1 behavior

## Tables v1

- Standard Markdown table syntax only
- Header row + separator row are required in Markdown
- Toolbar insertion asks for column count and data-row count
- Header cells start empty
- Direct cell editing is allowed in the visual editor
- `Tab`, `Shift+Tab`, and `Enter` navigate inside the table without creating rows automatically
- `Shift+Enter` is normalized as plain text, not HTML
- Inline styles are allowed in cells
- Block commands are disabled inside tables
- Images and lists inside table cells are out of scope for v1
- Invalid tables are shown as plain text with a status warning

## First Playwright targets

- Startup language matches default document
- Changing language on the initial screen updates the default document
- Bold syncs visual editor, Markdown, and preview
- Strikethrough toggles on and off
- Unordered and ordered lists toggle correctly
- Unsaved changes warn on close
- Save-as cancel does not trigger a fallback download
- Linked local Markdown files open from preview clicks
- Local images render after the project folder is linked
- Task list rendering, toggle, and toolbar creation
