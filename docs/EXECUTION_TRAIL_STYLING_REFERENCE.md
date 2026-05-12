# ExecutionTrail Component - CSS & Styling Reference

## Tailwind CSS Classes Used

### Table Structure
```css
table.w-full.text-sm.border-collapse

thead.sticky.top-0.bg-white.z-10.border-b-2.border-slate-200

tbody
  tr.border-t.border-slate-100
    tr:hover.bg-slate-50/80
    tr.bg-blue-50.ring-1.ring-inset.ring-blue-200
```

### Column Headers
```css
th.px-3.py-3.text-left
  span.text-[10px].font-black.uppercase.tracking-widest.text-slate-400
```

### Row Cells
```css
td.px-3.py-2.5
td.px-3.py-2.5.text-right
```

### Indentation & Threading
```css
/* Indent container */
div.flex.shrink-0.items-stretch
  style={{ width: level * 18 }}

/* Indent unit */
span.shrink-0.relative
  style={{ width: 18, position: 'relative' }}

/* Vertical guide line */
span.absolute.left-[8px].top-[-12px].bottom-[-12px]
  .border-l-2.border-slate-200

/* Horizontal connector */
span.absolute.left-[8px].top-[50%].w-[10px]
  .border-t-2.border-slate-200
```

### Chevron Button
```css
button.text-slate-400.hover:text-slate-600.transition-colors
  
/* Expanded */
div.w-4.flex.items-center.justify-center.mt-0.5

/* Gap spacing */
div.flex.items-start.gap-1.5
```

### Icons
```css
/* Status icon */
div.shrink-0.mt-0.5
  CheckCircle: .text-emerald-500
  XCircle: .text-red-500
  Clock3.text-slate-300 (inactive)
  Clock3.text-blue-500 (in progress)

/* Kind icon */
div.shrink-0.mt-0.5
  Brain: .text-violet-600
  Zap: .text-amber-500
  Wrench: .text-slate-500
  Bot: .text-blue-500
  CheckCircle: .text-blue-600 (stage)
  
  /* Inactive versions */
  .text-slate-300 (all when inactive)
```

### Label & Badges
```css
/* Main label */
span.text-[12px].font-bold.leading-tight
  /* Active */ .text-slate-800
  /* Inactive */ .text-slate-400

/* Rework badge */
span.inline-flex.items-center.rounded-full
  .bg-purple-50.border.border-purple-200
  .px-1.5.py-0.5.text-[9px].font-bold.text-purple-700
  .whitespace-nowrap.leading-none

/* Sub-label (Robot Job ID) */
p.text-[10px].text-slate-400.font-medium
  .mt-0.5.truncate
```

### Timestamps
```css
span.text-[11px]
  /* Active */ .text-slate-500
  /* Inactive */ .text-slate-300
```

## Color Values

### Status Indicators
```
Complete:    #10b981 (emerald-500)
Error:       #ef4444 (red-500)
In Progress: #3b82f6 (blue-500)
Pending:     #cbd5e1 (slate-300)
```

### Row Kind Icons
```
Agent:       #7c3aed (violet-600)
Trigger:     #f59e0b (amber-500)
Tool:        #64748b (slate-500)
Automation:  #3b82f6 (blue-500)
Stage:       #2563eb (blue-600)
Inactive:    #cbd5e1 (slate-300)
```

### Rework Badge
```
Background:  #faf5ff (purple-50)
Border:      #e9d5ff (purple-200)
Text:        #7c3aed (purple-700)
```

### Background & Borders
```
White:       #ffffff
Gray (bg):   #f1f5f9 (slate-50)
Gray (alt):  #f8fafc (slate-50) - used for disabled
Blue (sel):  #eff6ff (blue-50)
Blue (ring): #bfdbfe (blue-200)

Border:      #e2e8f0 (slate-200)
Border (light): #f1f5f9 (slate-100)
Border (hover): varies by state
```

### Text Colors
```
Primary:     #1e293b (slate-900)
Secondary:   #475569 (slate-700)
Tertiary:    #64748b (slate-500)
Muted:       #94a3b8 (slate-400)
Disabled:    #cbd5e1 (slate-300)
```

## Spacing & Layout

### Padding
```
Row padding:    py-2.5 px-3
Header padding: py-3 px-3
Badge padding:  px-1.5 py-0.5

Standard:       py-2 px-2
Compact:        py-1 px-1.5
Loose:          py-4 px-4
```

### Gaps
```
Icon gap:       gap-1.5
Flex gap:       gap-1.5
Badge gap:      gap-0.5
```

### Sizing
```
Icon:           size-13 or size-14 or size-16
Indent unit:    18px
Guide line pos: left-[8px]
Connector:      w-[10px]
Row height:     auto (content based)
```

