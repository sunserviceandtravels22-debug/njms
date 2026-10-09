// Implements: FR-PLT-05 | Re-exports from ActivityLog service for backward compatibility
export { writeAuditLog } from './services/activityLog';
export type { LogParams as AuditParams } from './services/activityLog';

