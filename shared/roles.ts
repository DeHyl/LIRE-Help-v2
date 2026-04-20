// ─── Staff roles + invite tier model ─────────────────────────────────────────
//
// Single source of truth for the role list and the rules that govern who can
// invite whom. Imported by both the server (auth + invitation guards) and the
// client (UI labels, role pickers). Kept free of any database/runtime deps so
// it bundles cleanly into the SPA.
//
// Tier rule: a role at tier T can invite any role at tier strictly less than T.
// That keeps the invite chain monotonic — nobody can grant a peer or a senior.

export const STAFF_ROLES = [
  "superadmin",
  "owner",
  "compliance",
  "senior_reviewer",
  "manager",
  "broker",
  "analyst",
  "staff",
  "readonly",
] as const;

export type StaffRole = typeof STAFF_ROLES[number];

export const ROLE_TIERS: Record<StaffRole, number> = {
  superadmin: 100,
  owner: 80,
  compliance: 70,
  senior_reviewer: 70,
  manager: 60,
  broker: 40,
  analyst: 40,
  staff: 40,
  readonly: 10,
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  superadmin: "Superadmin",
  owner: "Owner",
  compliance: "Compliance",
  senior_reviewer: "Senior Reviewer",
  manager: "Regional Director",
  broker: "Broker",
  analyst: "Analyst",
  staff: "Staff",
  readonly: "Read-only",
};

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

export function canInviteRole(invitor: StaffRole, target: StaffRole): boolean {
  return ROLE_TIERS[invitor] > ROLE_TIERS[target];
}

export function invitableRolesFor(invitor: StaffRole): StaffRole[] {
  return STAFF_ROLES.filter((r) => canInviteRole(invitor, r));
}

// Roles that can invite anyone at all. Used to gate the invitation routes.
export function canInviteAnyone(role: StaffRole): boolean {
  return invitableRolesFor(role).length > 0;
}
