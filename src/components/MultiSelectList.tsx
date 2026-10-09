'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  CheckSquare,
  Square,
  X,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  Layers,
} from 'lucide-react';
import {
  toggleSelection,
  invertSelection,
  selectRange,
  validateBulkActionLimit,
  BulkActionDef,
} from '@/domain/selection';

export interface MultiSelectListProps<T extends { id: string }> {
  items: T[];
  totalCount: number;
  renderRow: (item: T, isSelected: boolean, toggle: () => void) => React.ReactNode;
  bulkActions: BulkActionDef[];
  onExecuteBulkAction: (actionId: string, selectedIds: string[]) => Promise<{ success: boolean; message?: string }>;
  onFetchAllMatchingIds?: () => Promise<string[]>;
  selectionSummary?: (selectedIds: string[]) => string;
  enableKeyboardShortcuts?: boolean;
}

export function MultiSelectList<T extends { id: string }>({
  items,
  totalCount,
  renderRow,
  bulkActions,
  onExecuteBulkAction,
  onFetchAllMatchingIds,
  selectionSummary,
  enableKeyboardShortcuts = true,
}: MultiSelectListProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<BulkActionDef | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; undoAction?: () => void } | null>(null);
  const [isAllMatchingSelected, setIsAllMatchingSelected] = useState(false);

  const visibleIds = useMemo(() => items.map((i) => i.id), [items]);
  const isSelectionMode = selectedIds.size > 0;

  // Keyboard shortcut listener
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set());
        setIsAllMatchingSelected(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, enableKeyboardShortcuts]);

  // Handle row click / toggle
  const handleToggle = (id: string, shiftKey: boolean = false) => {
    if (shiftKey && lastClickedId && visibleIds.includes(lastClickedId)) {
      const range = selectRange(visibleIds, lastClickedId, id);
      const next = new Set(selectedIds);
      range.forEach((rId) => next.add(rId));
      setSelectedIds(next);
    } else {
      setSelectedIds((prev) => toggleSelection(prev, id));
      setLastClickedId(id);
    }
    setIsAllMatchingSelected(false);
  };

  const handleSelectVisible = () => {
    const next = new Set(selectedIds);
    visibleIds.forEach((id) => next.add(id));
    setSelectedIds(next);
    setIsAllMatchingSelected(false);
  };

  const handleSelectAllMatching = async () => {
    if (onFetchAllMatchingIds) {
      try {
        const allIds = await onFetchAllMatchingIds();
        setSelectedIds(new Set(allIds));
        setIsAllMatchingSelected(true);
      } catch {
        handleSelectVisible();
      }
    } else {
      handleSelectVisible();
    }
  };

  const handleInvert = () => {
    setSelectedIds((prev) => invertSelection(visibleIds, prev));
    setIsAllMatchingSelected(false);
  };

  const handleClear = () => {
    setSelectedIds(new Set());
    setIsAllMatchingSelected(false);
  };

  const handleTriggerAction = (action: BulkActionDef) => {
    const limitCheck = validateBulkActionLimit(selectedIds.size, action.maxItems);
    if (!limitCheck.valid) {
      alert(limitCheck.error);
      return;
    }
    setActiveAction(action);
  };

  const handleConfirmAction = async () => {
    if (!activeAction) return;
    setIsExecuting(true);
    try {
      const idsArray = Array.from(selectedIds);
      const result = await onExecuteBulkAction(activeAction.id, idsArray);
      if (result.success) {
        setActionFeedback({
          message: result.message || `Successfully processed ${idsArray.length} items.`,
        });
        setSelectedIds(new Set());
        setIsAllMatchingSelected(false);
        setActiveAction(null);
        setTimeout(() => setActionFeedback(null), 10_000);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="relative space-y-4">
      {/* Action feedback toast */}
      {actionFeedback && (
        <div className="fixed top-16 right-4 z-50 p-4 rounded-xl shadow-lg bg-surface border border-primary/30 flex items-center justify-between gap-4 text-sm animate-in fade-in slide-in-from-top-2">
          <span>{actionFeedback.message}</span>
          <button
            onClick={() => setActionFeedback(null)}
            className="p-1 hover:bg-surface-2 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sticky Selection Bar (D12-SEL-01..03) */}
      {isSelectionMode && (
        <div className="sticky top-16 z-20 p-3 rounded-xl bg-surface border border-primary/40 shadow-md flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-bold text-primary flex items-center gap-1.5">
              <CheckSquare className="w-5 h-5" />
              {selectedIds.size} selected
            </span>

            {selectionSummary && (
              <span className="text-xs text-text-muted hidden sm:inline">
                ({selectionSummary(Array.from(selectedIds))})
              </span>
            )}

            <button
              onClick={handleClear}
              className="p-1 hover:bg-surface-2 rounded text-text-muted hover:text-text text-xs inline-flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSelectVisible}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-surface-2 hover:bg-surface border border-border"
            >
              Select Visible
            </button>

            {onFetchAllMatchingIds && totalCount > visibleIds.length && (
              <button
                onClick={handleSelectAllMatching}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-surface-2 hover:bg-surface border border-border"
              >
                Select All {totalCount}
              </button>
            )}

            <button
              onClick={handleInvert}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-surface-2 hover:bg-surface border border-border"
            >
              Invert
            </button>

            {/* Bulk Actions */}
            <div className="flex items-center gap-1.5 ml-2">
              {bulkActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleTriggerAction(action)}
                  className={`px-3 py-1 text-xs font-bold rounded shadow-2xs transition-colors ${
                    action.isDestructive
                      ? 'bg-error text-white hover:bg-error/90'
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rows Container */}
      <div className="space-y-2">
        {items.map((item) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <div
              key={item.id}
              onClick={(e) => handleToggle(item.id, e.shiftKey)}
              className={`rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                  : 'border-border bg-surface hover:border-border-hover'
              }`}
            >
              <div className="flex items-center gap-3 p-3">
                {/* 44px touch target selection indicator */}
                <div
                  className="w-11 h-11 flex items-center justify-center shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(item.id, e.shiftKey);
                  }}
                >
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                      isSelected
                        ? 'bg-primary border-primary text-white'
                        : 'border-border bg-surface text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                {/* Render custom row */}
                <div className="flex-1 min-w-0 pointer-events-none sm:pointer-events-auto">
                  {renderRow(item, isSelected, () => handleToggle(item.id))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal / Preview Sheet (D12-SEL-09) */}
      {activeAction && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Confirm Bulk Action</h3>
            <p className="text-sm text-text-muted">
              Are you sure you want to execute <strong className="text-text">{activeAction.label}</strong> on{' '}
              <strong className="text-primary">{selectedIds.size}</strong> selected items?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                disabled={isExecuting}
                onClick={() => setActiveAction(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                disabled={isExecuting}
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm ${
                  activeAction.isDestructive
                    ? 'bg-error hover:bg-error/90'
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {isExecuting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
