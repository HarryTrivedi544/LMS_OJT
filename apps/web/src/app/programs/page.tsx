"use client";

import type { Assignment, Batch, Program, UserManagementUser } from "@lms/api-contracts";
import { workflowStatuses } from "@lms/shared";
import { Archive, Layers3, Plus, RefreshCcw, UserCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../components/auth/auth-provider";
import { AppShell } from "../../components/layout/app-shell";
import {
  archiveBatch,
  archiveProgram,
  assignProgramAdmin,
  assignProgramLead,
  createBatch,
  createProgram,
  listBatchAssignments,
  listBatches,
  listProgramAssignments,
  listPrograms,
  listUsers,
  restoreBatch,
  restoreProgram,
} from "../../lib/api";

const initialProgramForm = {
  name: "",
  code: "",
  status: "draft",
};

const initialBatchForm = {
  name: "",
  code: "",
  status: "draft",
};

function ProgramsContent() {
  const { accessToken, user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [users, setUsers] = useState<UserManagementUser[]>([]);
  const [programAssignments, setProgramAssignments] = useState<Assignment[]>([]);
  const [batchAssignments, setBatchAssignments] = useState<Assignment[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [programForm, setProgramForm] = useState(initialProgramForm);
  const [batchForm, setBatchForm] = useState(initialBatchForm);
  const [programAdminUserId, setProgramAdminUserId] = useState("");
  const [programLeadUserId, setProgramLeadUserId] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedProgram = programs.find((program) => program.id === selectedProgramId);
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId);

  const programAdminUsers = useMemo(
    () =>
      users.filter(
        (targetUser) =>
          targetUser.role === "Program Admin" &&
          targetUser.status === "active" &&
          !targetUser.deletedAt,
      ),
    [users],
  );

  const programLeadUsers = useMemo(
    () =>
      users.filter(
        (targetUser) =>
          targetUser.role === "Program Lead" &&
          targetUser.status === "active" &&
          !targetUser.deletedAt,
      ),
    [users],
  );

  const loadPrograms = async () => {
    if (!accessToken || user?.role !== "Super Admin") {
      return;
    }

    const data = await listPrograms(accessToken);
    setPrograms(data);

    const firstProgramId = data[0]?.id;

    if (!selectedProgramId && firstProgramId) {
      setSelectedProgramId(firstProgramId);
    }
  };

  const loadBatches = async (programId: string) => {
    if (!accessToken || !programId || user?.role !== "Super Admin") {
      setBatches([]);
      return;
    }

    const data = await listBatches(accessToken, programId);
    setBatches(data);

    if (!selectedBatchId || !data.some((batch) => batch.id === selectedBatchId)) {
      setSelectedBatchId(data[0]?.id ?? "");
    }
  };

  const loadAssignments = async (programId: string, batchId: string) => {
    if (!accessToken || user?.role !== "Super Admin") {
      return;
    }

    const nextProgramAssignments = programId
      ? await listProgramAssignments(accessToken, programId)
      : [];
    const nextBatchAssignments = batchId
      ? await listBatchAssignments(accessToken, batchId)
      : [];
    setProgramAssignments(nextProgramAssignments);
    setBatchAssignments(nextBatchAssignments);
  };

  useEffect(() => {
    if (!accessToken || user?.role !== "Super Admin") {
      return;
    }

    const loadInitialData = async () => {
      setError(null);
      const [nextPrograms, nextUsers] = await Promise.all([
        listPrograms(accessToken),
        listUsers(accessToken),
      ]);
      setPrograms(nextPrograms);
      setUsers(nextUsers);
      setSelectedProgramId((currentProgramId) => currentProgramId || nextPrograms[0]?.id || "");
    };

    void loadInitialData().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load programs.");
    });
  }, [accessToken, user?.role]);

  useEffect(() => {
    void loadBatches(selectedProgramId).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load batches.");
    });
  }, [selectedProgramId, user?.role]);

  useEffect(() => {
    void loadAssignments(selectedProgramId, selectedBatchId).catch((loadError) => {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load assignments.",
      );
    });
  }, [selectedProgramId, selectedBatchId, user?.role]);

  const handleCreateProgram = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || user?.role !== "Super Admin") {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const createdProgram = await createProgram(accessToken, programForm);
      setMessage(`Created ${createdProgram.name}.`);
      setProgramForm(initialProgramForm);
      setSelectedProgramId(createdProgram.id);
      await loadPrograms();
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Failed to create program.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleProgramArchive = async (program: Program) => {
    if (!accessToken || user?.role !== "Super Admin") {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const updatedProgram = program.deletedAt
        ? await restoreProgram(accessToken, program.id)
        : await archiveProgram(accessToken, program.id);
      setMessage(`${updatedProgram.name} is now ${updatedProgram.status}.`);
      await loadPrograms();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : "Failed to update program.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateBatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !selectedProgramId || user?.role !== "Super Admin") {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const createdBatch = await createBatch(accessToken, selectedProgramId, batchForm);
      setMessage(`Created ${createdBatch.name}.`);
      setBatchForm(initialBatchForm);
      setSelectedBatchId(createdBatch.id);
      await loadBatches(selectedProgramId);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create batch.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleBatchArchive = async (batch: Batch) => {
    if (!accessToken || user?.role !== "Super Admin") {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const updatedBatch = batch.deletedAt
        ? await restoreBatch(accessToken, batch.id)
        : await archiveBatch(accessToken, batch.id);
      setMessage(`${updatedBatch.name} is now ${updatedBatch.status}.`);
      await loadBatches(batch.programId);
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : "Failed to update batch.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleAssignProgramAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !accessToken ||
      !selectedProgramId ||
      !programAdminUserId ||
      user?.role !== "Super Admin"
    ) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const assignment = await assignProgramAdmin(
        accessToken,
        selectedProgramId,
        programAdminUserId,
      );
      setMessage(`Assigned ${assignment.fullName} to ${selectedProgram?.name}.`);
      setProgramAdminUserId("");
      await loadAssignments(selectedProgramId, selectedBatchId);
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "Failed to assign program admin.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleAssignProgramLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !accessToken ||
      !selectedBatchId ||
      !programLeadUserId ||
      user?.role !== "Super Admin"
    ) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const assignment = await assignProgramLead(
        accessToken,
        selectedBatchId,
        programLeadUserId,
      );
      setMessage(`Assigned ${assignment.fullName} to ${selectedBatch?.name}.`);
      setProgramLeadUserId("");
      await loadAssignments(selectedProgramId, selectedBatchId);
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "Failed to assign program lead.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AppShell
      allowedRoles={["Super Admin"]}
      contentClassName="programs-page"
      title="Programs and Batches"
    >
      {(error || message) && (
        <section className="feedback-row" aria-live="polite">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && <p className="form-success">{message}</p>}
        </section>
      )}

      <section className="grid programs-grid">
        <article className="card panel">
          <h2>Create Program</h2>
          <form className="user-form" onSubmit={handleCreateProgram}>
            <label className="field">
              <span>Program name</span>
              <input
                className="plain-input"
                onChange={(event) =>
                  setProgramForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
                value={programForm.name}
              />
            </label>
            <label className="field">
              <span>Code</span>
              <input
                className="plain-input"
                onChange={(event) =>
                  setProgramForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
                required
                value={programForm.code}
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                className="plain-input"
                onChange={(event) =>
                  setProgramForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                value={programForm.status}
              >
                {workflowStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <button className="command-button primary" disabled={isBusy} type="submit">
              <Plus size={18} aria-hidden="true" />
              Create Program
            </button>
          </form>
        </article>

        <article className="card panel">
          <h2>Programs</h2>
          <div className="program-list">
            {programs.length === 0 && <p className="row-meta">No programs yet.</p>}
            {programs.map((program) => (
              <button
                className={`program-row ${
                  program.id === selectedProgramId ? "active" : ""
                }`}
                key={program.id}
                onClick={() => setSelectedProgramId(program.id)}
                type="button"
              >
                <span>
                  <span className="row-title">{program.name}</span>
                  <span className="row-meta">{program.code}</span>
                </span>
                <span className={`status ${program.deletedAt ? "warning" : "success"}`}>
                  {program.deletedAt ? "archived" : program.status.replaceAll("_", " ")}
                </span>
              </button>
            ))}
          </div>
        </article>

        <article className="card panel">
          <div className="section-heading">
            <h2>{selectedProgram ? selectedProgram.name : "Batches"}</h2>
            {selectedProgram && (
              <button
                className="icon-button"
                disabled={isBusy}
                onClick={() => void handleProgramArchive(selectedProgram)}
                title={selectedProgram.deletedAt ? "Restore program" : "Archive program"}
                type="button"
              >
                {selectedProgram.deletedAt ? (
                  <RefreshCcw size={18} aria-hidden="true" />
                ) : (
                  <Archive size={18} aria-hidden="true" />
                )}
              </button>
            )}
          </div>

          <form className="compact-form" onSubmit={handleCreateBatch}>
            <input
              className="plain-input"
              onChange={(event) =>
                setBatchForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Batch name"
              required
              value={batchForm.name}
            />
            <input
              className="plain-input"
              onChange={(event) =>
                setBatchForm((current) => ({ ...current, code: event.target.value }))
              }
              placeholder="Code"
              required
              value={batchForm.code}
            />
            <select
              className="plain-input"
              onChange={(event) =>
                setBatchForm((current) => ({ ...current, status: event.target.value }))
              }
              value={batchForm.status}
            >
              {workflowStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <button
              className="command-button primary"
              disabled={isBusy || !selectedProgramId}
              type="submit"
            >
              <Layers3 size={18} aria-hidden="true" />
              Add Batch
            </button>
          </form>

          <div className="batch-list">
            {batches.length === 0 && <p className="row-meta">No batches yet.</p>}
            {batches.map((batch) => (
              <div className="batch-row" key={batch.id}>
                <button
                  className={`batch-select ${
                    batch.id === selectedBatchId ? "active" : ""
                  }`}
                  onClick={() => setSelectedBatchId(batch.id)}
                  type="button"
                >
                  <span className="row-title">{batch.name}</span>
                  <span className="row-meta">{batch.code}</span>
                </button>
                <span className={`status ${batch.deletedAt ? "warning" : "success"}`}>
                  {batch.deletedAt ? "archived" : batch.status.replaceAll("_", " ")}
                </span>
                <button
                  className="icon-button"
                  disabled={isBusy}
                  onClick={() => void handleBatchArchive(batch)}
                  title={batch.deletedAt ? "Restore batch" : "Archive batch"}
                  type="button"
                >
                  {batch.deletedAt ? (
                    <RefreshCcw size={18} aria-hidden="true" />
                  ) : (
                    <Archive size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="card panel">
          <h2>Assignments</h2>
          <form className="assignment-form" onSubmit={handleAssignProgramAdmin}>
            <label className="field">
              <span>Program Admin</span>
              <select
                className="plain-input"
                onChange={(event) => setProgramAdminUserId(event.target.value)}
                value={programAdminUserId}
              >
                <option value="">Select user</option>
                {programAdminUsers.map((targetUser) => (
                  <option key={targetUser.id} value={targetUser.id}>
                    {targetUser.fullName}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="command-button primary"
              disabled={isBusy || !selectedProgramId || !programAdminUserId}
              type="submit"
            >
              <UserCheck size={18} aria-hidden="true" />
              Assign
            </button>
          </form>
          <div className="assignment-list">
            {programAssignments.map((assignment) => (
              <div className="assignment-row" key={assignment.id}>
                <div>
                  <p className="row-title">{assignment.fullName}</p>
                  <p className="row-meta">{assignment.email}</p>
                </div>
                <span className="status">{assignment.role}</span>
              </div>
            ))}
          </div>

          <form className="assignment-form spaced" onSubmit={handleAssignProgramLead}>
            <label className="field">
              <span>Program Lead</span>
              <select
                className="plain-input"
                onChange={(event) => setProgramLeadUserId(event.target.value)}
                value={programLeadUserId}
              >
                <option value="">Select user</option>
                {programLeadUsers.map((targetUser) => (
                  <option key={targetUser.id} value={targetUser.id}>
                    {targetUser.fullName}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="command-button primary"
              disabled={isBusy || !selectedBatchId || !programLeadUserId}
              type="submit"
            >
              <UserCheck size={18} aria-hidden="true" />
              Assign
            </button>
          </form>
          <div className="assignment-list">
            {batchAssignments.map((assignment) => (
              <div className="assignment-row" key={assignment.id}>
                <div>
                  <p className="row-title">{assignment.fullName}</p>
                  <p className="row-meta">{assignment.email}</p>
                </div>
                <span className="status">{assignment.role}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}

export default function ProgramsPage() {
  return <ProgramsContent />;
}
