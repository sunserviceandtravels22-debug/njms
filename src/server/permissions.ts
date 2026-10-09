// Implements: FR-PLT-03 | Doc: 03_TECH §10

import { Role } from '@prisma/client';

export type Capability =
  | 'SALE_READ_WRITE'
  | 'CUSTOMER_READ_WRITE'
  | 'PAYMENT_TAKE'
  | 'GIRVI_CREATE'
  | 'GIRVI_RELEASE'
  | 'DISCOUNT_OVERRIDE'
  | 'LTV_OVERRIDE'
  | 'REVERSE_WRITE_OFF'
  | 'EDIT_RATES_SETTINGS'
  | 'RATE_SNAPSHOT_CREATE'
  | 'RATE_SNAPSHOT_CORRECT'
  | 'VIEW_ACTIVITY_LOG'
  | 'EXPORT_ACTIVITY_LOG'
  | 'BARCODE_PRINT'
  | 'BARCODE_TEMPLATE_EDIT'
  | 'REPORTS_PROFIT_COST'
  | 'EXPORT_BACKUP';

const PERMISSION_MATRIX: Record<Capability, Role[]> = {
  SALE_READ_WRITE: [Role.STAFF, Role.MANAGER, Role.OWNER],
  CUSTOMER_READ_WRITE: [Role.STAFF, Role.MANAGER, Role.OWNER],
  PAYMENT_TAKE: [Role.STAFF, Role.MANAGER, Role.OWNER],
  GIRVI_CREATE: [Role.STAFF, Role.MANAGER, Role.OWNER],
  GIRVI_RELEASE: [Role.MANAGER, Role.OWNER],
  DISCOUNT_OVERRIDE: [Role.MANAGER, Role.OWNER],
  LTV_OVERRIDE: [Role.MANAGER, Role.OWNER],
  REVERSE_WRITE_OFF: [Role.OWNER],
  EDIT_RATES_SETTINGS: [Role.OWNER],
  RATE_SNAPSHOT_CREATE: [Role.MANAGER, Role.OWNER],
  RATE_SNAPSHOT_CORRECT: [Role.OWNER],
  VIEW_ACTIVITY_LOG: [Role.MANAGER, Role.OWNER],
  EXPORT_ACTIVITY_LOG: [Role.OWNER, Role.ACCOUNTANT],
  BARCODE_PRINT: [Role.STAFF, Role.MANAGER, Role.OWNER],
  BARCODE_TEMPLATE_EDIT: [Role.MANAGER, Role.OWNER],
  REPORTS_PROFIT_COST: [Role.OWNER, Role.ACCOUNTANT],
  EXPORT_BACKUP: [Role.OWNER, Role.ACCOUNTANT],
};

export function hasCapability(role: Role, capability: Capability): boolean {
  const allowedRoles = PERMISSION_MATRIX[capability];
  return allowedRoles ? allowedRoles.includes(role) : false;
}

export function assertCapability(role: Role, capability: Capability): void {
  if (!hasCapability(role, capability)) {
    throw new Error(`Permission denied: Role ${role} cannot perform ${capability}`);
  }
}
