# ExecutionTrail Component - Usage Guide

## Basic Usage

### Import the Component

```tsx
import { ExecutionTrail, type ExecutionTrailNode } from '../../../components/UI/ExecutionTrail';
```

### Basic Example

```tsx
import { useState } from 'react';
import { ExecutionTrail } from '../../../components/UI/ExecutionTrail';

export function MyComponent() {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const executionData: ExecutionTrailNode[] = [
    {
      id: 'trail-stage-1',
      nodeId: 'stage-1',
      stageId: 'stage-1',
      label: 'Application Review',
      status: 'Complete',
      kind: 'stage',
      endedAt: '2024-03-30T10:30:00Z',
      children: [
        {
          id: 'trail-step-1',
          nodeId: 'task-1',
          stageId: 'stage-1',
          taskId: 'task-1',
          label: 'Document Analysis',
          status: 'Complete',
          kind: 'agent',
          endedAt: '2024-03-30T10:20:00Z',
          robotJobId: '57f9d89f-1234-5678',
          reworkedCount: 2,
        },
        {
          id: 'trail-step-2',
          nodeId: 'task-2',
          stageId: 'stage-1',
          taskId: 'task-2',
          label: 'Manual Review',
          status: 'Pending',
          kind: 'trigger',
          endedAt: undefined,
        },
      ],
    },
  ];

  return (
    <div className="bg-white rounded-lg border p-4">
      <ExecutionTrail
        rows={executionData}
        selectedRowId={selectedRowId}
        onRowSelect={(row) => {
          setSelectedRowId(row.id);
          console.log('Selected:', row);
        }}
      />
    </div>
  );
}
```

## Advanced Usage

### With Canvas Synchronization

```tsx
import { useState } from 'react';
import { ExecutionTrail, type ExecutionTrailNode } from '../../../components/UI/ExecutionTrail';
import { useReactFlow } from 'reactflow';

export function ExecutionTrailWithCanvas() {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { setCenter, fitView } = useReactFlow();

  const executionData: ExecutionTrailNode[] = [
    // ... your data
  ];

  const handleRowSelect = (row: ExecutionTrailNode) => {
    setSelectedRowId(row.id);
    
    if (row.nodeId) {
      // Optionally synchronize with canvas
      // const node = getNodeById(row.nodeId);
      // fitView({ nodes: [node] });
    }
  };

  const handleCanvasNodeClick = (nodeId: string) => {
    // Find matching execution trail row
    // setSelectedRowId(findMatchingRowId(nodeId));
  };

  return (
    <ExecutionTrail
      rows={executionData}
      selectedRowId={selectedRowId}
      onRowSelect={handleRowSelect}
      onCanvasNodeClick={handleCanvasNodeClick}
    />
  );
}
```

## Data Structure Examples

### Simple Two-Level Hierarchy

```tsx
const simpleData: ExecutionTrailNode[] = [
  {
    id: 'stage-1',
    label: 'Payment Processing',
    status: 'Complete',
    kind: 'stage',
    endedAt: '2024-03-30T15:00:00Z',
    children: [
      {
        id: 'task-1',
        label: 'Validate Payment',
        status: 'Complete',
        kind: 'automation',
        endedAt: '2024-03-30T14:55:00Z',
        robotJobId: 'job-123',
      },
    ],
  },
];
```

### Complex Three-Level Hierarchy

```tsx
const complexData: ExecutionTrailNode[] = [
  {
    id: 'stage-1',
    label: 'Application Processing',
    status: 'Complete',
    kind: 'stage',
    endedAt: '2024-03-30T16:00:00Z',
    children: [
      {
        id: 'agent-1',
        label: 'Initial Assessment',
        status: 'Complete',
        kind: 'agent',
        endedAt: '2024-03-30T15:30:00Z',
        reworkedCount: 1,
        children: [
          {
            id: 'tool-1',
            label: 'Credit Check',
            status: 'Complete',
            kind: 'tool',
            endedAt: '2024-03-30T15:25:00Z',
          },
          {
            id: 'tool-2',
            label: 'Identity Verification',
            status: 'Complete',
            kind: 'tool',
            endedAt: '2024-03-30T15:28:00Z',
          },
        ],
      },
      {
        id: 'trigger-1',
        label: 'Manager Approval',
        status: 'In Progress',
        kind: 'trigger',
        endedAt: undefined,
      },
    ],
  },
];
```

