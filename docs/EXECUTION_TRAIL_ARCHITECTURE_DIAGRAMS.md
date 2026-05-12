# Execution Trail - Architecture & Data Flow Diagrams

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ExecutionTrail Component                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Props:                                                      │
│  ├─ rows: ExecutionTrailNode[]                             │
│  ├─ selectedRowId: string | null                           │
│  ├─ onRowSelect: (row) => void                             │
│  └─ onCanvasNodeClick?: (nodeId) => void                   │
│                                                               │
│  State:                                                      │
│  ├─ expandedRows: { [rowId: string]: boolean }             │
│  └─ rowRefs: Map<string, HTMLTableRowElement>              │
│                                                               │
│  Renders:                                                    │
│  ├─ HTML Table (2 columns)                                 │
│  ├─ Visual Guide Lines (CSS borders)                       │
│  ├─ Icons (Lucide React)                                   │
│  └─ Interactive Elements (buttons, rows)                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
CaseBundle (Input)
    ├─ stages[]
    │  └─ tasks[]
    ├─ caseDefinition
    │  └─ nodes[]
    │     ├─ type: stageGroup
    │     └─ type: stepCard
    └─ executionHistory
       └─ elementExecutions[]

         ↓

buildProcessCanvas()
    ├─ createStageNodes()
    ├─ createStepNodes()
    └─ createEdges()

         ↓

Nodes & Edges (React Flow)

         ↓

buildExecutionTrailRows()
    ├─ Extract stageNodes
    ├─ Group stepNodes by parent
    └─ Enrich with execution data
       ├─ robotJobId
       ├─ reworkedCount
       └─ status

         ↓

ExecutionTrailNode[] (Hierarchical)
[
  {
    id: 'trail-stage-1',
    label: 'Stage 1',
    kind: 'stage',
    children: [
      { id: 'trail-task-1', label: 'Task 1', kind: 'agent', ... },
      { id: 'trail-task-2', label: 'Task 2', kind: 'automation', ... }
    ]
  },
  ...
]

         ↓

ExecutionTrail Component
    ├─ renderTrailRows() [Recursive]
    │  ├─ Generate indents & guide lines
    │  ├─ Render icons & labels
    │  ├─ Show rework badges
    │  └─ Create nested rows
    └─ Handle interactions
       ├─ Toggle expansion
       ├─ Select rows
       └─ Sync with canvas

         ↓

HTML Table Output
    ├─ Hierarchical display
    ├─ Visual threading
    ├─ Status indicators
    └─ Interactive elements
```

## Component Hierarchy

```
CaseTracesTab
├─ Section: Metrics (4 MetricCards)
├─ Section: Canvas
│  ├─ ReactFlow (Process Orchestration)
│  │  ├─ StageGroupNode
│  │  ├─ StepCardNode
│  │  └─ Edges
│  └─ ExecutionTrail Component ← NEW
│     ├─ <table> with 2 columns
│     │  ├─ <thead> sticky header
│     │  └─ <tbody> recursive rows
│     │     ├─ Indent guides (threading)
│     │     ├─ Chevron toggle
│     │     ├─ Icons (status + kind)
│     │     ├─ Labels + badges
│     │     └─ Timestamp
│     └─ Variables/Incidents Panel
├─ Section: Case Details (InfoPanel)
├─ Section: Stage Trace Timeline
└─ Section: Flattened Trace Matrix
```

## Recursive Rendering Tree

```
renderTrailRows(
  rows: [Stage1, Stage2, ...],
  level: 0
)
│
├─ Stage1 Row (level 0)
│  │  ├─ No indents
│  │  ├─ Indent[0]: skip
│  │  └─ Chevron toggle
│  │
│  └─ IF expanded
│     └─ renderTrailRows(Stage1.children, level: 1)
│        │
│        ├─ Task1.1 Row (level 1)
│        │  ├─ Indent[0] with vertical line
│        │  ├─ Chevron (has children)
│        │  └─ Icons + label
│        │
│        ├─ Task1.2 Row (level 1)
│        │  ├─ Indent[0] with vertical line
│        │  ├─ Chevron (no children)
│        │  └─ Icons + label
│        │
│        └─ IF Task1.1 expanded
│           └─ renderTrailRows(Task1.1.children, level: 2)
│              │
│              └─ SubTask Row (level 2)
│                 ├─ Indent[0] & Indent[1] with lines
│                 ├─ No chevron
│                 └─ Icons + label
│
├─ Stage2 Row (level 0)
│  └─ ...similar structure...
│
└─ return [all rendered rows]
```

## Visual Guide Line Rendering

```
Level 0 (Stage):
┌─────────────────────────┐
│ ▼ 🟦 Stage Name         │ ← No indents
└─────────────────────────┘

Level 1 (Task):
┌─────────────────────────┐
│ │ ▼ 🧠 Agent Task       │ ← Indent[0] vertical line
└─────────────────────────┘
  │  (guide line drawn here)
  │  ┌─ (horizontal connector)

Level 2 (Sub-task):
┌─────────────────────────┐
│ │ │ ▼ 🔧 Tool Task      │ ← Indent[0] + Indent[1]
└─────────────────────────┘
  │ │  (guide line drawn)
  └─└─ (both connectors)

Level 3 (Detail):
┌─────────────────────────┐
│ │ │ │ ✓ Detail         │ ← Indent[0] + [1] + [2]
└─────────────────────────┘
  │ │ │  (all guides drawn)
