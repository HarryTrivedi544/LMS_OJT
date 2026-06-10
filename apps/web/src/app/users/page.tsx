"use client";

import type { UserManagementUser } from "@lms/api-contracts";
import { roles, userStatuses } from "@lms/shared";
import { FormEvent, useEffect, useState } from "react";
import { Archive, RefreshCcw, UserPlus } from "lucide-react";

import { useAuth } from "../../components/auth/auth-provider";
import { AppShell } from "../../components/layout/app-shell";
import {
  archiveUser,
  createUser,
  listUsers,
  restoreUser,
} from "../../lib/api";

const initialForm = {
  email: "",
  fullName: "",
  role: "Program Admin",
  status: "active",
  password: "ChangeMe123!",
};

function UsersContent() {
  const { accessToken, user } = useAuth();
  const [users, setUsers] = useState<UserManagementUser[]>([]);
  const [form, setForm] = useState(initialForm);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    if (!accessToken || user?.role !== "Super Admin") {
      return;
    }

    setError(null);
    const data = await listUsers(accessToken);
    setUsers(data);
  };

  useEffect(() => {
    void loadUsers().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load users.");
    });
  }, [accessToken, user?.role]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || user?.role !== "Super Admin") {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const createdUser = await createUser(accessToken, form);
      setMessage(`Created ${createdUser.fullName}.`);
      setForm(initialForm);
      await loadUsers();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create user.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleArchive = async (targetUser: UserManagementUser) => {
    if (!accessToken || user?.role !== "Super Admin") {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const updatedUser =
        targetUser.status === "archived"
          ? await restoreUser(accessToken, targetUser.id)
          : await archiveUser(accessToken, targetUser.id);
      setMessage(`${updatedUser.fullName} is now ${updatedUser.status}.`);
      await loadUsers();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : "Failed to update user.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AppShell
      allowedRoles={["Super Admin"]}
      contentClassName="users-page"
      title="User Management"
    >
      <section className="grid users-grid">
        <article className="card panel">
          <h2>Create User</h2>
          <form className="user-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Full name</span>
              <input
                className="plain-input"
                onChange={(event) =>
                  setForm((current) => ({ ...current, fullName: event.target.value }))
                }
                required
                value={form.fullName}
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                className="plain-input"
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                required
                type="email"
                value={form.email}
              />
            </label>
            <label className="field">
              <span>Role</span>
              <select
                className="plain-input"
                onChange={(event) =>
                  setForm((current) => ({ ...current, role: event.target.value }))
                }
                value={form.role}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select
                className="plain-input"
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
                value={form.status}
              >
                {userStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Password</span>
              <input
                className="plain-input"
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                required
                type="password"
                value={form.password}
              />
            </label>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {message && <p className="form-success">{message}</p>}

            <button className="command-button primary" disabled={isBusy} type="submit">
              <UserPlus size={18} aria-hidden="true" />
              Create User
            </button>
          </form>
        </article>

        <article className="card panel">
          <h2>Users</h2>
          <div className="user-table">
            {users.map((targetUser) => (
              <div className="user-row" key={targetUser.id}>
                <div>
                  <p className="row-title">{targetUser.fullName}</p>
                  <p className="row-meta">{targetUser.email}</p>
                </div>
                <span className="status">{targetUser.role}</span>
                <span
                  className={`status ${
                    targetUser.status === "active" ? "success" : "warning"
                  }`}
                >
                  {targetUser.status}
                </span>
                <button
                  className="icon-button"
                  disabled={isBusy || targetUser.id === user?.id}
                  onClick={() => void handleArchive(targetUser)}
                  title={targetUser.status === "archived" ? "Restore user" : "Archive user"}
                  type="button"
                >
                  {targetUser.status === "archived" ? (
                    <RefreshCcw size={18} aria-hidden="true" />
                  ) : (
                    <Archive size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}

export default function UsersPage() {
  return <UsersContent />;
}
