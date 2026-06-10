"use client";

import type { Candidate, CandidateLog, CandidateLogEntry } from "@lms/api-contracts";
import { workflowStatuses } from "@lms/shared";
import { CheckCircle2, ClipboardCheck, Filter, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../components/auth/auth-provider";
import { AppShell } from "../../components/layout/app-shell";
import {
  createCandidateLog,
  listCandidateLogs,
  listCandidates,
  reviewCandidateLog,
} from "../../lib/api";

type EditableLogEntry = Omit<CandidateLogEntry, "hours">;

const today = () => new Date().toISOString().slice(0, 10);

const createEmptyEntry = (index: number): EditableLogEntry => ({
  taskReference: `TASK-${String(index + 1).padStart(3, "0")}`,
  taskDescription: "",
  projectReference: "Internal",
  taskType: "Build",
  startTime: "09:00",
  endTime: "10:00",
  outputDelivered: "",
  toolTechnology: "",
  status: "Done",
  notesBlocker: "",
});

const initialFilters = {
  candidateId: "",
  status: "",
  logDate: "",
};

const reviewStatuses = [
  "under_review",
  "approved",
  "rejected",
  "revision_required",
] as const;

const minutesFromTimeRange = (startTime: string, endTime: string) => {
  const [startHour = 0, startMinute = 0] = startTime.split(":").map(Number);
  const [endHour = 0, endMinute = 0] = endTime.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  return end > start ? end - start : 0;
};

const hoursFromEntry = (entry: EditableLogEntry) =>
  Number((minutesFromTimeRange(entry.startTime, entry.endTime) / 60).toFixed(2));

function DailyLogsContent() {
  const { accessToken, user } = useAuth();
  const [logs, setLogs] = useState<CandidateLog[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [logDate, setLogDate] = useState(today());
  const [entries, setEntries] = useState<EditableLogEntry[]>([createEmptyEntry(0)]);
  const [filters, setFilters] = useState(initialFilters);
  const [reviewInputs, setReviewInputs] = useState<
    Record<string, { status: string; reviewNote: string }>
  >({});
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCandidate = user?.role === "Candidate";
  const canReview =
    user?.role === "Super Admin" ||
    user?.role === "Program Admin" ||
    user?.role === "Program Lead";
  const totalHours = entries.reduce((total, entry) => total + hoursFromEntry(entry), 0);
  const candidateOptions = useMemo(
    () =>
      candidates.map((candidate) => ({
        id: candidate.id,
        label: `${candidate.fullName} (${candidate.candidateCode})`,
      })),
    [candidates],
  );

  const loadLogs = async (nextFilters = filters) => {
    if (!accessToken) {
      return;
    }

    const data = await listCandidateLogs(accessToken, nextFilters);
    setLogs(data);
  };

  const loadPageData = async () => {
    if (!accessToken) {
      return;
    }

    setError(null);
    const [nextLogs, nextCandidates] = await Promise.all([
      listCandidateLogs(accessToken, filters),
      listCandidates(accessToken),
    ]);
    setLogs(nextLogs);
    setCandidates(nextCandidates);
  };

  useEffect(() => {
    void loadPageData().catch((loadError) => {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load daily logs.",
      );
    });
  }, [accessToken]);

  const updateEntry = (
    index: number,
    field: keyof EditableLogEntry,
    value: string,
  ) => {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const addEntry = () => {
    setEntries((current) => [...current, createEmptyEntry(current.length)]);
  };

  const removeEntry = (index: number) => {
    setEntries((current) =>
      current.length === 1
        ? current
        : current.filter((_entry, entryIndex) => entryIndex !== index),
    );
  };

  const handleSubmitLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !isCandidate) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const createdLog = await createCandidateLog(accessToken, {
        logDate,
        entries,
      });
      setMessage(`Submitted log for ${createdLog.logDate}.`);
      setLogDate(today());
      setEntries([createEmptyEntry(0)]);
      await loadLogs();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to submit daily log.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await loadLogs(filters);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to filter daily logs.",
      );
    }
  };

  const handleReview = async (log: CandidateLog) => {
    if (!accessToken || !canReview) {
      return;
    }

    const input = reviewInputs[log.id] ?? {
      status: "approved",
      reviewNote: "",
    };

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const reviewedLog = await reviewCandidateLog(accessToken, log.id, {
        status: input.status,
        reviewNote: input.reviewNote || undefined,
      });
      setMessage(`${reviewedLog.fullName}'s log is now ${reviewedLog.status}.`);
      await loadLogs();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error ? reviewError.message : "Failed to review daily log.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AppShell contentClassName="daily-logs-page" title="Daily Logs">
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
        {isCandidate && (
          <article className="card panel daily-log-entry-panel">
            <div className="section-heading">
              <h2>Submit Daily Log</h2>
              <label className="date-inline">
                <span>Date</span>
                <input
                  className="plain-input"
                  onChange={(event) => setLogDate(event.target.value)}
                  required
                  type="date"
                  value={logDate}
                />
              </label>
            </div>

            <form onSubmit={handleSubmitLog}>
              <div className="daily-log-table-wrap">
                <table className="daily-log-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Task ID / Reference</th>
                      <th>Task Description</th>
                      <th>Project / Client Reference</th>
                      <th>Task Type</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Hours</th>
                      <th>Output Delivered</th>
                      <th>Tool / Technology</th>
                      <th>Status</th>
                      <th>Notes / Blocker</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr key={`${entry.taskReference}-${index}`}>
                        <td>{index + 1}</td>
                        <td>
                          <input
                            onChange={(event) =>
                              updateEntry(index, "taskReference", event.target.value)
                            }
                            required
                            value={entry.taskReference}
                          />
                        </td>
                        <td>
                          <input
                            onChange={(event) =>
                              updateEntry(index, "taskDescription", event.target.value)
                            }
                            required
                            value={entry.taskDescription}
                          />
                        </td>
                        <td>
                          <input
                            onChange={(event) =>
                              updateEntry(index, "projectReference", event.target.value)
                            }
                            required
                            value={entry.projectReference}
                          />
                        </td>
                        <td>
                          <select
                            onChange={(event) =>
                              updateEntry(index, "taskType", event.target.value)
                            }
                            value={entry.taskType}
                          >
                            <option value="Build">Build</option>
                            <option value="Test">Test</option>
                            <option value="Docs">Docs</option>
                            <option value="Call">Call</option>
                            <option value="Research">Research</option>
                          </select>
                        </td>
                        <td>
                          <input
                            onChange={(event) =>
                              updateEntry(index, "startTime", event.target.value)
                            }
                            required
                            type="time"
                            value={entry.startTime}
                          />
                        </td>
                        <td>
                          <input
                            onChange={(event) =>
                              updateEntry(index, "endTime", event.target.value)
                            }
                            required
                            type="time"
                            value={entry.endTime}
                          />
                        </td>
                        <td className="hours-cell">{hoursFromEntry(entry).toFixed(2)}</td>
                        <td>
                          <input
                            onChange={(event) =>
                              updateEntry(index, "outputDelivered", event.target.value)
                            }
                            value={entry.outputDelivered}
                          />
                        </td>
                        <td>
                          <input
                            onChange={(event) =>
                              updateEntry(index, "toolTechnology", event.target.value)
                            }
                            required
                            value={entry.toolTechnology}
                          />
                        </td>
                        <td>
                          <select
                            onChange={(event) =>
                              updateEntry(index, "status", event.target.value)
                            }
                            value={entry.status}
                          >
                            <option value="Done">Done</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Blocked">Blocked</option>
                          </select>
                        </td>
                        <td>
                          <input
                            onChange={(event) =>
                              updateEntry(index, "notesBlocker", event.target.value)
                            }
                            value={entry.notesBlocker}
                          />
                        </td>
                        <td>
                          <button
                            className="icon-button table-icon-button"
                            disabled={entries.length === 1}
                            onClick={() => removeEntry(index)}
                            title="Remove row"
                            type="button"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="daily-log-table-actions">
                <button className="command-button" onClick={addEntry} type="button">
                  <Plus size={18} aria-hidden="true" />
                  Add Row
                </button>
                <div className="total-hours">Total Hours: {totalHours.toFixed(2)}</div>
                <button className="command-button primary" disabled={isBusy} type="submit">
                  <ClipboardCheck size={18} aria-hidden="true" />
                  Submit Log
                </button>
              </div>
            </form>
          </article>
        )}

        <article className="card panel">
          <h2>{isCandidate ? "My Logs" : "Candidate Logs"}</h2>
          <form className="filter-bar daily-log-filters" onSubmit={handleFilterSubmit}>
            {!isCandidate && (
              <select
                className="plain-input"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    candidateId: event.target.value,
                  }))
                }
                value={filters.candidateId}
              >
                <option value="">All candidates</option>
                {candidateOptions.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.label}
                  </option>
                ))}
              </select>
            )}
            <select
              className="plain-input"
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value }))
              }
              value={filters.status}
            >
              <option value="">All statuses</option>
              {workflowStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <input
              className="plain-input"
              onChange={(event) =>
                setFilters((current) => ({ ...current, logDate: event.target.value }))
              }
              type="date"
              value={filters.logDate}
            />
            <button className="command-button primary" type="submit">
              <Filter size={18} aria-hidden="true" />
              Filter
            </button>
          </form>

          <div className="daily-log-list">
            {logs.length === 0 && <p className="row-meta">No daily logs found.</p>}
            {logs.map((log) => {
              const reviewInput = reviewInputs[log.id] ?? {
                status: "approved",
                reviewNote: "",
              };

              return (
                <div className="daily-log-row" key={log.id}>
                  <div className="daily-log-main">
                    <div>
                      <p className="row-title">
                        {log.fullName} / {log.logDate}
                      </p>
                      <p className="row-meta">
                        {log.programName}
                        {log.batchName ? ` / ${log.batchName}` : ""}
                      </p>
                    </div>
                    <span className={`status ${log.status === "approved" ? "success" : ""}`}>
                      {log.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="submitted-log-table-wrap">
                    <table className="submitted-log-table">
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th>Description</th>
                          <th>Type</th>
                          <th>Time</th>
                          <th>Hours</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {log.entries.map((entry, index) => (
                          <tr key={`${log.id}-${index}`}>
                            <td>{entry.taskReference}</td>
                            <td>{entry.taskDescription}</td>
                            <td>{entry.taskType}</td>
                            <td>
                              {entry.startTime} - {entry.endTime}
                            </td>
                            <td>{entry.hours.toFixed(2)}</td>
                            <td>{entry.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="row-meta">
                    Total Hours: {(log.minutesSpent / 60).toFixed(2)}
                  </p>

                  {canReview && (
                    <div className="review-controls">
                      <select
                        className="plain-input"
                        onChange={(event) =>
                          setReviewInputs((current) => ({
                            ...current,
                            [log.id]: {
                              ...reviewInput,
                              status: event.target.value,
                            },
                          }))
                        }
                        value={reviewInput.status}
                      >
                        {reviewStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setReviewInputs((current) => ({
                            ...current,
                            [log.id]: {
                              ...reviewInput,
                              reviewNote: event.target.value,
                            },
                          }))
                        }
                        placeholder="Review note"
                        value={reviewInput.reviewNote}
                      />
                      <button
                        className="command-button primary"
                        disabled={isBusy}
                        onClick={() => void handleReview(log)}
                        type="button"
                      >
                        <CheckCircle2 size={18} aria-hidden="true" />
                        Review
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </AppShell>
  );
}

export default function DailyLogsPage() {
  return <DailyLogsContent />;
}
