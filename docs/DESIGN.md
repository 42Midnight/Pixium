# Pixium — UI Design Specification

## 1. Design Philosophy

Pixium follows a **dark-first, utilitarian aesthetic** inspired by developer tools (VS Code, terminal emulators). The interface prioritizes content density and scannability over decorative elements. Color is used sparingly and semantically — green for creation, blue for information actions, red for destruction, orange for categorization.

- **Motto**: Let the images be the color. The chrome stays out of the way.
- **Theme**: Dark-only. No light mode is implemented.
- **Typography**: System font stack — no webfonts, no custom typefaces.

---

## 2. Color Palette

All colors are defined as CSS custom properties in `src/styles/tokens.css`. The palette is built in semantic layers.

### 2.1 Background Layers

| Token | Hex | Role |
|---|---|---|
| `--bg-root` | `#121212` | Page-level background (deepest layer) |
| `--bg-surface` | `#1a1a1a` | Card and component surfaces |
| `--bg-elevated` | `#1e1e1e` | Dialogs, modals (elevated above surfaces) |
| `--bg-sidebar` | `#252525` | Sidebar panels |
| `--bg-hover` | `rgba(255,255,255,0.05)` | Subtle hover highlight |
| `--bg-overlay` | `rgba(0,0,0,0.7)` | Modal backdrop |

### 2.2 Input Elements

| Token | Hex | Role |
|---|---|---|
| `--bg-input` | `#222` | Text inputs, textareas, tag containers |
| `--bg-input-alt` | `#333` | Inner input fields within prompt items |

### 2.3 Borders

| Token | Hex | Role |
|---|---|---|
| `--border-default` | `#333` | Cards, panels, sections |
| `--border-input` | `#444` | Input element borders |
| `--border-focus` | `#555` | Focus state |

### 2.4 Semantic / Brand Colors

| Token | Hex | Role |
|---|---|---|
| `--color-success` | `#4caf50` | Primary actions: create, upload, submit, save |
| `--color-success-hover` | `#43a047` | Success button hover |
| `--color-success-dark` | `#388e3c` | Alternative success hover |
| `--color-info` | `#2196f3` | Information: download, select-all, batch-download |
| `--color-info-hover` | `#1976d2` | Info button hover |
| `--color-accent` | `#4a9eff` | Brand accent, navbar brand, delete-confirm button |
| `--color-accent-hover` | `#007acc` | Accent hover, settings radio selected, browse button |
| `--color-danger` | `#f44336` | Destructive: delete, remove |
| `--color-danger-hover` | `#d32f2f` | Danger button hover |
| `--color-warning` | `#ff9800` | Categorization: batch-move button |
| `--color-warning-hover` | `#f57c00` | Warning button hover |

### 2.5 Text Colors

| Token | Hex | Role |
|---|---|---|
| `--text-primary` | `#fff` | Headings, body text on dark backgrounds |
| `--text-secondary` | `#ccc` | Secondary descriptions |
| `--text-tertiary` | `#888` | Muted labels, icons, empty states |
| `--text-muted` | `#666` | Placeholders, hints, disabled text |

### 2.6 Additional Hardcoded Colors

These appear inline in CSS modules and are used consistently:

| Usage | Value |
|---|---|
| Title bar background | `#0d0d0d` / `rgba(51,51,51,1)` |
| Navbar background | `rgb(31, 31, 31)` |
| Context menu background | `#2a2a2a` |
| Context menu hover | `#3a3a3a` |
| Context menu active | `#4a4a4a` |
| Context menu danger item | `#ff6b6b` |
| Settings active tab | `#2d2d2d` |
| Settings sidebar border | `#3d3d3d` |
| Favorite heart filled | `#ff4081` |
| Favorite heart hover bg | `rgba(255,64,129,0.2)` |
| Remove image button | `#ff4444` (hover: `#cc0000`) |
| Tag pill background | `#3a3a3a` |
| Import button blue | `#4a90d9` (hover: `#5aa0e9`) |
| Import button orange | `#d98a4a` (hover: `#e9a06a`) |
| Success toast | bg `rgba(76,175,80,0.15)`, text `#69db7c` |
| Error toast | bg `rgba(244,67,54,0.15)`, text `#ff6b6b` |
| Window close hover | `#e81123` (Windows red) |

---

## 3. Typography

### 3.1 Font Family

The app uses the **system font stack** only:

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

Exception: `settingsPage` uses `Arial, sans-serif` (an inconsistency to be resolved).

### 3.2 Font Size Scale

