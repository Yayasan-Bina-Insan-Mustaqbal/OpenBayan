# Development Guideline: Hybrid Web & Desktop IDE

This document outlines the architecture, data flow, and integration strategies for the Omni-Storage Hybrid IDE. It explains how Vite, React, Shadcn, Zustand, BlockNote, Reveal.js (with Chalkboard), **FastAPI + SurrealDB**, and Tauri work together in a single codebase.

## 1. The Technology Stack & Responsibilities

Every tool in this stack has a strict, isolated responsibility. Keeping these boundaries intact is crucial for maintaining the "Omni-Storage" capabilities (running on both Web and Desktop).

*   **Vite + React**: The application shell and build tool. Compiles into static files (`/dist`) for both Nginx (Web) and Tauri (Desktop).
*   **Zustand**: The "Brain." It manages global state (auth status, active tabs, open files, layout toggles) without prop-drilling.
*   **Shadcn UI + Tailwind CSS**: The visual layer. Specifically, the Resizable component handles the complex math of dragging and splitting the 3-pane IDE layout.
*   **BlockNote**: The authoring engine. It sits inside a Shadcn pane and translates user typing into a structured JSON array.
*   **Reveal.js + Chalkboard Plugin**: The presentation engine. It consumes data and renders it as fullscreen slides with a drawable canvas overlay.
*   **FastAPI + SurrealDB**: The Cloud backend. FastAPI handles business logic, authentication (integrating with NextAuth), and data orchestration, while SurrealDB provides multi-model remote storage for the Web version.
*   **Tauri**: The Desktop wrapper. Provides access to the native OS file system (`@tauri-apps/api/fs`) for true offline, local-first editing.

## 2. Codebase Directory Structure

To keep the project organized, adopt a feature-based or domain-based folder structure:

/src
  /assets           # Global CSS, images, Reveal.js themes
  /components
    /ui             # Auto-generated Shadcn components (button, resizable, sheet)
    /ide            # Custom IDE layout components (Sidebar, EditorPane, Splitter)
    /presentation   # Reveal.js wrapper components
  /store
    useIdeStore.ts  # Zustand state management
  /services
    StorageService.ts # The Omni-Storage abstraction (Cloud vs. Local routing)
  /utils
    parser.ts       # Converts BlockNote JSON -> Reveal.js HTML slides
  App.tsx           # Main entry point, sets up routing/layout

## 3. Data Flow & Connection Map

Here is the exact lifecycle of how data moves between these different libraries:

### A. Opening a File (Zustand + Shadcn)
1.  User clicks a file in the Sidebar (built with standard React + Tailwind).
2.  The `onClick` event calls `useIdeStore.getState().openFile(file)`.
3.  Zustand updates the global state.
4.  The `EditorPane` (sitting inside a Shadcn `ResizablePanel`) is subscribed to Zustand. It detects the new file and passes the JSON content to BlockNote.

### B. Editing and Auto-Saving (BlockNote + StorageService)
1.  User types in BlockNote.
2.  BlockNote's `onChange` event triggers a debounced function.
3.  The function extracts the latest JSON: `const json = editor.document`.
4.  The function calls `StorageService.autoSaveDocument(fileId, json, target)`.
5.  **The Omni-Storage Split:**
    *   If `isTauri()`, the service writes the JSON to the native hard drive using Tauri's FS API.
    *   If **Web + Cloud**, the service sends a request to the **FastAPI backend**, which persists the data in **SurrealDB**.

### C. Presenting the File (BlockNote -> Reveal.js)
This is the trickiest integration. BlockNote produces JSON, but Reveal.js expects HTML `<section>` tags.
1.  User clicks "Present".
2.  You pass the BlockNote JSON to a utility function (`utils/parser.ts`).
3.  The parser converts the BlockNote blocks into HTML strings (e.g., separating H1 blocks into new Reveal.js `<section>` slides).
4.  Reveal.js mounts, reading the generated HTML.

### D. Drawing on the Slides (Reveal.js + Chalkboard)
1.  User draws on the Reveal.js slide using the Chalkboard plugin.
2.  The Chalkboard plugin holds this vector data in its own memory object.
3.  You listen to native DOM events (like `mouseup` on the chalkboard canvas).
4.  You extract the drawing data: `const drawings = RevealChalkboard.getData()`.
5.  You pass this data to `StorageService.saveAnnotations(fileId, drawings)`.
    *(Note: Keep text content and drawing annotations as separate columns/files to avoid massive payloads on every keystroke).*

## 4. Development Guidelines & Rules

To prevent the web app from breaking when compiled to a desktop app (and vice versa), adhere strictly to these rules:

*   **Rule 1: No Direct Backend/Database Calls in Components**
    Never import your backend client (FastAPI fetchers or SurrealDB drivers) directly into a React component like `<EditorPane />`. If you do, Tauri offline mode will crash. Always route data operations through `StorageService.ts` so the environment checks (`isTauri()`) can decide where the data goes.
*   **Rule 2: Zustand is the Single Source of Truth for UI**
    Do not use `useState` for anything that affects the layout (like `isSidebarOpen`). If you use local state, the "Toggle Sidebar" button inside the EditorPane won't be able to communicate with the Sidebar component. Put it in Zustand.
*   **Rule 3: Guard Browser-Specific APIs**
    If you need to use `window.showSaveFilePicker()` (for web local downloads) or `window.__TAURI__`, always wrap them in `try/catch` and environment checks.
*   **Rule 4: Isolate Reveal.js**
    Reveal.js is an older, non-React library that heavily mutates the DOM. Do not try to render Reveal.js inside the Shadcn Resizable panes if possible. When the user clicks "Present", it is best to mount Reveal.js in a fullscreen React Portal or a completely separate Route that hides the IDE layout entirely. This prevents React and Reveal.js from fighting over DOM control.

## 5. Typical Developer Workflow

*   **To run the Web Version (Development):**
    ```bash
    npm run dev
    # Vite starts at localhost:5173. FastAPI will connect to your SurrealDB instance.
    ```
*   **To run the Desktop Version (Development):**
    ```bash
    npm run tauri dev
    # Compiles Vite, launches a native window. isTauri() evaluates to true.
    ```
*   **To build for Production:**
    ```bash
    npm run build       # Builds the static web files (for Docker/Nginx)
    npm run tauri build # Compiles the .exe (Windows) or .dmg (Mac) installers
    ```
