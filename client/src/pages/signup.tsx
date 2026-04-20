import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import { ROLE_LABELS, type StaffRole } from "../../../shared/roles";

interface InvitationLookup {
  email: string;
  role: StaffRole;
  tenantId: string | null;
  propertyId: string | null;
  tenantName: string | null;
  expiresAt: string;
  claimed: boolean;
  revoked: boolean;
}

export default function SignupPage() {
  const { refetch } = useAuth();
  const [, setLocation] = useLocation();
  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") ?? "";
  }, []);

  const [invite, setInvite] = useState<InvitationLookup | null>(null);
  const [lookupError, setLookupError] = useState<string>("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLookupError("This signup link is missing a token. Ask whoever invited you to resend it.");
      return;
    }
    fetch(`/api/invitations/lookup/${encodeURIComponent(token)}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          setLookupError("This invitation is invalid, expired, or has already been used.");
          return;
        }
        setInvite(await res.json());
      })
      .catch(() => setLookupError("Could not verify the invitation. Try again in a moment."));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Signup failed" }));
        throw new Error(body.message ?? "Signup failed");
      }
      await refetch();
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen w-screen grid-cols-1 bg-[#FAFAFA] text-[#111111] lg:grid-cols-2">
      <div className="flex min-w-0 flex-col bg-[#FAFAFA] px-6 py-6 sm:px-10 sm:py-8 lg:px-12">
        <a href="/" className="flex shrink-0 items-center gap-2.5 no-underline">
          <div
            className="grid place-items-center rounded-xs font-display font-bold leading-none text-[#FF4D00]"
            style={{ width: 26, height: 26, fontSize: 13, background: "#111111" }}
          >
            L
          </div>
          <div className="font-display text-[16px] font-bold tracking-tight text-[#111111]">LIRE Help</div>
        </a>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[400px]">
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#A3A3A3]">You're invited</div>
            <h1
              className="mt-2.5 font-display text-[36px] font-bold leading-[1.05] tracking-[-0.02em] text-[#111111]"
              style={{ margin: 0 }}
            >
              Set up your account
            </h1>

            {lookupError ? (
              <div
                className="mt-6 rounded-sm border border-[rgba(220,38,38,0.35)] bg-[rgba(220,38,38,0.08)] px-3 py-2 font-body text-[13px] text-[#DC2626]"
                role="alert"
              >
                {lookupError}
              </div>
            ) : !invite ? (
              <p className="mt-2 font-body text-[14px] text-[#737373]">Verifying invitation…</p>
            ) : (
              <>
                <p className="mt-2 font-body text-[14px] text-[#737373]">
                  Joining{" "}
                  <span className="font-medium text-[#111111]">{invite.tenantName ?? "LIRE"}</span> as{" "}
                  <span className="font-medium text-[#111111]">{ROLE_LABELS[invite.role] ?? invite.role}</span>.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 grid gap-2.5">
                  <input
                    type="email"
                    value={invite.email}
                    disabled
                    className="rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-3.5 py-[11px] font-body text-[13px] text-[#737373]"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Full name"
                    className="rounded-sm border border-[#E5E5E5] bg-white px-3.5 py-[11px] font-body text-[13px] text-[#111111] outline-none placeholder:text-[#A3A3A3] focus:border-[#111111] focus-visible:outline-2 focus-visible:outline-[#FF4D00] focus-visible:outline-offset-2"
                  />
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Password (min 8 characters)"
                      className="w-full rounded-sm border border-[#E5E5E5] bg-white px-3.5 py-[11px] pr-10 font-body text-[13px] text-[#111111] outline-none placeholder:text-[#A3A3A3] focus:border-[#111111] focus-visible:outline-2 focus-visible:outline-[#FF4D00] focus-visible:outline-offset-2"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-xs text-[#737373] transition-colors ease-ds duration-fast hover:bg-[#F5F5F5] hover:text-[#111111]"
                    >
                      {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    className="rounded-sm border border-[#E5E5E5] bg-white px-3.5 py-[11px] font-body text-[13px] text-[#111111] outline-none placeholder:text-[#A3A3A3] focus:border-[#111111] focus-visible:outline-2 focus-visible:outline-[#FF4D00] focus-visible:outline-offset-2"
                  />

                  {error ? (
                    <div
                      className="rounded-sm border border-[rgba(220,38,38,0.35)] bg-[rgba(220,38,38,0.08)] px-3 py-2 font-body text-[12px] text-[#DC2626]"
                      role="alert"
                    >
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-sm bg-[#FF4D00] px-3 font-body text-[13px] font-medium text-white transition-opacity ease-ds duration-fast hover:opacity-90 disabled:opacity-40"
                  >
                    {submitting ? "Creating account…" : (
                      <>
                        Create account
                        <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            <div className="mt-[18px] font-body text-[12px] text-[#737373]">
              Already have an account?{" "}
              <a href="/login" className="text-[#111111] no-underline hover:underline">
                Sign in
              </a>
            </div>
          </div>
        </div>

        <div className="shrink-0 font-mono text-[10px] uppercase tracking-[0.06em] text-[#A3A3A3]">
          DEHYL · OPERATIONS OS · SOC 2 TYPE II
        </div>
      </div>

      <aside className="relative hidden min-w-0 flex-col overflow-hidden bg-[#111111] px-12 py-12 text-[#FAFAFA] lg:flex">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.45)]">
          Welcome to LIRE
        </div>
        <div className="flex flex-1 items-center">
          <blockquote
            className="m-0 max-w-[520px] font-display text-[36px] font-medium leading-[1.15] tracking-[-0.02em] text-[#FAFAFA]"
            style={{ margin: 0 }}
          >
            &ldquo;Your invite is scoped to one workspace and one role.{" "}
            <span className="text-[#FF4D00]">Set a password and you're in.</span>&rdquo;
          </blockquote>
        </div>
      </aside>
    </div>
  );
}
