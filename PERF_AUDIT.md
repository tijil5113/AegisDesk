# Desktop OS UI — Performance Audit

**Goal:** Feel like a real OS (60fps shell, no jank), not a website. Preserve visual identity.

---

## 1. Critical path (above-the-fold)

| Layer | Decision | Rationale |
|-------|----------|-----------|
| **CSS load order** | glass-system → main → motion-system → perf → polish (then lazy rest) | Tokens and containment must exist before layout; motion tokens before any animation. |
| **Script load** | All `defer`; storage/os-store before app-registry; performance-manager early; desktop + window-manager before app scripts | No render-blocking JS; state and shell ready before apps. |
| **Boot** | One-time animation, then overlay hidden + `display:none` after transition | Avoids ongoing cost of a large overlay in the tree. |
| **Launcher** | Single class `.visible` toggle; no innerHTML on open/close | Compositor-only transition; no reflow. |
| **Clock** | Cached refs to `#time-display` / `#date-display`; only `textContent` updated | No re-render of desktop/launcher; minimal DOM touch. |

---

## 2. Bottlenecks identified and fixes

### 2.1 Tooltip system (high impact)

- **Before:** MutationObserver on `document.body` (subtree) → on any DOM change, `querySelectorAll` + 4 listeners per element. Caused thundering herd on dynamic content.
- **After:** Single delegated `mouseenter`/`mouseleave`/`focusin`/`focusout` on `document.body`; resolve tooltip text from `data-tooltip`, `title`, or `aria-label` on event target. No MutationObserver, no per-element listeners.
- **Comment in code:** Inline in `tooltip-system.js`.

### 2.2 Window manager

- **Duplicate resize:** Per-window `window.addEventListener('resize')` does not fire for viewport resize (the listener is on the window *div*, not the global). Viewport resize is already handled in constructor. Removed per-window resize; kept single debounced global resize.
- **focusWindow:** Uses inline `zIndex` + classList toggles. Kept as-is (batched by browser); documented that active window gets highest zIndex for correct stacking.
- **Comment in code:** Inline in `window-manager.js`.

### 2.3 Global click listeners

- **Before:** One `document` click for launcher outside-close; one for power menu outside-close.
- **After:** Single `document` click handler (in desktop.js) that closes launcher and power menu when click is outside both. Power menu inline script only keeps button toggle and item handlers.
- **Rationale:** Fewer listeners, one place for “close overlays on outside click”.

### 2.4 Parallax

- **Already:** Passive mousemove, throttled (200ms), rAF loop at ~30fps, CSS vars `--parallax-x`/`--parallax-y` and `--mouse-x`/`--mouse-y`. Disabled when `prefers-reduced-motion` or low cores/memory.
- **No change.** Documented in this audit.

### 2.5 Script count

- **Observation:** 40+ defer scripts increase parse/compile time. Batching would require a build step.
- **Decision:** Keep current set; load order and comments document critical path. Future: single “shell” bundle (desktop, window-manager, performance-manager, theme, search, launcher) and one “apps” bundle.

---

## 3. CSS and layout

| Rule | Decision |
|------|----------|
| **Containment** | Taskbar, launcher scroll, app tiles, windows-container use `contain: layout style paint` (or `layout style`) to limit reflow/repaint. No `contain: strict` to avoid overflow bugs. |
| **GPU** | `will-change: transform` only on hover for tiles/icons; taskbar and apps-menu get `translateZ(0)` for open/close. No blanket will-change. |
| **Transitions** | Only `transform` and `opacity` in transition lists (motion-system tokens). No `transition: all`; no animating `width`/`height`/`top`/`left`/`box-shadow`. |
| **Blur** | `--glass-blur` ≤12px; performance-mode and prefers-reduced-transparency set `backdrop-filter: none`. |
| **Universal selector** | `* { margin: 0; padding: 0; box-sizing: border-box }` only; no `* { transition }`. |

---

## 4. Inline documentation

- **desktop.js:** File header and key functions (clock, launcher, taskbar, search) document no re-render, single class, delegation, debounce.
- **window-manager.js:** Resize strategy, z-index strategy, and “one global resize” documented.
- **performance-manager.js:** Performance mode and storage key documented.
- **tooltip-system.js:** Delegation approach and why MutationObserver was removed.
- **main.css / perf-desktop.css / motion-system.css:** Short comments on containment, tokens, and reduced-motion.

---

## 5. Preserved visual identity

- Glassmorphism (blur, borders, shadows) unchanged; only tuned via tokens and performance-mode.
- Motion durations and easings (motion-system) unchanged.
- Spacing and depth (desktop-polish) unchanged.
- No removal of visuals; only removal of redundant listeners, duplicate logic, and heavy patterns (MutationObserver + N listeners).

---

## 6. Checklist for future changes

- [ ] New animations: transform/opacity only; use motion-system tokens; max 220ms micro, 320ms modal.
- [ ] New overlays: single class toggle; no innerHTML on open/close.
- [ ] New “hover tooltips”: prefer CSS `title` or delegated JS; avoid per-element listeners + MutationObserver.
- [ ] New scroll regions: add `contain: paint` (and layout where safe) and passive listeners if needed.
- [ ] New global listeners: prefer one delegated handler over many direct listeners.
