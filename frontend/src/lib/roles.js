// Single source of truth for roles + which roles can see which modules.
// Edit this file when the backend team confirms final role names / access rules.

export const ROLES = {
  FLEET_MANAGER: 'fleet_manager',
  DRIVER: 'driver',
  SAFETY_OFFICER: 'safety_officer',
  FINANCIAL_ANALYST: 'financial_analyst',
}

export const ROLE_LABELS = {
  [ROLES.FLEET_MANAGER]: 'Fleet Manager',
  [ROLES.DRIVER]: 'Driver',
  [ROLES.SAFETY_OFFICER]: 'Safety Officer',
  [ROLES.FINANCIAL_ANALYST]: 'Financial Analyst',
}

// Assumption (easy to change): who can open each module.
// Dashboard is open to everyone; everything else is scoped to the roles
// that actually own that workflow in the spec.
export const MODULE_ACCESS = {
  dashboard: [ROLES.FLEET_MANAGER, ROLES.DRIVER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST],
  vehicles: [ROLES.FLEET_MANAGER],
  drivers: [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER],
  trips: [ROLES.FLEET_MANAGER, ROLES.DRIVER],
  maintenance: [ROLES.FLEET_MANAGER],
  fuelExpenses: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
  reports: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST, ROLES.SAFETY_OFFICER],
  settings: [ROLES.FLEET_MANAGER, ROLES.DRIVER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST],
}

export function canAccess(role, moduleKey) {
  return MODULE_ACCESS[moduleKey]?.includes(role) ?? false
}
