import type { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const sess = req.session as any;
  if (sess?.staffId) return next();
  res.status(403).json({ message: "Forbidden" });
}

export function requireStaffRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const sess = req.session as any;
    if (!sess?.staffId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(sess.staffRole)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  const sess = req.session as any;
  if (!sess?.staffId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}
