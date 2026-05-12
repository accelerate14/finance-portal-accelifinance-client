import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  Clock3, 
  Brain, 
  Bot, 
  Zap, 
  Wrench 
} from 'lucide-react';

/**
 * Type definitions for the hierarchical execution trail
 */
export type ExecutionTrailRowKind = 'stage' | 'agent' | 'automation' | 'trigger' | 'tool' | 'internal';

export interface ExecutionTrailNode {
  id: string;
  nodeId?: string;
  stageId?: string;
  taskId?: string;
  definitionElementId?: string;
  label: string;
  status: string;
  endedAt?: string;
  kind: ExecutionTrailRowKind;
  children?: ExecutionTrailNode[];
  synthetic?: boolean;
  robotJobId?: string;
  reworkedCount?: number;
  duration?: string;
}

interface ExecutionTrailProps {
  rows: ExecutionTrailNode[];
  selectedRowId: string | null;
  onRowSelect: (row: ExecutionTrailNode) => void;
  onCanvasNodeClick?: (nodeId: string) => void;
}

/**
 * Utility: Format date-time for display
 */
function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

/**
 * Utility: Get icon based on row kind
 */
function getRowKindIcon(kind: ExecutionTrailRowKind, inactive?: boolean): React.ReactNode {
  const iconProps = { size: 14, className: inactive ? 'text-slate-300' : '' };
  
  switch (kind) {
    case 'agent':
      return <Brain {...iconProps} className={inactive ? 'text-slate-300' : 'text-violet-600'} />;
    case 'trigger':
      return <Zap {...iconProps} className={inactive ? 'text-slate-300' : 'text-amber-500'} />;
    case 'tool':
      return <Wrench {...iconProps} className={inactive ? 'text-slate-300' : 'text-slate-500'} />;
    case 'automation':
      return <Bot {...iconProps} className={inactive ? 'text-slate-300' : 'text-blue-500'} />;
    case 'internal':
      return <CheckCircle {...iconProps} className={inactive ? 'text-slate-300' : 'text-slate-400'} />;
    case 'stage':
      return <CheckCircle {...iconProps} className={inactive ? 'text-slate-300' : 'text-blue-600'} />;
    default:
      return <Bot {...iconProps} className={inactive ? 'text-slate-300' : 'text-blue-500'} />;
  }
}

/**
 * Utility: Get status indicator icon
 */
function getStatusIcon(status: string, inactive?: boolean): React.ReactNode {
  const normalized = String(status || '').toLowerCase();
  
  if (inactive || normalized === 'pending' || normalized === 'not started') {
    return <Clock3 size={13} className="text-slate-300" />;
  }
  if (normalized.includes('complete') || normalized.includes('success')) {
    return <CheckCircle size={13} className="text-emerald-500" />;
  }
  if (normalized.includes('fail') || normalized.includes('error')) {
    return <XCircle size={13} className="text-red-500" />;
  }
  if (normalized.includes('progress') || normalized.includes('running') || normalized.includes('active')) {
    return <Clock3 size={13} className="text-blue-500" />;
  }
  return <Clock3 size={13} className="text-slate-300" />;
}

/**
 * Recursive row renderer with visual threading
 */
