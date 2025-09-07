# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a single-file HTML application for managing kids' morning todo lists. The app allows tracking tasks for three children (Ruthie, Lily, and Allie) with two modes:
- **Todo Mode**: Interactive mode with checkboxes for completing tasks and a reset button
- **Edit Mode**: Administrative mode for adding, editing, deleting, and reordering tasks

## Architecture

The entire application is contained in `index.html`:
- **HTML Structure**: Container with mode buttons, person tabs, and dynamic task list
- **CSS**: Embedded styles with a warm gradient background and modern card-based UI
- **JavaScript**: Vanilla JS with in-memory task storage and DOM manipulation

## Key Features

### Core Functionality
- **Task Storage**: In-memory JavaScript object with shared tasks across all children
- **Mode System**: Toggle between todo/edit modes with different UI behaviors
- **Checkboxes**: Large, touch-friendly checkboxes in todo mode (30px with 2x scale)
- **Three-State System**: Tasks can be completed (✓), incomplete ( ), or N/A for each child

### Task Management (Edit Mode)
- **Add Tasks**: Create new tasks that appear for all children
- **Edit Tasks**: Modify task names across all children simultaneously
- **Delete Tasks**: Remove tasks from all children's lists
- **Reorder Tasks**: Up/down arrow buttons to move tasks (replaced drag-and-drop for better mobile compatibility)
- **Emoji Support**: Full-screen emoji picker with 90+ task-related emojis organized by category
- **Reset Function**: Clear all checkboxes and mother's message with confirmation

### User Interface
- **Table Layout**: Reliable alignment using HTML tables instead of flexbox
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Touch Optimized**: Large buttons and checkboxes for iPad/mobile use
- **Mother's Message**: Freeform text area for daily messages from parents
- **Visual Feedback**: Hover effects, transitions, and modern styling

## Development

Since this is a static HTML file, development is straightforward:
- Open `index.html` directly in a browser to test changes
- No build process, package managers, or external dependencies
- All code is self-contained in a single file

## Data Structure

Tasks are stored as:
```javascript
{
  person: [
    { 
      name: 'Task name',
      emoji: '📝', // Optional emoji for the task
      completed: { ruthie: boolean|null, lily: boolean|null, allie: boolean|null } 
    }
  ]
}
```

**Note**: `completed` values can be:
- `true` = task completed (✓)
- `false` = task not completed ( )
- `null` = not applicable (N/A)

## Additional Data
- `motherMessage`: String containing freeform message displayed in todo mode, editable in edit mode