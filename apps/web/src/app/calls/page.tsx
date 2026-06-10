"use client";

import type { Call, Candidate, CandidateOptions } from "@lms/api-contracts";
import { CalendarClock, Filter, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../components/auth/auth-provider";
import { AppShell } from "../../components/layout/app-shell";
import {
  cancelCall,
  createCall,
  listCalls,
  listCandidateOptions,
  listCandidates,
} from "../../lib/api";

const initialFilters = {
  programId: "",
  batchId: "",
  candidateId: "",
  status: "",
};

const initialScheduleForm = {
  candidateId: "",
  title: "",
  description: "",
  scheduledStartAt: "",
  scheduledEndAt: "",
  meetingLink: "",
};

function CallsContent() {
  const { accessToken, user } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateOptions, setCandidateOptions] = useState<CandidateOptions>({
    programs: [],
    batches: [],
  });
  const [filters, setFilters] = useState(initialFilters);
  const [scheduleForm, setScheduleForm] = useState(initialScheduleForm);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSchedule =
    user?.role === "Super Admin" ||
    user?.role === "Program Admin" ||
    user?.role === "Program Lead";

  const availableBatches = useMemo(
    () =>
      candidateOptions.batches.filter(
        (batch) => !filters.programId || batch.programId === filters.programId,
      ),
    [candidateOptions.batches, filters.programId],
  );

  const availableCandidates = useMemo(
    () =>
      candidates
        .filter(
          (candidate) =>
            (!filters.programId || candidate.programId === filters.programId) &&
            (!filters.batchId || candidate.batchId === filters.batchId),
        )
        .map((candidate) => ({
          id: candidate.id,
          label: `${candidate.fullName} (${candidate.candidateCode})`,
        })),
    [candidates, filters.batchId, filters.programId],
  );

  const loadCalls = async (nextFilters = filters) => {
    if (!accessToken) {
      return;
    }

    const data = await listCalls(accessToken, nextFilters);
    setCalls(data);
  };

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void Promise.all([
      listCalls(accessToken, filters),
      listCandidates(accessToken),
      listCandidateOptions(accessToken),
    ])
      .then(([nextCalls, nextCandidates, nextOptions]) => {
        setCalls(nextCalls);
        setCandidates(nextCandidates);
        setCandidateOptions(nextOptions);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Failed to load calls.");
      });
  }, [accessToken]);

  const handleScheduleCall = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !canSchedule) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const scheduledCall = await createCall(accessToken, {
        candidateId: scheduleForm.candidateId,
        title: scheduleForm.title,
        description: scheduleForm.description || undefined,
        scheduledStartAt: new Date(scheduleForm.scheduledStartAt).toISOString(),
        scheduledEndAt: new Date(scheduleForm.scheduledEndAt).toISOString(),
        meetingLink: scheduleForm.meetingLink || undefined,
      });
      setMessage(`Scheduled call "${scheduledCall.title}" for ${scheduledCall.fullName}.`);
      setScheduleForm(initialScheduleForm);
      await loadCalls();
    } catch (scheduleError) {
      setError(scheduleError instanceof Error ? scheduleError.message : "Failed to schedule call.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCancelCall = async (call: Call) => {
    if (!accessToken) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      await cancelCall(accessToken, call.id);
      setMessage(`Cancelled call "${call.title}".`);
      await loadCalls();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Failed to cancel call.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AppShell contentClassName="calls-page" title="Calls">
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

      <section className="grid daily-logs-grid review-mode">
        {canSchedule && (
          <article className="card panel">
            <h2>Schedule Call</h2>
            <form className="stack-form" onSubmit={handleScheduleCall}>
              <label>
                Candidate
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      candidateId: event.target.value,
                    }))
                  }
                  required
                  value={scheduleForm.candidateId}
                >
                  <option value="">Select candidate</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.fullName} ({candidate.candidateCode})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Title
                <input
                  className="plain-input"
                  onChange={(event) =>
                    setScheduleForm((current) => ({ ...current, title: event.target.value }))
                  }
                  required
                  value={scheduleForm.title}
                />
              </label>
              <label>
                Description
                <textarea
                  className="plain-input"
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  value={scheduleForm.description}
                />
              </label>
              <label>
                Start
                <input
                  className="plain-input"
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      scheduledStartAt: event.target.value,
                    }))
                  }
                  required
                  type="datetime-local"
                  value={scheduleForm.scheduledStartAt}
                />
              </label>
              <label>
                End
                <input
                  className="plain-input"
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      scheduledEndAt: event.target.value,
                    }))
                  }
                  required
                  type="datetime-local"
                  value={scheduleForm.scheduledEndAt}
                />
              </label>
              <label>
                Meeting link
                <input
                  className="plain-input"
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      meetingLink: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                  value={scheduleForm.meetingLink}
                />
              </label>
              <button className="command-button primary" disabled={isBusy} type="submit">
                <CalendarClock size={18} aria-hidden="true" />
                Schedule Call
              </button>
            </form>
          </article>
        )}

        <article className="card panel">
          <h2>{canSchedule ? "Scheduled Calls" : "My Calls"}</h2>
          <form
            className="filter-bar timesheet-filters"
            onSubmit={(event) => {
              event.preventDefault();
              void loadCalls(filters).catch((loadError) => {
                setError(loadError instanceof Error ? loadError.message : "Failed to filter calls.");
              });
            }}
          >
            {canSchedule && (
              <>
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      programId: event.target.value,
                      batchId: "",
                      candidateId: "",
                    }))
                  }
                  value={filters.programId}
                >
                  <option value="">All programs</option>
                  {candidateOptions.programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      batchId: event.target.value,
                      candidateId: "",
                    }))
                  }
                  value={filters.batchId}
                >
                  <option value="">All batches</option>
                  {availableBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, candidateId: event.target.value }))
                  }
                  value={filters.candidateId}
                >
                  <option value="">All candidates</option>
                  {availableCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
              </>
            )}
            <button className="command-button primary" type="submit">
              <Filter size={18} aria-hidden="true" />
              Filter
            </button>
          </form>

          <div className="daily-log-list">
            {calls.length === 0 && <p className="row-meta">No calls found.</p>}
            {calls.map((call) => (
              <div className="daily-log-row" key={call.id}>
                <div className="daily-log-main">
                  <div>
                    <p className="row-title">{call.title}</p>
                    <p className="row-meta">
                      {call.fullName} / {new Date(call.scheduledStartAt).toLocaleString()} -{" "}
                      {new Date(call.scheduledEndAt).toLocaleString()}
                    </p>
                    <p className="row-meta">Scheduled by {call.schedulerName}</p>
                    {call.meetingLink && (
                      <a className="row-meta" href={call.meetingLink} rel="noreferrer" target="_blank">
                        Join meeting
                      </a>
                    )}
                  </div>
                  <span className="status">{call.status.replaceAll("_", " ")}</span>
                </div>
                {call.description && <p className="row-meta">{call.description}</p>}
                {call.status === "submitted" && canSchedule && (
                  <button
                    className="command-button"
                    disabled={isBusy}
                    onClick={() => void handleCancelCall(call)}
                    type="button"
                  >
                    <X size={18} aria-hidden="true" />
                    Cancel
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

export default function CallsPage() {
  return <CallsContent />;
}
