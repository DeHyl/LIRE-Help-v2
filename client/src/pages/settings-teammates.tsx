import { useEffect, useMemo, useState } from "react";
import { Copy, MailPlus, Trash2, Users } from "lucide-react";
import { SettingsLayout } from "../components/workspace/settings-layout";
import { Button, Card, FieldLabel, Input, Select } from "../components/ui";
import { useAuth } from "../lib/auth";
import {
  ROLE_LABELS,
  invitableRolesFor,
  type StaffRole,
} from "../../../shared/roles";

interface InvitationRow {
  id: string;
  email: string;
  role: StaffRole;
  tenantId: string | null;
  propertyId: string | null;
  expiresAt: string;
  createdAt: string;
  claimedAt: string | null;
  revokedAt: string | null;
  invitedByStaffId: string | null;
}

interface CreatedInvitation extends InvitationRow {
  token: string;
}

function statusOf(row: InvitationRow): { label: string; tone: string } {
  if (row.revokedAt) return { label: "Revoked", tone: "text-fg-subtle" };
  if (row.claimedAt) return { label: "Claimed", tone: "text-fg-muted" };
  if (new Date(row.expiresAt).getTime() < Date.now()) return { label: "Expired", tone: "text-error" };
  return { label: "Pending", tone: "text-accent" };
}

function inviteLink(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/signup?token=${encodeURIComponent(token)}`;
}

export default function SettingsTeammatesPage() {
  const { user } = useAuth();
  const allowed = useMemo<StaffRole[]>(
    () => (user ? invitableRolesFor(user.role) : []),
    [user],
  );

  const [invites, setInvites] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (allowed.length > 0 && !role) setRole(allowed[0]);
  }, [allowed, role]);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invitations", { credentials: "include" });
      if (res.ok) setInvites(await res.json());
      else setInvites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!role) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? "Could not create invitation");
      setCreated(body as CreatedInvitation);
      setEmail("");
      setCopied(false);
      refresh();
    } catch (err: any) {
      setError(err?.message ?? "Could not create invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm("Revoke this invitation? The link will stop working.")) return;
    const res = await fetch(`/api/invitations/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) refresh();
  };

  const handleCopy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(inviteLink(created.token));
      setCopied(true);
    } catch {
      // Clipboard blocked — let the user select the textarea manually.
    }
  };

  if (!user || allowed.length === 0) {
    return (
      <SettingsLayout title="Teammates" eyebrow="Workspace / Teammates">
        <Card padding="md">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-fg-muted" />
            <div className="font-display text-[16px] font-semibold text-fg">View only</div>
          </div>
          <p className="mt-2 font-body text-[13px] text-fg-muted">
            Your role can't invite teammates. Ask an owner or manager to send an invitation.
          </p>
        </Card>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title="Teammates" eyebrow="Workspace / Teammates">
      <div className="grid gap-4">
        <Card padding="md">
          <div className="flex items-center gap-2.5">
            <MailPlus className="h-4 w-4 text-fg-muted" />
            <div className="font-display text-[16px] font-semibold text-fg">Invite a teammate</div>
          </div>
          <form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <div>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="teammate@property.co"
              />
            </div>
            <div>
              <FieldLabel>Role</FieldLabel>
              <Select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} required>
                {allowed.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </Select>
            </div>
            <Button type="submit" loading={submitting} disabled={!email || !role}>
              Send invitation
            </Button>
          </form>
          {error ? <p className="mt-2 font-body text-[12px] text-error">{error}</p> : null}

          {created ? (
            <div className="mt-4 rounded-sm border border-border bg-surface-2 p-3">
              <div className="font-body text-[12px] text-fg-muted">
                Share this link with <span className="font-semibold text-fg">{created.email}</span>. It expires in 7 days and can only be used once.
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input readOnly value={inviteLink(created.token)} className="font-mono text-[12px]" />
                <Button variant="secondary" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={handleCopy}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-fg-muted" />
            <div className="font-display text-[16px] font-semibold text-fg">Invitations</div>
          </div>
          {loading ? (
            <p className="mt-3 font-body text-[13px] text-fg-muted">Loading…</p>
          ) : invites.length === 0 ? (
            <p className="mt-3 font-body text-[13px] text-fg-muted">No invitations yet.</p>
          ) : (
            <table className="mt-3 w-full text-left font-body text-[13px]">
              <thead className="text-[11px] uppercase tracking-eyebrow text-fg-muted">
                <tr>
                  <th className="py-2 font-medium">Email</th>
                  <th className="py-2 font-medium">Role</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Expires</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {invites.map((row) => {
                  const status = statusOf(row);
                  const pending = !row.claimedAt && !row.revokedAt && new Date(row.expiresAt).getTime() > Date.now();
                  return (
                    <tr key={row.id} className="border-t border-border">
                      <td className="py-2 text-fg">{row.email}</td>
                      <td className="py-2 text-fg-muted">{ROLE_LABELS[row.role as StaffRole] ?? row.role}</td>
                      <td className={`py-2 ${status.tone}`}>{status.label}</td>
                      <td className="py-2 text-fg-muted">{new Date(row.expiresAt).toLocaleDateString()}</td>
                      <td className="py-2 text-right">
                        {pending ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                            onClick={() => handleRevoke(row.id)}
                          >
                            Revoke
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </SettingsLayout>
  );
}
