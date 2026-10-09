// Implements: FR-PLT-08 | Component: C-13, C-14 | Doc: 03_TECH §11

import { useState, useEffect, useRef, useCallback } from 'react';
import { localDb, LocalDraft } from './drafts';

export function useDraft<T>(formType: string, formKey: string, currentData: T) {
  const [draft, setDraft] = useState<LocalDraft | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Check for existing draft on mount
  useEffect(() => {
    async function loadExistingDraft() {
      try {
        const found = await localDb.drafts.where({ formType, formKey }).first();
        if (found) {
          setDraft(found);
        }
      } catch (err) {
        console.error('Failed to load draft from IndexedDB:', err);
      }
    }
    loadExistingDraft();
  }, [formType, formKey]);

  // Debounced save on data change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveStatus('saving');

    timerRef.current = setTimeout(async () => {
      try {
        const payload = JSON.stringify(currentData);
        const existing = await localDb.drafts.where({ formType, formKey }).first();

        if (existing && existing.id) {
          await localDb.drafts.update(existing.id, {
            payload,
            updatedAt: Date.now(),
          });
        } else {
          await localDb.drafts.add({
            formType,
            formKey,
            payload,
            updatedAt: Date.now(),
          });
        }
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save draft to IndexedDB:', err);
        setSaveStatus('idle');
      }
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [formType, formKey, currentData]);

  const discardDraft = useCallback(async () => {
    try {
      await localDb.drafts.where({ formType, formKey }).delete();
      setDraft(null);
      setSaveStatus('idle');
    } catch (err) {
      console.error('Failed to discard draft:', err);
    }
  }, [formType, formKey]);

  const parseDraftData = useCallback((): T | null => {
    if (!draft) return null;
    try {
      return JSON.parse(draft.payload) as T;
    } catch {
      return null;
    }
  }, [draft]);

  return {
    hasDraft: !!draft,
    draftData: parseDraftData(),
    draftTimestamp: draft?.updatedAt,
    saveStatus,
    discardDraft,
  };
}
