"use client";

import type { Candidate, CandidateOptions } from "@lms/api-contracts";
import { userStatuses } from "@lms/shared";
import { Archive, Filter, RefreshCcw, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../components/auth/auth-provider";
import { AppShell } from "../../components/layout/app-shell";
import {
  archiveCandidate,
  createCandidate,
  listCandidateOptions,
  listCandidates,
  restoreCandidate,
} from "../../lib/api";

const initialForm = {
  fullName: "",
  email: "",
  password: "ChangeMe123!",
  candidateCode: "",
  programId: "",
  batchId: "",
  status: "active",
};

const initialFilters = {
  search: "",
  programId: "",
  batchId: "",
  status: "",
};

const emptyOptions: CandidateOptions = {
  programs: [],
  batches: [],
};

function CandidatesContent() {
  const { accessToken, user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [options, setOptions] = useState<CandidateOptions>(emptyOptions);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEnroll = user?.role === "Super Admin" || user?.role === "Program Admin";
  const scopedBatches = useMemo(
    () => options.batches.filter((batch) => batch.programId === form.programId),
    [form.programId, options.batches],
  );
  const filterBatches = useMemo(
    () =>
      filters.programId
        ? options.batches.filter((batch) => batch.programId === filters.programId)
        : options.batches,
    [filters.programId, options.batches],
  );

  const loadCandidates = async (nextFilters = filters) => {
    if (!accessToken) {
      return;
    }

    const data = await listCandidates(accessToken, nextFilters);
    setCandidates(data);
  };

  const loadOptions = async () => {
    if (!accessToken) {
      return;
    }

    const data = await listCandidateOptions(accessToken);
    setOptions(data);

    setForm((current) => {
      const programId = current.programId || data.programs[0]?.id || "";
      const batchId =
        current.batchId && data.batches.some((batch) => batch.id === current.batchId)
          ? current.batchId
          : data.batches.find((batch) => batch.programId === programId)?.id || "";

      return {
        ...current,
        programId,
        batchId,
      };
    });
  };

  const loadPageData = async () => {
    setError(null);
    await Promise.all([loadCandidates(), loadOptions()]);
  };

  useEffect(() => {
    void loadPageData().catch((loadError) => {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load candidates.",
      );
    });
  }, [accessToken]);

  const handleProgramChange = (programId: string) => {
    const firstBatchId =
      options.batches.find((batch) => batch.programId === programId)?.id || "";

    setForm((current) => ({
      ...current,
      programId,
      batchId: firstBatchId,
    }));
  };

  const handleFilterProgramChange = (programId: string) => {
    setFilters((current) => ({
      ...current,
      programId,
      batchId:
        current.batchId &&
        options.batches.some(
          (batch) => batch.id === current.batchId && batch.programId === programId,
        )
          ? current.batchId
          : "",
    }));
  };

  const handleFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await loadCandidates(filters);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to filter candidates.",
      );
    }
  };

  const handleCreateCandidate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !canEnroll) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const createdCandidate = await createCandidate(accessToken, {
        ...form,
        batchId: form.batchId || undefined,
      });
      setMessage(`Enrolled ${createdCandidate.fullName}.`);
      setForm((current) => ({
        ...initialForm,
        programId: current.programId,
        batchId: current.batchId,
      }));
      await loadCandidates();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to enroll candidate.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleArchive = async (candidate: Candidate) => {
    if (!accessToken || !canEnroll) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const updatedCandidate = candidate.deletedAt
        ? await restoreCandidate(accessToken, candidate.id)
        : await archiveCandidate(accessToken, candidate.id);
      setMessage(`${updatedCandidate.fullName} is now ${updatedCandidate.status}.`);
      await loadCandidates();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Failed to update candidate.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AppShell contentClassName="candidates-page" title="Candidates">
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

      <section className={`grid ${canEnroll ? "candidates-grid" : "candidates-grid view-only"}`}>
        {canEnroll && (
          <article className="card panel">
            <h2>Enroll Candidate</h2>
            <form className="user-form" onSubmit={handleCreateCandidate}>
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
                <span>Candidate code</span>
                <input
                  className="plain-input"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      candidateCode: event.target.value,
                    }))
                  }
                  required
                  value={form.candidateCode}
                />
              </label>
              <label className="field">
                <span>Program</span>
                <select
                  className="plain-input"
                  onChange={(event) => handleProgramChange(event.target.value)}
                  required
                  value={form.programId}
                >
                  <option value="">Select program</option>
                  {options.programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Batch</span>
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, batchId: event.target.value }))
                  }
                  value={form.batchId}
                >
                  <option value="">No batch</option>
                  {scopedBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
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
              <button
                className="command-button primary"
                disabled={isBusy || !form.programId}
                type="submit"
              >
                <UserPlus size={18} aria-hidden="true" />
                Enroll Candidate
              </button>
            </form>
          </article>
        )}

        <article className="card panel">
          <h2>{user?.role === "Candidate" ? "My Enrollment" : "Candidates"}</h2>
          {user?.role !== "Candidate" && (
            <form className="filter-bar" onSubmit={handleFilterSubmit}>
              <input
                className="plain-input"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
                placeholder="Search name, email, code"
                value={filters.search}
              />
              <select
                className="plain-input"
                onChange={(event) => handleFilterProgramChange(event.target.value)}
                value={filters.programId}
              >
                <option value="">All programs</option>
                {options.programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
              <select
                className="plain-input"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, batchId: event.target.value }))
                }
                value={filters.batchId}
              >
                <option value="">All batches</option>
                {filterBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>
              <select
                className="plain-input"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, status: event.target.value }))
                }
                value={filters.status}
              >
                <option value="">All statuses</option>
                {userStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button className="command-button primary" type="submit">
                <Filter size={18} aria-hidden="true" />
                Filter
              </button>
            </form>
          )}
          <div className="candidate-list">
            {candidates.length === 0 && <p className="row-meta">No candidates found.</p>}
            {candidates.map((candidate) => (
              <div className="candidate-row" key={candidate.id}>
                <div className="candidate-main">
                  <p className="row-title">{candidate.fullName}</p>
                  <p className="row-meta">{candidate.email}</p>
                  <p className="row-meta">
                    {candidate.programName}
                    {candidate.batchName ? ` / ${candidate.batchName}` : ""}
                  </p>
                </div>
                <span className="status">{candidate.candidateCode}</span>
                <span
                  className={`status ${
                    candidate.status === "active" ? "success" : "warning"
                  }`}
                >
                  {candidate.deletedAt ? "archived" : candidate.status}
                </span>
                {canEnroll && (
                  <button
                    className="icon-button"
                    disabled={isBusy}
                    onClick={() => void handleArchive(candidate)}
                    title={
                      candidate.deletedAt ? "Restore candidate" : "Archive candidate"
                    }
                    type="button"
                  >
                    {candidate.deletedAt ? (
                      <RefreshCcw size={18} aria-hidden="true" />
                    ) : (
                      <Archive size={18} aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}

export default function CandidatesPage() {
  return <CandidatesContent />;
}
