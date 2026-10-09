// Implements: FR-PLT-08 | Doc: 03_TECH §11

import Dexie, { Table } from 'dexie';

export interface LocalDraft {
  id?: number;
  formType: string;
  formKey: string;
  payload: string; // JSON stringified data
  updatedAt: number; // timestamp
}

export class NjmsDatabase extends Dexie {
  drafts!: Table<LocalDraft>;

  constructor() {
    super('NjmsLocalDatabase');
    this.version(1).stores({
      drafts: '++id, &[formType+formKey], updatedAt',
    });
  }
}

export const localDb = new NjmsDatabase();
