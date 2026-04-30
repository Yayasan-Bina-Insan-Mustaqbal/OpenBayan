# Workspace Redesign: VS Code-Inspired Research Environment

## 1. Vision & Intent
The goal is to transform the OpenBayan workspace into a high-productivity research workspace that feels familiar to developers and power users. By adopting a "VS Code-like" interface, we provide a multi-pane, tabbed environment that allows researchers to search, analyze, and document Islamic knowledge across multiple contexts simultaneously.

## 2. Core Layout Architecture
The interface will be composed of three main sections:
1.  **Activity Bar (Narrow Left):** Static icons for Home, Docs, and Search.
2.  **Side Bar (Resizable Left):**
    -   **Explorer:** Tree view of files and folders.
    -   **Changes/Open Editors:** List of currently open tabs (max 5 items, scrollable/expandable).
3.  **Main Editor Area:**
    -   Supports horizontal and vertical splits.
    -   Each pane has its own tab bar.
    -   Resizable dividers between panes.

## 4. Key Features

### 3.1 Workspace Management
-   **Split View:** A "Column" button on the top-right allows users to:
    -   Split Active Pane Horizontally.
    -   Split Active Pane Vertically.
    -   The "Active Pane" is determined by the last click or keyboard interaction.
-   **Tab System:**
    -   Drag-and-drop support to move tabs between panes.
    -   Plus button (`+`) next to tabs:
        -   Direct click: Opens a new Search Input page.
        -   Dropdown menu: Search, Text Editor, Slideshow Preview.
    -   Keyboard Shortcut: `Ctrl+N` for a new Search page.

### 3.2 File Explorer Interaction
-   **Single Click:** Opens the file in the currently active pane.
-   **Hover Actions:** A share icon appears next to the file/folder name.
-   **Sharing Status:** If a file is public, a persistent green indicator/button is shown instead of just on hover.
-   **Mobile Note:** For mobile, hover actions will be replaced by a long-press or a dedicated "..." menu button.

### 3.3 Components
-   **Search Input Page:** The default "new file" view. High-performance search with filters.
-   **Text Editor:** Markdown-supported editor for research notes.
-   **Slideshow Preview:** Presentational view for research findings.

## 5. Visual Aesthetics & UX
-   **Active State:** The active pane will have a subtle border highlight (e.g., primary color) to distinguish it from inactive panes.
-   **Glassmorphism/Modern UI:** Use subtle blurs and shadows to create depth in the sidebar and tab bars.
-   **Animations:** Smooth transitions when splitting panes or moving tabs.

## 6. Implementation Roadmap
1.  **Phase 1: Shell & Sidebar.** Setup the basic resizable layout with the explorer.
2.  **Phase 2: Tab System & Pane Splitting.** Implement the logic for multiple panes and tab dragging.
3.  **Phase 4: View Engines.** Build the Search, Editor, and Slideshow components.
4.  **Phase 5: Social & Sharing.** Implement the share button logic and status indicators.
