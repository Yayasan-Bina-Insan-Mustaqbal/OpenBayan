# Dashboard Redesign: VS Code-Like Workspace

## Intent

Redesign the main dashboard as an IDE-style research workspace. The dashboard should feel closer to VS Code than to a traditional web dashboard: the user arrives in a working environment with a file explorer on the left, one open work surface in the main area, and tabbed panes that can be split, resized, and targeted by file clicks.

The first experience should not be a marketing, overview, or statistics screen. It should be a usable workspace where the default open "file" is a search input page, ready for immediate research.

## Design Goals

- Make research objects feel file-based: search pages, text editor files, and slideshow previews all open as tabs.
- Support both beginner and expert workflows: visible plus buttons and dropdowns for beginners, `Ctrl+N` for fast creation.
- Make pane focus predictable: file explorer clicks always open in the active pane.
- Keep the MVP layout close to shadcn primitives already used in the project: `Sidebar`, `Tabs`, `Resizable`, `DropdownMenu`, `Tooltip`, `Button`, `ScrollArea`, and later `Command`.
- Avoid dashboard card clutter. The main screen is a full workspace, not a grid of cards.

## First-Load Layout

On dashboard arrival:

1. Left sidebar is visible.
2. Sidebar starts with utility links: `Home` and `Docs`.
3. Sidebar then shows a `Changes` section with currently open files.
4. Sidebar then shows the file explorer tree.
5. Main workspace shows one resizable pane occupying the full available editor area.
6. That pane contains a tab bar with one active tab.
7. The active tab displays the default search file.

Suggested default tab:

- Title: `Search`
- Type: `search`
- Content: centered or top-weighted search input with enough surrounding room to feel like a work surface.
- Placeholder: use concise product language, for example `Search sources, notes, and references`.

The search surface should look like an editor file, not a homepage hero. Use the tab, pane border, and file path metadata to communicate that this is a file-like workspace object.

## Sidebar Structure

Recommended order:

1. Utility links
2. Changes
3. Files

### Utility Links

Place before `Changes`.

- `Home`: returns to the public/home route.
- `Docs`: opens documentation route or external docs location.

Appearance:

- Use sidebar menu rows with icons.
- Keep the active route visually distinct.
- Do not use large buttons; these are navigation entries, not calls to action.

### Changes Section

Purpose: show currently open files, not git status.

Rules:

- Maximum visible height should fit 5 file rows.
- If more than 5 files are open, the section scrolls internally.
- Rows should mirror tab state: selected file, dirty indicator, and close affordance if added later.
- Use this as a quick open-files switcher for users who dislike horizontal tab overflow.

Appearance:

- Section label: `Changes`.
- Each row: file icon, file name, optional modified marker.
- Keep row height compact and stable.

### File Explorer

Purpose: browse user-owned files and folders.

File click behavior:

- Clicking a file opens it as a tab in the active pane.
- If the file is already open in that pane, select the existing tab.
- If the file is open in another pane, MVP should still open/select it in the active pane. Later, the app can offer "reveal existing tab" behavior.

Folder click behavior:

- Clicking the folder row toggles expand/collapse.
- Share controls should not interfere with expand/collapse.

## Share Controls In File Explorer

Every file and folder has its own share settings.

Desktop behavior:

- On hover or keyboard focus, show a share button beside the item name.
- The share button opens a share settings dialog or popover.
- If the item is currently public, the share slot is always visible as a green published indicator/button.
- Published state should not rely only on color. Add icon shape or label in tooltip, for example globe/check icon with tooltip `Public`.

Recommended row layout:

- Left: disclosure chevron for folders, file/folder icon, name.
- Right: share status/action slot.
- The right slot has a stable width so rows do not shift on hover.

Mobile limitation and later ideas:

- Hover-only share actions are not usable on touch devices.
- On mobile, expose share through a row overflow menu, long press, or details drawer.
- The mobile first version should make tapping a row open/select the item and tapping an overflow icon open item actions.
- For public items, keep a small always-visible published indicator, but make it large enough to satisfy touch target requirements if it is interactive.

## Editor Pane Model

A pane is an editor container. Each pane owns:

- `paneId`
- `openTabs`
- `activeTabId`
- `orientation` and split children if it has been split
- focus state

The workspace owns:

- `activePaneId`
- pane tree layout
- sidebar width/collapsed state
- open item registry

Active pane rules:

- The active pane is the pane where the user last clicked, focused an input, selected a tab, or typed.
- File explorer clicks open files in `activePaneId`.
- The split button splits `activePaneId`, not the whole workspace.
- Active pane should have a visible but restrained indicator.

Active pane appearance:

