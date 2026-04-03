"use client";

import { useSOPs } from "@/contexts/SOPContext";
import { useState, useEffect, useCallback } from "react";
import { USER_ROLES, NON_SUPERUSER_ROLES, ROLE_LABELS, type UserRole } from "@/lib/roles";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

  const handleVisibilityChange = (sopId: string, sopTitle: string, role: UserRole, checked: boolean, currentRoles: UserRole[]) => {
    const newRoles = checked
      ? [...currentRoles, role]
      : currentRoles.filter((r) => r !== role);

    setConfirmAction({
      title: "Change Document Visibility",
      message: `${checked ? "Grant" : "Remove"} ${ROLE_LABELS[role]} access to "${sopTitle}"?`,
      onConfirm: async () => {
        await fetch("/api/admin/sops", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sopId, role_visibility: newRoles }),
        });
        await refreshSOPs();
      },
    });
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Manage users, document visibility, and view audit logs</p>
        </div>
        <Link
          href="/admin/edit/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New SOP
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* User Management Tab */}
      {tab === "users" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">User</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email} className="border-b border-gray-100 last:border-0">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{u.displayName}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.email, e.target.value as UserRole)}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-blue-500"
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
                          ? "border-red-200 text-red-600 hover:bg-red-50"
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
          {loading && <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>}
        </div>
      )}

      {/* Document Visibility Tab */}
      {tab === "visibility" && (
        <div className="space-y-4">
          {sops.map((sop) => (
            <div key={sop.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{sop.title}</h3>
                  <p className="text-xs text-gray-500">{sop.category_name}</p>
                </div>
                {deleteConfirm === sop.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600">Delete?</span>
                    <button
                      onClick={() => handleDelete(sop.id)}
                      className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(sop.id)}
                    className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {NON_SUPERUSER_ROLES.map((role) => {
                  const checked = sop.role_visibility.includes(role);
                  return (
                    <label key={role} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleVisibilityChange(sop.id, sop.title, role, !checked, sop.role_visibility)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">{ROLE_LABELS[role]}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          {sops.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">No SOPs found.</div>
          )}
        </div>
      )}

      {/* Audit Log Tab */}
      {tab === "audit" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">User</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Action</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Document</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-6 py-3">
                    <p className="text-sm text-gray-900">{log.user_email}</p>
                    <p className="text-xs text-gray-500">{log.user_role}</p>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    {log.details && (
                      <p className="text-xs text-gray-500 mt-1">{log.details}</p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700">
                    {log.document_title || "—"}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500 font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>}
          {!loading && auditLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">No audit entries yet.</div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !confirming && setConfirmAction(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{confirmAction.title}</h3>
            <p className="text-sm text-gray-600 mb-6">{confirmAction.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={confirming}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirm}
                disabled={confirming}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
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
