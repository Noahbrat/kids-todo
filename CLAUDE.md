# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a kids' morning todo list app for a configurable set of children (set up via a first-run wizard, not hardcoded names). It has two modes:
- **Todo Mode**: Interactive mode with checkboxes for completing tasks and a reset button
- **Edit Mode**: Administrative mode for adding, editing, deleting, and reordering tasks, plus editing children's names

## Architecture

The app is split into three files:
- **`index.html`**: Page structure only (containers, modals, the setup wizard) — no embedded styles or logic
- **`styles.css`**: All styling — warm gradient background, card-based UI, test-mode banner styling
- **`script.js`**: All application logic — vanilla JS, no build step or framework
- **`config.js`** (gitignored, created from `config.example.js`): Per-deployment JSONBin credentials and app title/emoji. Falls back to defaults in `script.js` if absent.

## Key Features

### Core Functionality
- **Task Storage**: Shared array of tasks (not per-child), each with a `completed` map keyed by child id
- **Cloud Sync**: Saves/loads via JSONBin.io (`JSONBIN_BIN_ID` in `config.js`), with `localStorage` as a fallback/backup when JSONBin isn't configured or reachable
- **Mode System**: Toggle between todo/edit modes with different UI behaviors
- **Checkboxes**: Large, touch-friendly checkboxes in todo mode
- **Three-State System**: Tasks can be completed (✓), incomplete ( ), or N/A for each child
- **Setup Wizard**: First-run flow to name the children (`familyChildren`), editable later from Edit Mode

### Task Management (Edit Mode)
- **Add Tasks**: Create new tasks that appear for all children
- **Edit Tasks**: Modify task names across all children simultaneously
- **Delete Tasks**: Remove tasks from all children's lists
- **Reorder Tasks**: Up/down arrow buttons to move tasks
- **Emoji Support**: Full-screen emoji picker (`showEmojiPicker` in `script.js`) with task emojis organized by category
- **Reset Function**: Clear all checkboxes and mother's message with confirmation

### User Interface
- **Table Layout**: HTML table for reliable column alignment across children
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Touch Optimized**: Large buttons and checkboxes for iPad/mobile use
- **Mother's Message**: Freeform text area for daily messages, with history, editable in edit mode
- **Visual Feedback**: Hover effects, transitions, celebration animation on completing all tasks

## Development

Static site, no build process, package manager, or external dependencies:
- Open `index.html` directly in a browser to test changes (loads `styles.css` and `script.js`)
- Without a `config.js`, the app falls back to placeholder JSONBin credentials and runs in localStorage-only mode

### Testing and Development

**✅ SAFE AUTOMATIC LOCAL TESTING**

The app detects local/non-production environments (`isTestingEnvironment()` in `script.js`) and avoids touching production cloud data.

**How it Works**:
- Running via `file://`, `localhost`, `127.0.0.1`, or any domain other than `CONFIG.PRODUCTION_DOMAIN` counts as testing
- In test mode, data is saved to a configured `JSONBIN_TEST_BIN_ID` if present, otherwise to `localStorage` only
- Production bin is only used when `JSONBIN_TEST_BIN_ID` isn't set and the environment isn't detected as testing
- Dramatic visual warnings (red banner, modal, watermark) make test mode obvious in the UI

**Testing Setup (Zero Configuration Required)**:
1. Open `index.html` locally
2. Red "LOCAL TEST MODE" warnings appear automatically
3. Data is saved to `localStorage` (key `kidsTodoData`) unless a test bin is configured
4. Test everything normally — same code path as production, different storage

**Optional: Advanced Cloud Testing**:
1. Create a test bin at https://jsonbin.io
2. Add `JSONBIN_TEST_BIN_ID: 'your-test-bin-id'` to `config.js`
3. Same warnings, but saves to the test bin instead of localStorage

**For Playwright Testing**:
- Run tests locally — localStorage mode kicks in automatically, no setup needed

## Data Structure

Children are stored as:
```javascript
familyChildren = [
  { name: 'Ruthie', shortName: 'Ruthie', id: 'ruthie' },
  // ...
]
```

Tasks are stored as a single shared array (not one list per child):
```javascript
tasks = [
  {
    id: 'brush-teeth',
    name: 'Brush teeth',
    emoji: '🦷', // Optional emoji for the task
    completed: { ruthie: boolean|null, lily: boolean|null, /* ...one entry per child id */ }
  }
]
```

**Note**: `completed` values can be:
- `true` = task completed (✓)
- `false` = task not completed ( )
- `null` = not applicable (N/A)

## Additional Data
- `motherMessage`: String containing freeform message displayed in todo mode, editable in edit mode
- `messageHistory`: Array of previously saved messages, shown in Edit Mode