| Token | Value | Typical Use |
|---|---|---|
| `--text-xs` | `11px` | Image count badges, filter labels, hints |
| `--text-sm` | `13px` | Tag pills, descriptions, batch-mode mobile |
| `--text-base` | `14px` | Body text, buttons, context menu items, inputs |
| `--text-md` | `15px` | Dialog messages, collection items |
| `--text-lg` | `16px` | Section titles, prompt field names |
| `--text-xl` | `18px` | Section headings, modal titles, empty states |
| `--text-2xl` | `22px` | Dialog titles |

Additional hardcoded sizes: `20px` (navbar brand), `24px` (cover modal icon).

### 3.3 Font Weights

| Weight | Usage |
|---|---|
| `400` | Body text, labels, descriptions |
| `500` | Buttons, tag pills, modal buttons, settings tabs |
| `600` | Dialog titles, section titles, navbar title, prompt field names |
| `700` | Navbar brand, work titles, title bar title |

---

## 4. Spacing System

| Token | Value |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |

### Common Spacing Patterns

| Context | Spacing |
|---|---|
| Dialog/modal padding | `32px` |
| Card/section padding | `24px` |
| Navbar padding | `0 24px` |
| Waterfall container padding | `20px` |
| Waterfall card margins | `28px` |
| Detail content gap | `30px` |
| Context menu item padding | `12px 20px` |
| Standard button padding | `10px 28px` |
| Compact button padding | `6px 16px` |
| Button row gap | `12px` |
| Tag pill padding | `2px 10px` (TagInput), `4px 12px` (display) |

---

## 5. Border Radius

| Token | Value | Typical Use |
|---|---|---|
| `--radius-sm` | `4px` | Checkboxes, tag pills, image index badges |
| `--radius-md` | `6px` | Compact buttons, prompt input fields, settings options |
| `--radius-lg` | `8px` | Standard buttons, modals, context menus, search input |
| `--radius-xl` | `12px` | Dialogs, cards, cover modal, sections, import/export cards |

---

## 6. Transitions

| Token | Value | Usage |
|---|---|---|
| `--transition-fast` | `0.15s ease` | Window control hover, favorite heart scaling, search clear |
| `--transition-default` | `0.2s ease` | Button backgrounds, border colors, card hover transform |

---

## 7. Component Patterns

### 7.1 Buttons

Four semantic categories, all sharing `--transition-default` for hover/active state changes:

| Category | Background | Hover | Typical Padding | Usage |
|---|---|---|---|---|
| **Glass/Ghost** | `rgba(255,255,255,0.1)` | `rgba(255,255,255,0.2)` | `10px 20px` | Cancel, Back, Copy, Clear All |
| **Success** | `#4caf50` | `#43a047` | `12px 32px` | Submit, Create, Upload, Save |
| **Info** | `#2196f3` | `#1976d2` | `8px 16px` | Download, Select-All, Cover Adjust |
| **Danger** | `#f44336` | `#d32f2f` | `10px 24px` | Delete, Remove, Confirm Delete |

Disabled state: `opacity: 0.5–0.6`, `cursor: not-allowed`.

### 7.2 Cards (WorkCard / CollectionCard)

- **Layout**: Absolute positioning for masonry waterfall (computed in JS)
- **Border radius**: `12px`
- **Cover**: Square aspect ratio (`1/1`), `object-fit: cover`
- **Hover**: `translateY(-4px)` lift (disabled in batch mode)
- **Drag**: `opacity: 0.5` while dragging start; `cursor: grab` normal, `grabbing` active
- **Selection**: `outline: 5px solid #4caf50`, `outline-offset: -5px`
- **Image count badge**: Top-right, `rgba(0,0,0,0.4)` bg
- **Favorite heart**: Bottom-right, `22px` SVG, scales `1.2x` hover, `0.95x` active
- **Selection checkbox**: Top-left, `24×24px`, `4px` radius, green when checked
- **Performance**: `content-visibility: auto` with `contain-intrinsic-size: 300px 250px`

### 7.3 Dialogs

- **Overlay**: Fixed full-viewport, `rgba(0,0,0,0.7)`, z-index 1000
- **Dialog box**: `#1e1e1e` bg, `12px` radius, `32px` padding, `max-width: 400px`, `width: 90%`
- **Title**: `22px`, weight 600, `margin-bottom: 16px`
- **Message**: `15px`, `#ccc`, `line-height: 1.6`, `margin-bottom: 28px`
- **Buttons**: Center-aligned row, `gap: 12px`
- **Dismissal**: Escape key, overlay click, or button action

### 7.4 Modals

**CoverAdjustModal:**
- Same overlay as dialogs
- Modal box: `#1e1e1e`, `12px` radius
- Header: title + close, `padding: 16px 20px`, bottom border
- Crop area: `300×300px`, `cursor: grab` (active: `grabbing`)
- Footer: confirm (success) + reset (glass) + cancel (glass)