### With Rework Indicators

```tsx
const reworkData: ExecutionTrailNode[] = [
  {
    id: 'stage-1',
    label: 'Document Review',
    status: 'Complete',
    kind: 'stage',
    endedAt: '2024-03-30T17:00:00Z',
    children: [
      {
        id: 'task-1',
        label: 'OCR Processing',
        status: 'Complete',
        kind: 'automation',
        endedAt: '2024-03-30T16:50:00Z',
        robotJobId: 'job-456',
        reworkedCount: 3, // Document was processed 3 times
      },
    ],
  },
];
```

### With Various Statuses

```tsx
const mixedStatusData: ExecutionTrailNode[] = [
  {
    id: 'stage-1',
    label: 'Workflow Stage',
    status: 'In Progress',
    kind: 'stage',
    children: [
      {
        id: 'task-1',
        label: 'Completed Task',
        status: 'Complete',
        kind: 'automation',
        endedAt: '2024-03-30T10:00:00Z',
      },
      {
        id: 'task-2',
        label: 'Failed Task',
        status: 'Failed',
        kind: 'agent',
        endedAt: '2024-03-30T10:15:00Z',
      },
      {
        id: 'task-3',
        label: 'In Progress Task',
        status: 'In Progress',
        kind: 'automation',
        robotJobId: 'job-789',
      },
      {
        id: 'task-4',
        label: 'Pending Task',
        status: 'Pending',
        kind: 'trigger',
      },
    ],
  },
];
```

## Integration with CaseTracesTab

The component is already integrated in `CaseTracesTab.tsx`. The data flows from the process orchestration canvas:

```tsx
// In CaseTracesTab.tsx
const executionTrailRows = useMemo(
  () => buildExecutionTrailRows(
    orchestrationCanvas.nodes,
    caseBundle?.executionHistory?.elementExecutions ?? [],
  ),
  [orchestrationCanvas.nodes, caseBundle?.executionHistory?.elementExecutions],
);

// Render the component
<ExecutionTrail
  rows={executionTrailRows}
  selectedRowId={selectedTrailRowId}
  onRowSelect={(row) => {
    setSelectedTrailRowId(row.id);
    // Additional logic...
  }}
  onCanvasNodeClick={(nodeId) => {
    setSelectedCanvasNodeId(nodeId);
  }}
/>
```

## Styling & Theming

### Using with Tailwind CSS

The component uses Tailwind utility classes. Ensure your `tailwind.config.js` includes the UI components directory:

```js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  // ... rest of config
};
```

### Custom Styling

Wrap the component in a container with custom styles:

```tsx
<div className="custom-execution-trail-container">
  <ExecutionTrail
    rows={data}
    selectedRowId={selectedId}
    onRowSelect={handleSelect}
  />
</div>

<style>{`
  .custom-execution-trail-container {
    font-family: 'Courier New', monospace;
  }
  .custom-execution-trail-container table {
    border-collapse: collapse;
  }
`}</style>
```

## Event Handling

### Row Selection Events

```tsx
const handleRowSelect = (row: ExecutionTrailNode) => {
  // Access row data
  console.log('Selected row:', {
    id: row.id,
    label: row.label,
    status: row.status,
    kind: row.kind,
    isStage: row.kind === 'stage',
    hasChildren: !!row.children?.length,
  });

  // Perform actions based on row type
  if (row.kind === 'stage') {
    // Handle stage selection
    loadStageDetails(row.stageId!);
  } else if (row.kind === 'automation') {
    // Handle automation task selection
    loadRobotJobDetails(row.robotJobId!);
  }
};
```