- Use a subtle accent border on the pane or tab bar.
- Avoid heavy glowing borders.
- The active tab and active pane are different states: the active tab is the file; the active pane is the destination for future commands.

## Tabs

Every pane has its own tab bar.

Required tab actions:

- Select tab.
- Close tab.
- Create new tab with plus button.
- Open plus dropdown for alternate new item types.

Tab appearance:

- Compact height, close to editor tabs in VS Code.
- The plus button sits beside the opened tabs.
- Close button appears on hover/focus and remains visible on the active tab.
- Dirty/unsaved state can later appear as a small dot in the close-button area.

### New File Actions

`Ctrl+N`:

- Creates a new search input page in the active pane.
- The new search page becomes active immediately.

Direct plus button press:

- Same as `Ctrl+N`.
- Creates a new search input page.

Plus dropdown:

- `New Search`
- `New Text Editor` (defined later)
- `New Slideshow Preview` (defined later)

The dropdown should use `DropdownMenu`, with the plus button as the primary direct action and a small adjacent dropdown trigger if needed. If a split-button is too complex for MVP, use one plus button that creates search on click and opens the menu on arrow click.

## Split Pane Control

Place a column/layout button in the top workspace toolbar or tab bar area.

Button behavior:

- Opens a dropdown.
- Options:
  - `Split Right`: split active pane into two horizontal side-by-side panes.
  - `Split Down`: split active pane into two vertical stacked panes.

Naming note:

- "Horizontal split" can be ambiguous. In UI labels, prefer action names: `Split Right` and `Split Down`.
- Internally, this maps to shadcn `ResizablePanelGroup` orientation:
  - `Split Right`: parent group orientation `horizontal`.
  - `Split Down`: parent group orientation `vertical`.

Split result:

- Existing active pane remains on the original side.
- New pane appears beside/below it.
- New pane becomes active.
- New pane can start with a fresh search tab or clone the current tab. MVP recommendation: fresh search tab, because it clearly gives the user a new work target.

Nested splits:

- The split button splits the active pane only.
- Represent layout as a pane tree so nested splits are possible.
- Keep a maximum split depth for MVP if needed to avoid state complexity.

## Drag And Drop Tab Analysis

Drag and drop is desirable, but it should not block the MVP.

Useful behaviors:

- Reorder tabs within the same pane.
- Move a tab from one pane to another.
- Drag a tab to an empty side of a pane to create a split.
- Drag a file from the explorer into a pane to open there.

Complexity:

- Tab reorder requires stable tab ids, pointer sensors, keyboard reordering support, and overflow behavior.
- Cross-pane movement requires a workspace-level drag model and clear active drop targets.
- Drag-to-split requires visual drop zones and pane tree mutation.
- Touch drag conflicts with scrolling and long-press context actions.

Recommendation:

- MVP: implement no drag and drop. Use click, close, plus, and split controls first.
- Phase 2: add reorder within one tab bar.
- Phase 3: add cross-pane tab movement.
- Phase 4: add drag-to-split and explorer-to-pane drop.

Preferred library:

- Use `@dnd-kit` when implementing drag and drop. It supports pointer and keyboard sensors and works better for accessible custom UI than older drag libraries.

Animation guidance:

- Keep drag feedback functional: lifted tab shadow, opacity change, insertion indicator.
- Animate transforms and opacity, not layout-heavy width/height changes.
- Honor reduced-motion preferences.

## Search File Surface

The default file content is a search input page.

MVP content:

- Search input.
- Optional source/type filters if already supported.
- Empty state below the input.
- Results area below once the search runs.

Appearance:

- The search input should be visually prominent but not hero-like.
- Use a restrained command/search style.
- Keep it aligned with editor content margins.
- Avoid enclosing the whole page in a decorative card.

States:

- Empty: ready prompt and recent searches or suggested sources.
- Loading: skeleton rows or subtle progress.
- Results: scannable list, grouped by source/type if useful.
- Error: inline error with retry action.

## Mobile Strategy

The desktop design is the primary target, but mobile should not be broken.

Mobile layout:

- Sidebar becomes a sheet/drawer.
- Main workspace shows one pane at a time.
- Split panes become switchable views or are disabled in MVP.
- Tab bar remains horizontally scrollable.
- Active pane concept becomes active view.

Mobile actions:

- File row tap opens file.
- Item actions live in an overflow menu, not hover controls.
- Share settings open in a drawer.
- Plus button remains visible in the tab bar or bottom action area.
- Keyboard shortcuts are progressive enhancement only.

## Visual Direction

Use the current shadcn semantic token system. Do not introduce a separate color system for this screen.

Recommended visual treatment:

- Dense, professional, editor-like.
- Compact rows, clear focus states, restrained borders.
- Use semantic colors: `bg-background`, `bg-muted`, `border-border`, `text-muted-foreground`, `ring-ring`.
- Published share state can use the existing success color if available; otherwise define a semantic success token before using raw green values.
- Border radius should stay small, near the current shadcn defaults.

Avoid:

- Large dashboard cards in the workspace shell.
- One-note blue/purple gradients.
- Marketing-style hero sections.
- Hover-only controls without focus-visible and mobile alternatives.

## Motion Direction

Use motion only to clarify state changes.

Good candidates:

- Folder expand/collapse.
- Tab content fade/slide on selection.
- Dropdown open/close.
- Pane activation ring or border transition.
- Share button reveal on hover/focus.
- Split pane creation with a short fade/scale or opacity transition.

Timing:

- 150-220ms for row and button feedback.
- 180-260ms for tab content and folder expansion.
- Avoid slow transitions above 400ms.

Accessibility:

- Respect reduced-motion settings.
- Keep keyboard focus visible.
- Do not make animation required to understand the state.

## Suggested State Shape

```ts
type WorkspaceItemType = "search" | "text" | "slideshow"

type WorkspaceTab = {
  id: string
  itemId: string
  title: string
  type: WorkspaceItemType
  dirty?: boolean
}

type PaneNode =
  | {
      id: string
      kind: "pane"
      openTabs: WorkspaceTab[]
      activeTabId: string
    }
  | {
      id: string
      kind: "split"
      orientation: "horizontal" | "vertical"
      children: PaneNode[]
      sizes?: number[]
    }

type WorkspaceState = {
  activePaneId: string
  root: PaneNode
  sidebarCollapsed: boolean
}
```

Implementation note:

- Keep this state in Zustand when implementation starts, because pane focus, sidebar clicks, keyboard shortcuts, and tab operations need shared access.
- Do not keep pane state only inside React component-local state once splits are introduced.

## Component Mapping

Use existing shadcn components where possible:

- Workspace shell: `SidebarProvider`, `Sidebar`, `SidebarInset`
- File explorer: `SidebarMenu`, `Collapsible`, `ScrollArea`, `Tooltip`
- Panes: `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`
- Tabs: `Tabs` for MVP, custom tab model later if shadcn tabs becomes limiting for drag/drop
- New file menu and split menu: `DropdownMenu`
- Search input: `Input` or `InputGroup` if the project has it installed
- Share settings: `Dialog` on desktop, `Drawer` on mobile when available
- Mobile sidebar: `Sheet`

Next.js boundary:

- The dashboard shell and pane interactions are client components.
- Server data loading can happen above the client workspace and pass serializable workspace data into it.
- Avoid server-only data clients inside interactive dashboard components.

## MVP Feature Checklist

- [ ] Add `Home` and `Docs` links above `Changes`.
- [ ] Rename/redefine `Changes` to show currently open files.
- [ ] Limit `Changes` visible height to 5 rows with internal scrolling.
- [ ] Add default search tab on first dashboard load.
- [ ] Add tab plus button that creates a new search tab.
- [ ] Add plus dropdown with `New Search`, `New Text Editor`, and `New Slideshow Preview`.
- [ ] Add `Ctrl+N` to create a new search tab in the active pane.
- [ ] Add active pane state and visible active pane indicator.
- [ ] Add split dropdown with `Split Right` and `Split Down`.
- [ ] Make file explorer clicks open files in the active pane.
- [ ] Add file/folder share action slot in explorer rows.
- [ ] Show public share state as an always-visible green/status indicator.
- [ ] Define mobile fallback for share actions through overflow or drawer.

## Later Feature Checklist

- [ ] Persist pane layout, open tabs, and active pane per user.
- [ ] Add tab reorder within a pane.
- [ ] Add cross-pane tab drag and drop.
- [ ] Add drag-to-split.
- [ ] Add explorer-to-pane drag open.
- [ ] Add text editor file type.
- [ ] Add slideshow preview file type.
- [ ] Add command palette actions for new file, split, close tab, and focus sidebar.
- [ ] Add dirty state, autosave state, and conflict state indicators.

## Open Decisions

- Should new split panes start with a fresh search tab or clone the current tab? MVP recommendation: fresh search tab.
- Should clicking a file already open in another pane move focus to that pane or open a second tab in the active pane? MVP recommendation: open/select in active pane for predictability.
- Should folder share settings inherit to child files or remain independent only? The UI can show per-item settings now, but backend inheritance rules need a separate decision.
- Should `Changes` mean open files permanently, or later include unsaved/modified files only? Current request says currently open files, so use that for MVP.