```

## State Management Flow

```
User Clicks Row
    ↓
handleSelect(row)
    ├─ setSelectedTrailRowId(row.id)
    ├─ Update UI highlight
    └─ IF row.nodeId
       └─ onCanvasNodeClick(row.nodeId)

    ↓

Component Re-renders
    ├─ Row highlighted with blue background
    ├─ Ring border added
    └─ Auto-scroll triggered
       └─ setTimeout(() => {
            rowEl.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest'
            })
          })

    ↓

Canvas Updates (if parent syncs)
    └─ Canvas node selected
       └─ Canvas highlights node
```

## Expansion State Management

```
Initial Load:
expandedRows = { 'trail-stage-1': true, 'trail-stage-2': true, ... }
(All stages expanded by default)

User Clicks Chevron:
    ↓
handleToggle(rowId)
    ├─ setExpandedRows(prev => ({
    │     ...prev,
    │     [rowId]: !prev[rowId]
    │  }))
    └─ Component re-renders

    ↓

renderTrailRows() checks:
    if (!hasChildren || !isExpanded) {
      return [currentRow]  // Just the row
    } else {
      return [currentRow, ...childRows]  // Row + children
    }

    ↓

UI Updates:
    ├─ Chevron rotates (▼ → ▶)
    └─ Child rows appear/disappear (with animation)
```

## Icon Selection Logic

```
getRowKindIcon(kind)
    ├─ 'agent' → Brain (violet-600)
    ├─ 'trigger' → Zap (amber-500)
    ├─ 'tool' → Wrench (slate-500)
    ├─ 'automation' → Bot (blue-500)
    ├─ 'internal' → CheckCircle (slate-400)
    ├─ 'stage' → CheckCircle (blue-600)
    └─ default → Bot (blue-500)

getStatusIcon(status)
    ├─ 'complete|success' → CheckCircle (emerald-500)
    ├─ 'fail|error' → XCircle (red-500)
    ├─ 'progress|running' → Clock3 (blue-500)
    └─ 'pending|not started' → Clock3 (slate-300)
```

## Color Assignment Logic

```
determineRowColor(row)
    ├─ IF row.endedAt is null/undefined
    │  └─ THEN isInactive = true
    │     └─ Use gray colors
    ├─ IF selectedRowId === row.id
    │  └─ THEN use blue background
    │     └─ Add ring-1 ring-blue-200
    └─ ELSE
       └─ Use default colors
          └─ Show hover effect (bg-slate-50/80)
```

## Robot Job ID Enrichment

```
buildExecutionTrailRows()
    ├─ Loop through stepNodes
    └─ For each step:
       ├─ Get stepName
       ├─ Look up in execByName map
       │  ↓
       │  elementExecutions.forEach(exec => {
       │    execByName.set(exec.elementName, exec)
       │  })
       │
       ├─ IF found in map:
       │  ├─ Get externalLink or processKey
       │  └─ Extract robotJobId
       │     (last segment of path or full processKey)
       │
       └─ Assign to ExecutionTrailNode
          └─ node.robotJobId = robotJobId
```

## Rework Count Calculation

```
In buildProcessCanvas():
    ├─ For each stage:
    │  └─ For each task:
    │     ├─ Get taskName
    │     ├─ Count occurrences in runtimeTasks
    │     └─ IF count > 1:
    │        └─ reworkedCount = count - 1
    │
    └─ Store in CanvasStageTask
       └─ Pass to StepCardNodeData
          └─ Display in ExecutionTrailNode
             └─ Show in purple badge
```

## Scroll Synchronization

```
User clicks row or row is selected:
    ↓
useEffect(() => {
  if (!selectedRowId) return
  
  const rowEl = rowRefs.current[selectedRowId]
  if (rowEl) {
    setTimeout(() => {
      rowEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'  ← minimizes scroll distance
      })
    }, 0)
  }
}, [selectedRowId])

    ↓

Browser scrolls to row:
    ├─ Smooth animation
    └─ Nearest edge alignment
       (middle if needed, edge if possible)
```

## Props Propagation Chain

```
CaseTracesTab
    ├─ selectedTrailRowId (state)
    ├─ setSelectedTrailRowId (setter)
    ├─ executionTrailRows (computed)
    └─ executionRowRefs (ref)

         ↓

ExecutionTrail Component
    ├─ rows: executionTrailRows
    ├─ selectedRowId: selectedTrailRowId
    ├─ onRowSelect: (row) => setSelectedTrailRowId(row.id)
    └─ onCanvasNodeClick: (nodeId) => setSelectedCanvasNodeId(nodeId)

         ↓

Internal Handlers
    ├─ handleToggle(rowId)
    │  └─ setExpandedRows(prev => ({ ...prev, [rowId]: !prev[rowId] }))
    │
    ├─ handleSelect(row)
    │  ├─ onRowSelect(row) ← calls parent callback
    │  └─ onCanvasNodeClick(row.nodeId) ← optional sync
    │
    └─ renderTrailRows()
       ├─ expandedRows (local state)
       ├─ rowRefs (ref to all rows)
       └─ Renders all visible rows
```

---

These diagrams provide a complete visual understanding of:
- Component architecture
- Data transformations
- Rendering flow
- State management
- Event handling
- Visual design logic

Use these diagrams as reference when:
- Understanding the codebase
- Debugging issues
- Planning extensions
- Training new developers
- Documenting architecture
