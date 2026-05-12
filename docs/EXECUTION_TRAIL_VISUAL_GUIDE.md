# Hierarchical Execution Trail - Visual Reference Guide

## Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Hierarchical Execution Trail                               │
├─────────────────────────────────────────────────────────────┤
│ Status & Step                          │ Ended At           │
├─────────────────────────────────────────────────────────────┤
│ ✓ Stage 1: Application Review          │ 2024-03-30 10:30  │
│ > 🧠 Agent: Document Analysis          │ —                 │
│   ├─ Bot Job 57f9d89f...               │                   │
│   └─ [Reworked x2]                     │                   │
│   ⚡ Trigger: Manual Review            │ —                 │
│ ✓ Stage 2: Loan Officer Decision       │ 2024-03-30 11:00  │
│   ✓ 🧠 Agent: Risk Assessment          │ 2024-03-30 10:50  │
│   │  └─ Bot Job a8d2c45e...            │                   │
│   ✓ 🔧 Tool: Credit Check              │ 2024-03-30 10:52  │
└─────────────────────────────────────────────────────────────┘
```

## Visual Threading Example

```
Stage Header (Level 0)
│
├─ Step 1 (Level 1)
│  ├─ Sub-event 1 (Level 2)
│  │  └─ Detail 1 (Level 3)
│  └─ Sub-event 2 (Level 2)
│
└─ Step 2 (Level 1)
   └─ Sub-event 1 (Level 2)
```

## Icon Legend

| Icon | Type | Color | Meaning |
|------|------|-------|---------|
| 🧠 | Agent | Violet | AI/LLM Process |
| ⚡ | Trigger | Amber | Event Trigger |
| 🔧 | Tool | Slate | Tool Integration |
| 🤖 | Automation | Blue | RPA Process |
| ✓ | Stage | Blue | Process Stage |

## Status Icon Legend

| Icon | Status | Meaning |
|------|--------|---------|
| ✓ | Complete | Successfully finished |
| ✗ | Error | Failed/Error occurred |
| ⏱ | In Progress | Currently running |
| ⏰ | Pending | Not started yet (gray) |

## Rework Badge Example

```
┌───────────────────────────────┐
│ ✓ Agent: Document Review      │
│ ┌──────────────────────────┐  │
│ │ Reworked ×2              │◄─┤ Purple pill badge
│ │ bg-purple-50             │  │ 
│ │ text-purple-700          │  │
│ └──────────────────────────┘  │
│ Bot Job 57f9d89f...           │◄─ Sub-label in gray
└───────────────────────────────┘
```

## Interactive States

### Default Row
```
┌─────────────────────────────────────────────┐
│ > 🧠 Agent: Process                         │
│ ┌─────────────────────────────────┐         │
│ │ Robot Job abc123...             │ 10:30   │
│ └─────────────────────────────────┘         │
└─────────────────────────────────────────────┘
```

### Hovered Row
```
┌─────────────────────────────────────────────┐
│ > 🧠 Agent: Process                         │ ← bg-slate-50/80
│ ┌─────────────────────────────────┐         │
│ │ Robot Job abc123...             │ 10:30   │
│ └─────────────────────────────────┘         │
└─────────────────────────────────────────────┘
```

### Selected Row
```
┌─────────────────────────────────────────────┐
│ > 🧠 Agent: Process                         │ ← bg-blue-50
│ ┌─────────────────────────────────┐         │   ring-1 ring-blue-200
│ │ Robot Job abc123...             │ 10:30   │
│ └─────────────────────────────────┘         │
└─────────────────────────────────────────────┘
```

## Collapsible Behavior

### Expanded (Default)
```
▼ Stage 1
  ├─ Agent: Process A
  └─ Bot: Process B
```

### Collapsed
```
▶ Stage 1
  (hidden)
```

## Robot Job ID Display

```
✓ 🤖 Automation Step
   Robot Job 57f9d89f-1234-5678-9abc-def012345678
   └─ gray, muted, truncated if needed
```

## Empty State

```
┌─────────────────────────────────────────────┐
│ ○ No execution trail data available         │
│   (dashed border, centered text)            │
└─────────────────────────────────────────────┘
```

## Inactive Steps (Not Started)

```
⏰ ⚪ Agent: Review Process                    │ —
   Robot Job (not executed)
```

- Gray icons instead of colored
- "—" instead of timestamp
- Muted text color (text-slate-400)

## Canvas Click-to-Sync Flow

```
User clicks Step in Canvas
         ↓
Step Node highlighted in blue
         ↓
Matching row in Execution Trail located
         ↓
Selected row scrolled into view (smooth)
         ↓
Row highlighted with blue background & ring
         ↓
Variables scoped to selected element
```

## Nesting Depth Example

```
Level 0: Stage Header
         ├─ Level 1: Step
         │  ├─ Level 2: Sub-event
         │  │  └─ Level 3: Detail
         │  └─ Level 2: Sub-event
         └─ Level 1: Step
            └─ Level 2: Sub-event
```

## Responsive Layout

```
Desktop (≥1024px):
┌───────────────────────────────────────────────────┐
│ Execution Trail (left) │ Details & Variables (right)│
└───────────────────────────────────────────────────┘

Mobile/Tablet (<1024px):
┌─────────────────────────────────────────────────┐
│ Execution Trail (full width)                    │
├─────────────────────────────────────────────────┤
│ Details & Variables (full width)                │
└─────────────────────────────────────────────────┘
```

## Performance Characteristics

- **Rendering**: O(n) where n = total nodes
- **Expansion**: O(1) state toggle
- **Selection**: O(n) tree search (cached)
- **Scroll**: Optimized with `scrollIntoView()` + `block: nearest`
- **Memory**: Minimal state management (only expanded rows map)

## Color Palette Reference

```
Status Colors:
├─ Complete: #10b981 (emerald-500)
├─ Error: #ef4444 (red-500)
├─ In Progress: #3b82f6 (blue-500)
└─ Pending: #cbd5e1 (slate-300)

Type Colors:
├─ Agent: #7c3aed (violet-600)
├─ Trigger: #f59e0b (amber-500)
├─ Tool: #64748b (slate-500)
├─ Automation: #3b82f6 (blue-500)
└─ Stage: #2563eb (blue-600)

UI Colors:
├─ Background: #ffffff (white)
├─ Border: #e2e8f0 (slate-200)
├─ Hover: #f8fafc (slate-50)
├─ Selected: #eff6ff (blue-50)
├─ Rework Badge: #faf5ff (purple-50)
└─ Text: #1e293b (slate-900)
```

## Accessibility Features

- ✅ Semantic HTML table structure
- ✅ Proper heading hierarchy
- ✅ Color not sole indicator of status (icons used)
- ✅ Keyboard-friendly (click handlers on buttons)
- ✅ ARIA attributes on expandable buttons
- ✅ Sufficient color contrast ratios
- ✅ Readable font sizes (min 12px)

## Animation Specifications

- Smooth scroll: `behavior: 'smooth'`
- Scroll block: `block: 'nearest'`
- Hover transitions: `transition-colors`
- Toggle transitions: `transition-all`
- Duration: CSS defaults (150-200ms)