function renderTrailRows({
  rows,
  expandedRows,
  selectedRowId,
  onToggle,
  onSelect,
  rowRefs,
  level = 0,
}: {
  rows: ExecutionTrailNode[];
  expandedRows: Record<string, boolean>;
  selectedRowId: string | null;
  onToggle: (rowId: string) => void;
  onSelect: (row: ExecutionTrailNode) => void;
  rowRefs: React.MutableRefObject<Record<string, HTMLTableRowElement | null>>;
  level?: number;
}): React.ReactNode[] {
  return rows.flatMap((row, rowIndex) => {
    const hasChildren = Boolean(row.children?.length);
    const isExpanded = hasChildren ? (expandedRows[row.id] ?? true) : false;
    const isSelected = selectedRowId === row.id;
    const isInactive = /pending|not started/i.test(row.status) && !row.endedAt;
    const isLast = rowIndex === rows.length - 1;

    // Current row element
    const currentRow = (
      <tr
        key={row.id}
        ref={(el) => {
          if (el) rowRefs.current[row.id] = el;
        }}
        onClick={() => onSelect(row)}
        className={`border-t border-slate-100 cursor-pointer transition-colors ${
          isSelected 
            ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' 
            : 'hover:bg-slate-50/80'
        }`}
      >
        {/* Column 1: Status & Step with hierarchy */}
        <td className="px-3 py-2.5">
          <div className="flex items-start gap-1.5">
            {/* Visual threading: Build indent structure with guide lines */}
            {level > 0 && (
              <div className="flex shrink-0 items-stretch" style={{ width: level * 18 }}>
                {Array.from({ length: level }).map((_, i) => (
                  <span
                    key={i}
                    className="shrink-0 relative"
                    style={{ width: 18, position: 'relative' }}
                  >
                    {/* Vertical guide line */}
                    <span className="absolute left-[8px] top-[-12px] bottom-[-12px] border-l-2 border-slate-200" />
                    
                    {/* Horizontal connector on last indent level */}
                    {i === level - 1 && (
                      <span className="absolute left-[8px] top-[50%] w-[10px] border-t-2 border-slate-200" />
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Chevron toggle for expandable rows */}
            <div className="shrink-0 w-4 flex items-center justify-center mt-0.5">
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(row.id);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              ) : (
                <span style={{ width: 13 }} />
              )}
            </div>

            {/* Status icon */}
            <div className="shrink-0 mt-0.5">
              {getStatusIcon(row.status, isInactive)}
            </div>

            {/* Kind icon */}
            <div className="shrink-0 mt-0.5">
              {getRowKindIcon(row.kind, isInactive)}
            </div>

            {/* Label + rework badge + sub-labels */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-[12px] font-bold leading-tight ${
                    isInactive ? 'text-slate-400' : 'text-slate-800'
                  }`}
                >
                  {row.label}
                </span>

                {/* Rework indicator badge */}
                {typeof row.reworkedCount === 'number' && row.reworkedCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 whitespace-nowrap leading-none">
                    Reworked ×{row.reworkedCount}
                  </span>
                )}
              </div>

              {/* Duration sub-label (replaces Robot Job ID) */}
              {row.duration && !isInactive && (
                <p className="text-[10px] text-slate-400 font-medium font-mono mt-0.5">
                  Duration: {row.duration}
                </p>
              )}
            </div>
          </div>
        </td>

        {/* Column 2: Ended At timestamp */}
        <td className="px-3 py-2.5 text-right">
          <span
            className={`text-[11px] ${
              isInactive ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            {isInactive || !row.endedAt ? '—' : formatDateTime(row.endedAt)}
          </span>
        </td>
      </tr>
    );

    // Return current row + expanded children if applicable
    if (!hasChildren || !isExpanded) {
      return [currentRow];
    }

    return [
      currentRow,
      ...renderTrailRows({
        rows: row.children || [],
        expandedRows,
        selectedRowId,
        onToggle,
        onSelect,
        rowRefs,
        level: level + 1,
      }),
    ];
  });
}

/**
 * Hierarchical Execution Trail Component
 * 
 * Features:
 * - Two-column tree-grid (Status & Step, Ended At)
 * - Collapsible rows with chevron toggle
 * - Visual threading with guide lines
 * - Rework indicators (purple pill badge)
 * - Icon mapping for task types
 * - Robot Job ID for automation tasks
 * - Status icons (green check, red X, gray clock)
 * - Click-to-sync with process canvas
 * - Empty state handling
 */
export const ExecutionTrail: React.FC<ExecutionTrailProps> = ({
  rows,
  selectedRowId,
  onRowSelect,
  onCanvasNodeClick,
}) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  // Initialize all rows as expanded
  useEffect(() => {
    const initExpanded: Record<string, boolean> = {};
    const visit = (nodes: ExecutionTrailNode[]) => {
      nodes.forEach((node) => {
        if (node.children?.length) {
          initExpanded[node.id] = true;
          visit(node.children);
        }
      });
    };
    visit(rows);
    setExpandedRows(initExpanded);
  }, [rows]);

  // Auto-scroll selected row into view
  useEffect(() => {
    if (!selectedRowId) return;
    const rowEl = rowRefs.current[selectedRowId];
    if (rowEl) {
      setTimeout(() => {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 0);
    }
  }, [selectedRowId]);

  // Handle row toggle
  const handleToggle = (rowId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  // Handle row selection
  const handleSelect = (row: ExecutionTrailNode) => {
    onRowSelect(row);
    // Optionally sync with canvas if nodeId is available
    if (row.nodeId && onCanvasNodeClick) {
      onCanvasNodeClick(row.nodeId);
    }
  };

  // Empty state
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
        <p className="text-sm font-bold text-slate-400">
          No execution trail data available
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-white z-10 border-b-2 border-slate-200">
          <tr>
            <th className="px-3 py-3 text-left">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Status & Step
              </span>
            </th>
            <th className="px-3 py-3 text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Ended At
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {renderTrailRows({
            rows,
            expandedRows,
            selectedRowId,
            onToggle: handleToggle,
            onSelect: handleSelect,
            rowRefs,
            level: 0,
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ExecutionTrail;
