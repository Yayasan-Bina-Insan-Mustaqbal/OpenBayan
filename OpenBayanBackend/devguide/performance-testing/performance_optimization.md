# Performance Optimization Guide

This guide outlines the strategy and specific techniques for optimizing the performance of the OpenBayan web application, with a focus on the homepage and shared components.

## 1. High-Impact Optimizations

### 🚀 The `content-visibility: auto` Strategy
For sections further down the page (below-the-fold), we should apply `content-visibility: auto`. This tells the browser to skip rendering these elements until the user scrolls near them, significantly reducing initial layout and paint time.

**Implementation:**
```css
.section-below-fold {
  content-visibility: auto;
  contain-intrinsic-size: 1px 500px; /* Provides a placeholder height to avoid layout shifts */
}
```

### 📦 Dynamic Loading of "Heavy" Components
We must identify and lazy-load heavy Shadcn/Radix UI components (like Accordions, Tabs, or Dialogs) and complex sections (Pricing Tables, Maps, or Data-Heavy Grids).

**Implementation:**
Use `next/dynamic` to ensure these components are only fetched when needed.
```tsx
const PricingTable = dynamic(() => import('@/components/pricing-table'), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
  ssr: false,
})
```

### 🛠 Library Consolidation
The project currently carries redundant animation libraries. We should consolidate these to reduce bundle size:
- **Remove**: `gsap` and `tw-animate-css`.
- **Standardize**: Use `motion/react` (Framer Motion) for all UI animations.

## 2. Rendering & Animation Performance

### 🔕 Optimized Scroll Listeners
Avoid manual `onScroll` listeners that trigger React state changes on every pixel of movement. 
- **Rule**: Never use `setState` directly inside a scroll listener unless debounced or throttled.
- **Better**: Use Framer Motion's `useScroll` or `whileInView` which are highly optimized and run outside the main React render cycle where possible.

### 🧵 WebGL Efficiency (`Threads` Component)
Background WebGL animations should be paused when not visible to the user.
- **Action**: Implement an `IntersectionObserver` in the `Threads` component to call `cancelAnimationFrame` when the component is off-screen.

### 📊 Static Mermaid Diagrams
Client-side rendering of Mermaid diagrams using `beautiful-mermaid` is computationally expensive.
- **Action**: If diagrams are static, pre-render them to SVG during build-time or use a lightweight SVG-only renderer.

## 3. Infrastructure & Assets

### 🖼 Image Optimization
- Always use `next/image` for remote and local images.
- Ensure large assets like `pexels-defrinomaasy-31679265.jpg` are properly sized and compressed.

### 🔍 Bundle Analysis
Regularly run the bundle analyzer to identify bloat.
```bash
# Build with analyzer enabled
ANALYZE=true npm run build
```

## 4. Checklist for New Features
- [ ] Is this section below-the-fold? (Apply `content-visibility: auto`)
- [ ] Is this a heavy component? (Use `next/dynamic`)
- [ ] Are we adding a new animation library? (Try to use `motion/react` first)
- [ ] Are we using `onScroll`? (Use `useScroll` or throttle it)
