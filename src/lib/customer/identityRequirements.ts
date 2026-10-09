export type ModuleId = 'GIRVI' | 'CREDIT' | 'OLD_PURCHASE' | 'ORDER' | 'REPAIR' | 'POS';

export interface FieldRequirement {
  field: string;
  label: string;
  level: 'OPTIONAL' | 'PROMPTED' | 'MANDATORY';
}

export interface RequirementCheckResult {
  missing: FieldRequirement[];
  blocking: FieldRequirement[];
}

export function checkCustomerIdentityRequirements(
  moduleId: ModuleId,
  customer: Record<string, any>,
  customProfiles?: Record<string, any>[]
): RequirementCheckResult {
  const missing: FieldRequirement[] = [];
  const blocking: FieldRequirement[] = [];

  const defaultProfiles: Record<ModuleId, FieldRequirement[]> = {
    GIRVI: [
      { field: 'phone', label: 'Primary Phone', level: 'MANDATORY' },
      { field: 'address', label: 'Current Address', level: 'PROMPTED' },
      { field: 'identityDocNumber', label: 'ID Proof Number', level: 'PROMPTED' },
      { field: 'photoUrl', label: 'Customer Photo', level: 'PROMPTED' },
    ],
    OLD_PURCHASE: [
      { field: 'phone', label: 'Primary Phone', level: 'MANDATORY' },
      { field: 'address', label: 'Current Address', level: 'MANDATORY' },
      { field: 'identityDocType', label: 'ID Proof Type', level: 'MANDATORY' },
      { field: 'identityDocNumber', label: 'ID Proof Number', level: 'MANDATORY' },
    ],
    CREDIT: [
      { field: 'phone', label: 'Primary Phone', level: 'MANDATORY' },
      { field: 'address', label: 'Current Address', level: 'PROMPTED' },
    ],
    ORDER: [
      { field: 'phone', label: 'Primary Phone', level: 'MANDATORY' },
    ],
    REPAIR: [
      { field: 'phone', label: 'Primary Phone', level: 'MANDATORY' },
    ],
    POS: [],
  };

  const reqs = defaultProfiles[moduleId] || [];

  for (const req of reqs) {
    const val = customer[req.field];
    if (!val || (typeof val === 'string' && !val.trim())) {
      missing.push(req);
      if (req.level === 'MANDATORY') {
        blocking.push(req);
      }
    }
  }

  return { missing, blocking };
}
