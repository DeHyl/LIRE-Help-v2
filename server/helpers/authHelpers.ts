import bcrypt from "bcrypt";
import type { Request } from "express";
import type { StaffUser } from "../../shared/schema.js";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function setStaffSession(req: Request, user: StaffUser): void {
  (req.session as any).staffId = user.id;
  (req.session as any).staffRole = user.role;
  (req.session as any).staffTenantId = user.tenantId ?? null;
}

export function safeUser(user: StaffUser): Omit<StaffUser, "passwordHash"> {
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}
