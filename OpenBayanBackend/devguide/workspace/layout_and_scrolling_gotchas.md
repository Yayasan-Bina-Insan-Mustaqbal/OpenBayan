# Layout and Scrolling Gotchas

## Incident: Unscrollable ScrollArea in Workspace Shell

### Problem
A `ScrollArea` component (or any container with `overflow-auto`) fails to scroll even when content exceeds the viewport height. Instead, the entire page grows longer, and the user must scroll the browser window rather than the specific UI component.

### Root Cause
This occurs when the `ScrollArea` is nested inside a parent that has `min-h-svh` (Minimum Viewport Height) or is otherwise allowing its height to be determined by its children.

In the OpenBayan workspace:
1. `SidebarInset` uses `min-h-svh`.
2. A child `div` was set to `h-full`.
3. Because the parent (`SidebarInset`) doesn't have a fixed `max-height` or `height`, `h-full` on the child effectively means "as tall as my content pushes me."
4. The parent expands to accommodate the child's content, so the child never detects an "overflow" state, and the `ScrollArea` doesn't trigger its internal scrolling logic.

### Solution
To fix this, the container that should scroll must have a **constrained height** that is independent of its content size.

#### Approach: Calculated Viewport Height
Use a Tailwind class with a `calc` to subtract the height of headers and paddings from the total viewport height:

```tsx
// Before: Fails to scroll because parent (min-h-svh) expands
<div className="h-full">
  <ScrollArea>...</ScrollArea>
</div>

// After: Scrolls correctly because height is pinned
<div className="h-[calc(100svh-5rem)]">
  <ScrollArea>...</ScrollArea>
</div>
```

*Note: In the OpenBayan Shell, `5rem` accounts for the `h-14` (3.5rem) header and the `p-3` (0.75rem * 2 = 1.5rem) vertical padding.*

### Best Practices for IDE-like Shells
- Avoid `min-h-screen` or `min-h-svh` on the main layout wrapper if you want internal scrollbars. Use `h-svh` (exactly the viewport height) and `overflow-hidden`.
- Ensure the main content area has `flex-1` and `min-h-0` to allow it to shrink/stay constrained within a flex container.
- Always verify that the `ScrollArea` has a parent with a defined height.