**Template Modal:**
- `500px` wide, `max-width: 90%`, `max-height: 80vh`
- Header with title + close
- Scrollable template list with hover-highlighted items

### 7.5 Context Menu

- **Overlay**: Full-viewport transparent layer (click to dismiss), z-index 10000
- **Menu**: `#2a2a2a` bg, `8px` radius, `box-shadow: 0 4px 12px rgba(0,0,0,0.5)`, `min-width: 120px`
- **Items**: `padding: 12px 20px`, `14px`, hover: `#3a3a3a`, active: `#4a4a4a`
- **Danger items**: `#ff6b6b`, hover bg `rgba(255,107,107,0.2)`
- **Submenus**: Positioned `left: 100%`, shown on parent hover
- **Dismissal**: Click outside, Escape, or after item click

### 7.6 Tag Input

- **Container**: Flex wrap, `gap: 6px`, `padding: 6px 10px`, `#222` bg, `min-height: 38px`, `cursor: text`
- **Pills**: `inline-flex`, `padding: 2px 10px`, `4px` radius, `13px`, `#3a3a3a` bg, `#ccc` text
- **Remove**: `rgba(255,255,255,0.35)`, hover to `0.7`, `16×16px`
- **Input**: Transparent bg, no border, `14px`, inherits font

---

## 8. Layout System

### 8.1 Waterfall / Masonry

- **Container**: `max-width: 1600px`, centered, `padding: 20px`
- **Cards**: Absolute positioned with JS-computed `left`, `top`, `width`
- **Responsive columns**: 1–6 based on window width
- **Lazy rendering**: `content-visibility: auto` + `IntersectionObserver` (300px rootMargin) for background-image loading

### 8.2 Responsive Breakpoints

Used for grid-based layouts (Favorites, date groups):

| Viewport | Columns |
|---|---|
| > 1400px | 6 |
| ≤ 1400px | 5 |
| ≤ 1200px | 4 |
| ≤ 900px | 3 |
| ≤ 600px | 2 |
| ≤ 400px | 1 |

### 8.3 Detail Layout

- **Default**: Side-by-side (`display: flex`, `gap: 30px`), left: image viewer (`flex: 1`), right: prompts (`flex: 1`, `max-width: 600px`)
- **≤ 1024px**: Stacked (`flex-direction: column`)

### 8.4 Settings Layout

- **Default**: Sidebar (`240px`, fixed, `#252525` bg) + Main (`flex: 1`, `margin-left: 240px`)
- **≤ 768px**: Stacked (`flex-direction: column`)

---

## 9. Iconography

All icons are **inline SVGs** — no icon library is used.

| Icon | Usage | Size | Notes |
|---|---|---|---|
| Chevron-left | Back navigation | `24×24` | TitleBar, Detail page |
| Pin | Always-on-top toggle | `14×14` | Turns green (`#4caf50`) when active |
| Heart | Favorite | `22×22` cards, `14×14` titlebar | Filled `#ff4081` when active |
| Gear | Settings | `14×14` | |
| Minimize | Window control | `14×14` | Horizontal line |
| Maximize | Window control | `14×14` | Rectangle; two overlapping rects when maximized |
| Close | Window control | `14×14` | X (two diagonal lines) |
| Multi-image | Image count badge | `12×12` | Stacked rectangles |
| Download | Context menu, toolbar | Varies | |
| Upload | Drop zone | `48px` | |

Common styling: `stroke: #fff`, `fill: none`, `strokeWidth: 1.2–1.5`.

---

## 10. Z-Index Scale

| Layer | Z-Index |
|---|---|
| Title bar | 9999 |
| Context menu overlay | 10000 |
| Context menu | 1000 |
| Dialog/Modal overlay | 1000 |
| Zoom overlay | 2000 |
| Navbar (top) | 100 |
| Navbar (actions) | 99 |
| Batch bar | 100 |
| Search suggestions | 200 |

---

## 11. Empty & Error States

- **Empty state**: `min-height: 400px`, flexbox centered, `#888` text, `18px` font
- **Loading**: Same layout with "加载中..." text
- **No prompt**: Centered, `#666` text, `#1a1a1a` card background
- **Toasts**: Auto-dismissing notifications with `3000ms` duration
  - Success: `rgba(76,175,80,0.15)` bg, `#69db7c` text
  - Error: `rgba(244,67,54,0.15)` bg, `#ff6b6b` text

---

## 12. Scrollbar & Platform

- **Scrollbar**: No custom styling — uses platform default (dark on Windows with dark theme)
- **Selection**: Default browser selection color
- **Focus rings**: No custom `:focus-visible` styles beyond border-color changes
