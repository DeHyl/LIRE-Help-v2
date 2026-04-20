import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { canInviteAnyone, type StaffRole } from "../../../shared/roles";

export type { StaffRole };

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  tenantId: string | null;
  propertyId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: StaffUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Login failed" }));
      throw new Error(err.message ?? "Login failed");
    }
    const data = await res.json();
    setUser(data.user);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refetch: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useCanAccess(...roles: StaffRole[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (roles.length === 0) return true;
  return roles.includes(user.role);
}

export function useCanInvite(): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return canInviteAnyone(user.role);
}
