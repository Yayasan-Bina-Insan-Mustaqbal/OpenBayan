# Dashboard Browsing Mode Architecture

*Bismillahir Rahmanir Rahim.*

This document outlines the architectural strategy for separating the OpenBayan authenticated experience into two distinct modes: **Browsing Mode** (content discovery and reading) and **Workspace Mode** (deep research and editing). This separation of concerns improves UX, performance, and development scalability.

## 1. Strategic Intent (UX Designer)

Jumping a user directly into a complex, IDE-style workspace immediately after login can be overwhelming, especially for users who just want to read a shared *Sahifah* or see what's trending. 

By separating the experience, we create a progressive disclosure of complexity:
1. **Browsing Mode (Default)**: A familiar, feed-like or grid-like interface for discovering content. Optimized for reading, searching, and quick actions.
2. **Workspace Mode (Opt-in/Deep Dive)**: The VS Code-style editor for heavy research, multi-document comparison, and content creation.

### Mobile-First Implications
On mobile, the Workspace Mode (multi-pane IDE) is physically constrained. Browsing Mode acts as the primary mobile experience, where the sidebar hides behind a hamburger menu (`SidebarTrigger`) and content is stacked vertically.

## 2. Next.js App Router Architecture

To achieve the requirements—SSR for browsing, Client-Side Rendering (CSR) for the editor—we must leverage Next.js App Router boundaries carefully.

### 2.1 Route Structure & Rendering Strategies

We should separate the routes to allow optimal code-splitting and rendering strategies.

```text
app/
├── (authenticated)/
│   ├── dashboard/                # BROWSING MODE (Server Components)
│   │   ├── layout.tsx            # Contains SidebarProvider, Sidebar, and TopNav
│   │   ├── page.tsx              # Home: Trending, Shared, Recent Sahifah
│   │   ├── search/page.tsx       # Search results
│   │   └── sahifah/[id]/page.tsx # Reading a specific Sahifah
│   │
│   └── workspace/                # EDITOR MODE (Client Components)
│       ├── layout.tsx            # Full-screen shell, no standard top-nav
│       └── page.tsx              # The VS Code-style IDE interface
```

### 2.2 Browsing Mode (Server-Side Rendered)

The `app/dashboard/*` routes will be built primarily with **React Server Components (RSC)**.

**Why?**
- **Performance**: Fetching lists of Sahifah directly on the server reduces client-side JavaScript payload.
- **Data Patterns**: We can use `async/await` directly in the components to fetch data from SurrealDB.
- **Suspense**: We can stream UI using `<Suspense fallback={<CardSkeleton />}>` while data fetches.

**Implementation Pattern:**
```tsx
// app/(authenticated)/dashboard/page.tsx
import { Suspense } from "react"
import { SearchInput } from "@/components/search-input" // Client component for interaction
import { SahifahGrid, SahifahGridSkeleton } from "@/components/sahifah-grid"

export default async function DashboardBrowsingPage() {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      {/* Search acts as the entry point */}
      <section className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-4">Discover OpenBayan</h1>
        <SearchInput placeholder="Search sources, notes, and references..." />
      </section>

      {/* Streaming sections */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Sahifah</h2>
        <Suspense fallback={<SahifahGridSkeleton />}>
          <SahifahGrid type="recent" />
        </Suspense>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Trending</h2>
        <Suspense fallback={<SahifahGridSkeleton />}>
          <SahifahGrid type="trending" />
        </Suspense>
      </section>
    </div>
  )
}
```

### 2.3 Workspace Mode (Client-Side Rendered Shell)

The IDE workspace relies heavily on window dimensions, `localStorage` (for pane persistence), and complex interactive state (Zustand). This cannot and should not be SSR'd.

**Implementation Pattern:**
We use `next/dynamic` with `ssr: false` to completely opt the heavy IDE shell out of server-side rendering. This prevents hydration errors and reduces server load.

```tsx
// app/(authenticated)/workspace/page.tsx
import dynamic from "next/dynamic"
import { WorkspaceSkeleton } from "@/components/workspace/skeleton"

// Dynamically import the heavy client workspace, disabling SSR
const IdeWorkspace = dynamic(
  () => import("@/components/workspace/ide-shell"),
  { 
    ssr: false,
    loading: () => <WorkspaceSkeleton /> 
  }
)

export default function WorkspacePage() {
  // The layout here should be a full height h-screen w-screen container
  return <IdeWorkspace />
}
```

## 3. Component System & shadcn/ui (Design System Architect)

We will use different compositional patterns based on the mode.

### 3.1 Browsing Mode UI Components
- **Layout**: `SidebarProvider`, `Sidebar`, `SidebarInset`
- **Cards**: Use the full `Card` composition (`CardHeader`, `CardTitle`, `CardContent`) to display Sahifah previews.
- **Search**: `InputGroup` with a search icon (following shadcn rules: no raw `div` groupings for inputs).
- **Navigation**: The sidebar will use `SidebarGroup` and `SidebarMenu`. On mobile, the `SidebarTrigger` (hamburger) will automatically handle sliding the sidebar in.

### 3.2 State Management Separation
- **Browsing State**: Handled primarily by the URL (e.g., `?q=searchterm`) and Next.js Router caching. Use `useSearchParams` and Server Actions for mutations.
- **Workspace State**: Handled strictly by Zustand. The workspace state (active tabs, split panes) lives in client memory and `localStorage`.

## 4. Bridging the Two Modes

How does a user move between Browsing and Workspace?

1. **From Browse to Edit**: When a user clicks "Edit" on a Sahifah in the browsing mode, they are navigated to the workspace:
   `router.push('/workspace?open=sahifah-123')`
2. **Workspace Bootstrapping**: The client-side `IdeWorkspace` component reads the URL parameter on mount, dispatches an action to its Zustand store to open that specific tab, and cleans the URL.
3. **From Edit to Browse**: The Workspace Sidebar will contain a prominent "Back to Dashboard" or "Home" utility link that navigates back to `/dashboard`.

## Summary of Next.js Best Practices Applied
1. **RSC Boundaries**: Pushing 'use client' down to the interactive leaves in Browsing mode, while isolating the massive CSR application to its own route segment (`/workspace`).
2. **Data Patterns**: Using Server Components to eliminate waterfalls when fetching multiple categories of Sahifah on the dashboard.
3. **Streaming**: Utilizing Suspense boundaries for independent data fetching blocks.
4. **Hydration Safety**: Using `next/dynamic { ssr: false }` for the `window`-dependent Resizable panes and Zustand state in the Workspace mode.
