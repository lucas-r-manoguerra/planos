# Accessibility Specification

## Purpose

Make the editor and docs usable by keyboard and assistive technology: keyboard
canvas navigation, implemented zoom shortcuts, correct dialog/menu behavior,
real accessible form controls, and visible focus.

## Requirements

### Requirement: accessibility-1: Keyboard canvas navigation

A selected canvas element MUST be movable with the arrow keys and resizable with
Shift+arrow keys. Each completed keyboard step MUST be undoable.

#### Scenario: Arrow keys move the selection

- GIVEN a room is selected and canvas focus is active
- WHEN the user presses ArrowRight
- THEN the room moves one step to the right

#### Scenario: No selection is a no-op

- GIVEN nothing is selected on the canvas
- WHEN the user presses an arrow key
- THEN nothing moves and no history entry is created

### Requirement: accessibility-2: Zoom shortcuts implemented

The declared zoom shortcuts (Ctrl/Cmd +/= to zoom in, Ctrl/Cmd − to zoom out,
Ctrl/Cmd + 0 to reset) MUST be functional from the editor and MUST NOT fire while
the user is typing in a text input.

#### Scenario: Shortcut zooms the canvas

- GIVEN the editor is focused
- WHEN the user presses Ctrl + =
- THEN the canvas zoom increases within the allowed range

#### Scenario: Typing is not zoomed

- GIVEN focus is inside a text input
- WHEN the user types `+`
- THEN the character is entered and the canvas zoom is unchanged

### Requirement: accessibility-3: Accessible dialogs and menus

The properties panel MUST be exposed as a modal dialog with an accessible name,
focus contained while open, and Escape to close. The context menu MUST expose
menu/menuitem semantics, support arrow-key navigation, close on Escape, and
return focus to the canvas.

#### Scenario: Focus is trapped in the dialog

- GIVEN the properties panel dialog is open
- WHEN the user presses Tab repeatedly
- THEN focus cycles within the dialog until it is closed

#### Scenario: Context menu keyboard navigation

- GIVEN the context menu is open
- WHEN the user presses ArrowDown then Escape
- THEN focus moves to the next menu item, then the menu closes and focus returns to the canvas

### Requirement: accessibility-4: Accessible select and switch controls

The select control MUST be a real accessible control (native select or combobox
with listbox semantics) with a visible label, an accessible name, and full
keyboard operation. The sun-settings switch MUST have `role="switch"` and
`aria-checked`. All icon-only buttons (docs search clear, floor and room action
buttons) MUST have accessible names and be keyboard reachable.

#### Scenario: Switch reflects state for assistive tech

- GIVEN the sun-settings switch
- WHEN it is toggled via keyboard
- THEN its state changes and `aria-checked` reflects the new value

#### Scenario: Select options selectable by keyboard

- GIVEN the select is focused
- WHEN the user opens it and navigates with arrow keys
- THEN options are announced and selectable without a mouse

### Requirement: accessibility-5: Skip link and visible focus

Every page MUST provide a skip link to main content, and all interactive
elements MUST show a visible focus indicator that is not hover-only.

#### Scenario: Skip link jumps to content

- GIVEN a keyboard user on a page
- WHEN the first Tab press reveals the skip link and it is activated
- THEN focus moves to the main content area

#### Scenario: Focus is always visible

- GIVEN focus moves to any control
- WHEN the control is inspected
- THEN it shows a visible focus ring