### Canvas Node Selection

```tsx
const handleCanvasNodeClick = (nodeId: string) => {
  console.log('Canvas node clicked:', nodeId);
  
  // Synchronize with canvas
  // Find and highlight the corresponding row
  // Scroll to row
  // Update UI accordingly
};
```

## Type Safety

### ExecutionTrailNode Interface

```tsx
export interface ExecutionTrailNode {
  id: string;                          // Unique identifier
  nodeId?: string;                     // Canvas node reference
  stageId?: string;                    // Parent stage ID
  taskId?: string;                     // Task ID in definition
  definitionElementId?: string;        // Element ID in case definition
  label: string;                       // Display name
  status: string;                      // Current status
  endedAt?: string;                    // Completion timestamp (ISO 8601)
  kind: ExecutionTrailRowKind;         // Type of row
  children?: ExecutionTrailNode[];     // Nested sub-events
  synthetic?: boolean;                 // Auto-generated row flag
  robotJobId?: string;                 // Robot Job ID for automation
  reworkedCount?: number;              // Rework count
}
```

### ExecutionTrailRowKind Union

```tsx
type ExecutionTrailRowKind = 
  | 'stage'       // Process stage container
  | 'agent'       // AI/LLM agent
  | 'automation'  // RPA automation
  | 'trigger'     // Event trigger
  | 'tool'        // Tool integration
  | 'internal';   // Internal process
```

## Performance Optimization

### Large Datasets

For large execution trails (100+ nodes), consider:

```tsx
// Virtualization with react-window
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={executionTrailRows.length}
  itemSize={35}
>
  {ExecutionTrailRow}
</FixedSizeList>
```

### Memoization

```tsx
const memoizedRows = useMemo(
  () => executionTrailRows,
  [executionTrailRows],
);

const memoizedSelectedId = useMemo(
  () => selectedTrailRowId,
  [selectedTrailRowId],
);
```

## Accessibility

The component includes:
- Semantic HTML table structure
- ARIA attributes on expandable buttons
- Keyboard navigation support
- High contrast colors for status indicators
- Screen reader friendly labels

## Debugging

### Console Logging

```tsx
const handleRowSelect = (row: ExecutionTrailNode) => {
  console.group('ExecutionTrail - Row Selected');
  console.log('Row ID:', row.id);
  console.log('Label:', row.label);
  console.log('Status:', row.status);
  console.log('Kind:', row.kind);
  console.log('Reworked Count:', row.reworkedCount);
  console.log('Robot Job ID:', row.robotJobId);
  console.log('Has Children:', !!row.children?.length);
  if (row.children?.length) {
    console.log('Children:', row.children);
  }
  console.groupEnd();
};
```

### Browser DevTools

1. Open React DevTools
2. Select `<ExecutionTrail>` component
3. Inspect props in the right panel
4. Check state in hooks

## Troubleshooting

### Rows Not Expanding

- Ensure `children` array is not empty
- Check that parent row has `children` property
- Verify chevron onClick handler is working

### Styles Not Applied

- Check Tailwind CSS is configured correctly
- Ensure CSS file is imported
- Clear build cache: `rm -rf .next node_modules/.cache`

### Scroll Not Working

- Verify `scrollIntoView` is supported in target browsers
- Check parent container has `overflow-y-auto`
- Ensure row ref is correctly set

### Performance Issues

- Reduce number of rows in initial view
- Use virtualization for large lists
- Memoize row data with `useMemo`
- Profile with React DevTools Profiler

## Examples Repository

See `/EXECUTION_TRAIL_IMPLEMENTATION.md` for architecture details.
See `/EXECUTION_TRAIL_VISUAL_GUIDE.md` for visual specifications.