### Borders
```
Thin:           border or border-l-2 or border-t-2
Thick:          border-2
Style:          solid (default)
Color:          border-slate-200 (primary)
Color (light):  border-slate-100 (dividers)
Color (alt):    border-blue-200 (selected)
```

## Typography

### Font Sizes
```
Header:         text-[10px]
Label:          text-[12px]
Subtitle:       text-[10px]
Time:           text-[11px]
Badge:          text-[9px]
```

### Font Weight
```
Header:         font-black (900)
Labels:         font-bold (700)
Subtitle:       font-medium (500)
Links:          font-bold (700)
```

### Text Styling
```
Header:         uppercase tracking-widest
Label:          normal case
Badge:          uppercase tracking-widest
Links:          underline on hover
```

### Line Heights
```
Default:        line-height: auto
Tight:          leading-tight
Normal:         leading-none (badges)
```

## Transitions & Animations

### Hover States
```css
button:hover {
  color: #475569;        /* slate-600 */
  transition-property: color;
  transition-duration: 0.2s;
}

tr:hover {
  background-color: #f8fafc;  /* slate-50/80 */
  transition-property: background-color;
  transition-duration: 0.2s;
}
```

### Selected State
```css
tr.bg-blue-50.ring-1.ring-inset.ring-blue-200 {
  background-color: #eff6ff;  /* blue-50 */
  box-shadow: inset 0 0 0 1px #bfdbfe;  /* ring-blue-200 */
}
```

### Scroll Behavior
```javascript
scrollIntoView({
  behavior: 'smooth',
  block: 'nearest'
})
```

## Responsive Design

### Breakpoints
```
Mobile:  < 640px (single column)
Tablet:  640px - 1024px (lg breakpoint)
Desktop: > 1024px (two columns)

Grid:    grid-cols-1 lg:grid-cols-2
```

## Overflow & Truncation

### Text Truncation
```css
Robot Job ID:  truncate max-w-[200px]
Element ID:    truncate
Label:         break-words (for multiline)
```

### Scroll Areas
```css
Container:     overflow-x-auto
Row container: overflow-y-auto
Header:        sticky top-0 z-10 bg-white
```

## Z-Index

```
Sticky header:  z-10
Modal/overlay:  z-20 (default)
Normal:         z-0
```

## Accessibility Classes

```
/* Screen reader only */
sr-only

/* Focus visible */
focus:ring-2.focus:ring-offset-2

/* Hover states */
hover:bg-slate-50/80
hover:text-slate-600

/* Active/selected */
ring-1.ring-inset.ring-blue-200
```

## Custom Styling Guide

### To Override Row Colors
```css
/* In your component */
tr.bg-custom {
  background-color: your-color;
}

tr.bg-custom:hover {
  background-color: your-hover-color;
}
```

### To Change Icon Colors
```tsx
// Modify getRowKindIcon or getStatusIcon functions
// Pass custom className prop
className={`text-your-color`}
```

### To Adjust Spacing
```tsx
// Modify these values:
const indentWidth = 18;  // pixels per level
const rowPaddingY = 2.5; // units
const rowPaddingX = 3;   // units
```

## Dark Mode Support (Future)

To add dark mode, add these class mappings:

```
Light Mode          Dark Mode
─────────────────────────────
bg-white           → bg-slate-900
text-slate-900     → text-white
border-slate-200   → border-slate-700
bg-blue-50         → bg-blue-900
text-slate-400     → text-slate-500
```

## Performance Notes

- **Hardware Rendering**: Use `transform: translateZ(0)` for sticky headers
- **Repaints**: Minimize with careful use of `will-change`
- **Border Rendering**: Thin borders (1-2px) render efficiently
- **Color Opacity**: Using rgba is less efficient than hex

## Print Styles (Optional)

```css
@media print {
  tr.bg-blue-50 {
    background-color: white;
    border: 2px solid #bfdbfe;
  }
  
  tbody tr:not(:last-child) {
    page-break-inside: avoid;
  }
}
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Sticky | ✅ | ✅ | ✅ | ✅ |
| Grid | ✅ | ✅ | ✅ | ✅ |
| Flex | ✅ | ✅ | ✅ | ✅ |
| Transform | ✅ | ✅ | ✅ | ✅ |
| ScrollIntoView | ✅ | ✅ | ✅ | ✅ |

## References

- **Tailwind CSS**: https://tailwindcss.com/docs
- **Lucide React Icons**: https://lucide.dev
- **CSS Grid**: https://developer.mozilla.org/en-US/docs/Web/CSS/grid
- **Flexbox**: https://developer.mozilla.org/en-US/docs/Web/CSS/flex
