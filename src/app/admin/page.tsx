"use client";

import { useSOPs } from "@/contexts/SOPContext";
import { useState, useEffect, useCallback, useMemo } from "react";
import { USER_ROLES, NON_SUPERUSER_ROLES, ROLE_LABELS, type UserRole } from "@/lib/roles";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";

type Tab = "users" | "visibility" | "audit";

interface UserRecord {
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
}

interface AuditRecord {
  id: string;
  user_email: string;
  user_role: string;
  action: string;
  document_id: string | null;
  document_title: string | null;
  details: string | null;
  created_at: string;
}

export default function AdminPage() {
  const { sops, deleteSOP, categories, refreshSOPs } = useSOPs();
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  // SOP management
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState("");

  // Visibility matrix state - tracks pending changes before save
  const [visibilityMap, setVisibilityMap] = useState<Record<string, UserRole[]>>({});
  const [visibilityDirty, setVisibilityDirty] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [visibilityCatFilter, setVisibilityCatFilter] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/audit");
    if (res.ok) setAuditLogs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "users") fetchUsers();
    if (tab === "audit") fetchAudit();
    if (tab === "visibility") refreshSOPs();
  }, [tab, fetchUsers, fetchAudit, refreshSOPs]);

  // Initialize visibility map from SOPs when switching to visibility tab
  useEffect(() => {
    if (tab === "visibility" && sops.length > 0) {
      const map: Record<string, UserRole[]> = {};
      sops.forEach((s) => { map[s.id] = [...s.role_visibility]; });
      setVisibilityMap(map);
      setVisibilityDirty(false);
    }
  }, [tab, sops]);

  const handleRoleChange = (email: string, newRole: UserRole) => {
    setConfirmAction({
      title: "Change User Role",
      message: `Change ${email}'s role to ${ROLE_LABELS[newRole]}?`,
      onConfirm: async () => {
        await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role: newRole }),
        });
        await fetchUsers();
      },
    });
  };

  const handleToggleActive = (email: string, active: boolean) => {
    setConfirmAction({
      title: active ? "Activate Account" : "Deactivate Account",
      message: `${active ? "Activate" : "Deactivate"} the account for ${email}?`,
      onConfirm: async () => {
        await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, active }),
        });
        await fetchUsers();
      },
    });
  };

  const toggleVisibility = (sopId: string, role: UserRole) => {
    setVisibilityMap((prev) => {
      const current = prev[sopId] || [];
      const updated = current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role];
      return { ...prev, [sopId]: updated };
    });
    setVisibilityDirty(true);
  };

  const toggleColumnAll = (role: UserRole) => {
    const targetSops = visibilityCatFilter
      ? sops.filter((s) => s.category_name === visibilityCatFilter)
      : sops;
    const allChecked = targetSops.every((s) => (visibilityMap[s.id] || []).includes(role));
    setVisibilityMap((prev) => {
      const next = { ...prev };
      targetSops.forEach((s) => {
        const current = next[s.id] || [];
        next[s.id] = allChecked
          ? current.filter((r) => r !== role)
          : current.includes(role) ? current : [...current, role];
      });
      return next;
    });
    setVisibilityDirty(true);
  };

  const saveVisibility = async () => {
    setSavingVisibility(true);
    const changed = sops.filter((s) => {
      const original = [...s.role_visibility].sort().join(",");
      const updated = [...(visibilityMap[s.id] || [])].sort().join(",");
      return original !== updated;
    });
    for (const s of changed) {
      await fetch("/api/admin/sops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, role_visibility: visibilityMap[s.id] }),
      });
    }
    await refreshSOPs();
    setSavingVisibility(false);
    setVisibilityDirty(false);
    toast(`Updated visibility for ${changed.length} SOP${changed.length === 1 ? "" : "s"}.`);
  };

  const discardVisibility = () => {
    const map: Record<string, UserRole[]> = {};
    sops.forEach((s) => { map[s.id] = [...s.role_visibility]; });
    setVisibilityMap(map);
    setVisibilityDirty(false);
  };

  const filteredVisibilitySops = visibilityCatFilter
    ? sops.filter((s) => s.category_name === visibilityCatFilter)
    : sops;

  const handleDelete = async (id: string) => {
    await deleteSOP(id);
    setDeleteConfirm(null);
  };

  const executeConfirm = async () => {
    if (!confirmAction) return;
    setConfirming(true);
    await confirmAction.onConfirm();
    setConfirming(false);
    setConfirmAction(null);
  };

  const filtered = filterCat ? sops.filter((s) => s.category_name === filterCat) : sops;

  const tabs: { id: Tab; label: string }[] = [
    { id: "users", label: "User Management" },
    { id: "visibility", label: "Document Visibility" },
    { id: "audit", label: "Audit Log" },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>Admin Panel</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Manage users, document visibility, and view audit logs</p>
        </div>
        <Link
          href="/admin/edit/new"
          className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New SOP
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] mb-6">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* User Management Tab */}
      {tab === "users" && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-hover)]">
                <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-6 py-3">User</th>
                <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-6 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-[var(--text)]">{u.displayName}</p>
                    <p className="text-xs text-[var(--text-muted)]">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.email, e.target.value as UserRole)}
                      className="text-sm text-[var(--text)] border border-[var(--border)] rounded-lg px-3 py-1.5 bg-[var(--bg-card)] focus:outline-none focus:border-[var(--primary)]"
                    >
                      {USER_ROLES.map((role) => (
                        <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      u.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}>
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggleActive(u.email, !u.active)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        u.active
                          ? "border-[var(--danger)] text-[var(--danger-text)] hover:bg-[var(--danger-light)]"
                          : "border-green-200 text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {u.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="text-center py-8 text-[var(--text-muted)] text-sm">Loading...</div>}
        </div>
      )}

      {/* Document Visibility Tab */}
      {tab === "visibility" && (
        <div>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <select
                value={visibilityCatFilter}
                onChange={(e) => setVisibilityCatFilter(e.target.value)}
                className="text-sm text-[var(--text)] border border-[var(--border)] rounded-lg px-3 py-1.5 bg-[var(--bg-card)] focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              <span className="text-xs text-[var(--text-muted)]">
                {filteredVisibilitySops.length} {filteredVisibilitySops.length === 1 ? "document" : "documents"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {visibilityDirty && (
                <button
                  onClick={discardVisibility}
                  className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                >
                  Discard
                </button>
              )}
              <button
                onClick={saveVisibility}
                disabled={!visibilityDirty || savingVisibility}
                className="px-4 py-1.5 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 rounded-lg transition-colors"
              >
                {savingVisibility ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Matrix table */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-hover)]">
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 sticky left-0 bg-[var(--bg-hover)] min-w-[200px]">
                    Document
                  </th>
                  {NON_SUPERUSER_ROLES.map((role) => {
                    const allChecked = filteredVisibilitySops.length > 0 && filteredVisibilitySops.every((s) => (visibilityMap[s.id] || []).includes(role));
                    const someChecked = filteredVisibilitySops.some((s) => (visibilityMap[s.id] || []).includes(role));
                    return (
                      <th key={role} className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-3 py-3 min-w-[90px]">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="leading-tight">{ROLE_LABELS[role].replace(" ", "\n")}</span>
                          <input
                            type="checkbox"
                            checked={allChecked}
                            ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                            onChange={() => toggleColumnAll(role)}
                            className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                            title={`Toggle all for ${ROLE_LABELS[role]}`}
                          />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredVisibilitySops.map((sop) => (
                  <tr key={sop.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3 sticky left-0 bg-[var(--bg-card)]">
                      <p className="text-sm font-medium text-[var(--text)] truncate max-w-[250px]">{sop.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{sop.category_name}</p>
                    </td>
                    {NON_SUPERUSER_ROLES.map((role) => {
                      const checked = (visibilityMap[sop.id] || []).includes(role);
                      return (
                        <td key={role} className="text-center px-3 py-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleVisibility(sop.id, role)}
                            className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {sops.length === 0 && (
              <div className="text-center py-12 text-[var(--text-muted)] text-sm">No SOPs found.</div>
            )}
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {tab === "audit" && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-hover)]">
                <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-6 py-3">User</th>
                <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-6 py-3">Action</th>
                <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-6 py-3">Document</th>
                <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-6 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-6 py-3">
                    <p className="text-sm text-[var(--text)]">{log.user_email}</p>
                    <p className="text-xs text-[var(--text-muted)]">{log.user_role}</p>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs font-medium bg-[var(--tag-bg)] text-[var(--text)] px-2 py-1 rounded">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    {log.details && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">{log.details}</p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-[var(--text)]">
                    {log.document_title || "—"}
                  </td>
                  <td className="px-6 py-3 text-xs text-[var(--text-muted)] font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="text-center py-8 text-[var(--text-muted)] text-sm">Loading...</div>}
          {!loading && auditLogs.length === 0 && (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">No audit entries yet.</div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-[var(--modal-overlay)]" onClick={() => !confirming && setConfirmAction(null)} />
          <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">{confirmAction.title}</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6">{confirmAction.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={confirming}
                className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirm}
                disabled={confirming}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 rounded-lg transition-colors"
              >
                {confirming ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
