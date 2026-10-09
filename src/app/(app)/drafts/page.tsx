// Implements: FR-PLT-08 | Screen: S-04 | Doc: 02_DESIGN §3, §6

'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Trash2, ArrowRight } from 'lucide-react';
import { localDb, LocalDraft } from '@/lib/drafts';
import { Button } from '@/components/ui/Button';

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<LocalDraft[]>([]);

  const loadDrafts = async () => {
    try {
      const list = await localDb.drafts.toArray();
      setDrafts(list);
    } catch (err) {
      console.error('Failed to load drafts:', err);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const handleDelete = async (id?: number) => {
    if (!id) return;
    await localDb.drafts.delete(id);
    await loadDrafts();
  };

  const handleClearAll = async () => {
    await localDb.drafts.clear();
    await loadDrafts();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Drafts Tray
          </h1>
          <p className="text-xs text-text-muted">Manage unsaved form drafts stored locally</p>
        </div>
        {drafts.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-danger hover:bg-rose-50">
            Clear All Drafts
          </Button>
        )}
      </div>

      {drafts.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center space-y-3">
          <FileText className="w-12 h-12 text-text-muted mx-auto opacity-50" />
          <h3 className="font-semibold text-text text-base">No Unsaved Drafts</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Forms autosave as you type. Any half-filled sales, customers, or girvi forms will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => (
            <div
              key={d.id}
              className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between gap-4 shadow-2xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-primary/10 text-primary rounded">
                    {d.formType}
                  </span>
                  <span className="text-sm font-semibold text-text">{d.formKey}</span>
                </div>
                <div className="text-xs text-text-muted">
                  Saved at {new Date(d.updatedAt).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-2 text-text-muted hover:text-danger rounded-lg hover:bg-rose-50"
                  title="Discard Draft"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
