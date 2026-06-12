"use client";

import type {
  Candidate,
  CandidateOptions,
  Timesheet,
  TimesheetEntry,
} from "@lms/api-contracts";
import { workflowStatuses } from "@lms/shared";
import { CheckCircle2, Edit3, Filter, Send, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../components/auth/auth-provider";
import { AppShell } from "../../components/layout/app-shell";
import {
  createTimesheet,
  listCandidateOptions,
  listCandidates,
  listTimesheets,
  reviewTimesheet,
  updateTimesheet,
} from "../../lib/api";

type EditableTimesheetEntry = Omit<TimesheetEntry, "minutes">;

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const startOfCurrentWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);

  return toDateInputValue(date);
};

const addDays = (dateValue: string, days: number) => {
  if (!dateValue) {
    return "";
  }

  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);

  return toDateInputValue(date);
};

const createWeekEntries = (weekStartDate: string): EditableTimesheetEntry[] =>
  dayLabels.map((dayLabel, index) => ({
    workDate: addDays(weekStartDate, index),
    dayLabel,
    hours: 0,
    summary: "",
    blockers: "",
  }));

const initialFilters = {
  programId: "",
  batchId: "",
  candidateId: "",
  status: "",
};

const reviewStatuses = [
  "under_review",
  "approved",
  "rejected",
  "revision_required",
] as const;

function TimesheetsContent() {
  const { accessToken, user } = useAuth();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateOptions, setCandidateOptions] = useState<CandidateOptions>({
    programs: [],
    batches: [],
  });
  const [weekStartDate, setWeekStartDate] = useState("");
  const [entries, setEntries] = useState<EditableTimesheetEntry[]>(createWeekEntries(""));
  const [filters, setFilters] = useState(initialFilters);
  const [editingTimesheetId, setEditingTimesheetId] = useState<string | null>(null);
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
  const weekEndDate = addDays(weekStartDate, 6);
  const totalHours = entries.reduce((total, entry) => total + entry.hours, 0);
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

  const loadTimesheets = async (nextFilters = filters) => {
    if (!accessToken) {
      return;
    }

    const data = await listTimesheets(accessToken, nextFilters);
    setTimesheets(data);
  };

  const loadPageData = async () => {
    if (!accessToken) {
      return;
    }

    setError(null);
    const [nextTimesheets, nextCandidates, nextOptions] = await Promise.all([
      listTimesheets(accessToken, filters),
      listCandidates(accessToken),
      listCandidateOptions(accessToken),
    ]);
    setTimesheets(nextTimesheets);
    setCandidates(nextCandidates);
    setCandidateOptions(nextOptions);
  };

  useEffect(() => {
    void loadPageData().catch((loadError) => {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load timesheets.",
      );
    });
  }, [accessToken]);

  useEffect(() => {
    setWeekStartDate((current) => {
      if (current) {
        return current;
      }

      const nextWeekStart = startOfCurrentWeek();
      setEntries(createWeekEntries(nextWeekStart));
      return nextWeekStart;
    });
  }, []);

  const handleWeekChange = (value: string) => {
    if (editingTimesheetId) {
      return;
    }

    setWeekStartDate(value);
    setEntries(createWeekEntries(value));
  };

  const updateEntry = (
    index: number,
    field: keyof EditableTimesheetEntry,
    value: string | number,
  ) => {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const resetForm = () => {
    const currentWeekStart = startOfCurrentWeek();
    setEditingTimesheetId(null);
    setWeekStartDate(currentWeekStart);
    setEntries(createWeekEntries(currentWeekStart));
  };

  const startRevision = (timesheet: Timesheet) => {
    setEditingTimesheetId(timesheet.id);
    setWeekStartDate(timesheet.weekStartDate);
    setEntries(
      timesheet.entries.map((entry) => ({
        workDate: entry.workDate,
        dayLabel: entry.dayLabel,
        hours: entry.hours,
        summary: entry.summary ?? "",
        blockers: entry.blockers ?? "",
      })),
    );
    setError(null);
    setMessage("Loaded revision-required timesheet for editing.");
  };

  const handleSubmitTimesheet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !isCandidate) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const submittedTimesheet = editingTimesheetId
        ? await updateTimesheet(accessToken, editingTimesheetId, { entries })
        : await createTimesheet(accessToken, {
            weekStartDate,
            weekEndDate,
            entries,
          });
      setMessage(`Submitted timesheet for week ${submittedTimesheet.weekStartDate}.`);
      resetForm();
      await loadTimesheets();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to submit timesheet.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await loadTimesheets(filters);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to filter timesheets.",
      );
    }
  };

  const handleProgramFilterChange = (programId: string) => {
    setFilters((current) => ({
      ...current,
      programId,
      batchId: "",
      candidateId: "",
    }));
  };

  const handleBatchFilterChange = (batchId: string) => {
    setFilters((current) => ({
      ...current,
      batchId,
      candidateId: "",
    }));
  };

  const handleReview = async (timesheet: Timesheet) => {
    if (!accessToken || !canReview) {
      return;
    }

    const input = reviewInputs[timesheet.id] ?? {
      status: "approved",
      reviewNote: "",
    };

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const reviewedTimesheet = await reviewTimesheet(accessToken, timesheet.id, {
        status: input.status,
        reviewNote: input.reviewNote || undefined,
      });
      setMessage(
        `${reviewedTimesheet.fullName}'s timesheet is now ${reviewedTimesheet.status}.`,
      );
      await loadTimesheets();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error ? reviewError.message : "Failed to review timesheet.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AppShell contentClassName="timesheets-page" title="Timesheets">
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
          <article className="card panel timesheet-entry-panel">
            <div className="section-heading">
              <h2>{editingTimesheetId ? "Revise Weekly Timesheet" : "Submit Weekly Timesheet"}</h2>
              <label className="date-inline">
                <span>Week start</span>
                <input
                  className="plain-input"
                  disabled={Boolean(editingTimesheetId)}
                  onChange={(event) => handleWeekChange(event.target.value)}
                  required
                  type="date"
                  value={weekStartDate}
                />
              </label>
            </div>

            <form onSubmit={handleSubmitTimesheet}>
              <div className="daily-log-table-wrap">
                <table className="daily-log-table timesheet-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Date</th>
                      <th>Hours</th>
                      <th>Summary</th>
                      <th>Blockers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr key={entry.workDate}>
                        <td>{entry.dayLabel}</td>
                        <td>{entry.workDate}</td>
                        <td>
                          <input
                            min="0"
                            max="24"
                            onChange={(event) =>
                              updateEntry(index, "hours", Number(event.target.value))
                            }
                            required
                            step="0.25"
                            type="number"
                            value={entry.hours}
                          />
                        </td>
                        <td>
                          <input
                            onChange={(event) =>
                              updateEntry(index, "summary", event.target.value)
                            }
                            placeholder="Required when hours are added"
                            value={entry.summary}
                          />
                        </td>
                        <td>
                          <input
                            onChange={(event) =>
                              updateEntry(index, "blockers", event.target.value)
                            }
                            value={entry.blockers}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="daily-log-table-actions">
                {editingTimesheetId && (
                  <button className="command-button" onClick={resetForm} type="button">
                    <X size={18} aria-hidden="true" />
                    Cancel Revision
                  </button>
                )}
                <div className="total-hours">Total Hours: {totalHours.toFixed(2)}</div>
                <button className="command-button primary" disabled={isBusy} type="submit">
                  <Send size={18} aria-hidden="true" />
                  {editingTimesheetId ? "Resubmit Timesheet" : "Submit Timesheet"}
                </button>
              </div>
            </form>
          </article>
        )}

        <article className="card panel">
          <h2>{isCandidate ? "My Timesheets" : "Candidate Timesheets"}</h2>
          <form className="filter-bar timesheet-filters" onSubmit={handleFilterSubmit}>
            {!isCandidate && (
              <>
                <select
                  className="plain-input"
                  onChange={(event) => handleProgramFilterChange(event.target.value)}
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
                  onChange={(event) => handleBatchFilterChange(event.target.value)}
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
                    setFilters((current) => ({
                      ...current,
                      candidateId: event.target.value,
                    }))
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
            <button className="command-button primary" type="submit">
              <Filter size={18} aria-hidden="true" />
              Filter
            </button>
          </form>

          <div className="daily-log-list">
            {timesheets.length === 0 && <p className="row-meta">No timesheets found.</p>}
            {timesheets.map((timesheet) => {
              const reviewInput = reviewInputs[timesheet.id] ?? {
                status: "approved",
                reviewNote: "",
              };

              return (
                <div className="daily-log-row" key={timesheet.id}>
                  <div className="daily-log-main">
                    <div>
                      <p className="row-title">
                        {timesheet.fullName} / {timesheet.weekStartDate} to{" "}
                        {timesheet.weekEndDate}
                      </p>
                      <p className="row-meta">
                        {timesheet.programName}
                        {timesheet.batchName ? ` / ${timesheet.batchName}` : ""}
                      </p>
                    </div>
                    <span
                      className={`status ${
                        timesheet.status === "approved" ? "success" : ""
                      }`}
                    >
                      {timesheet.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="submitted-log-table-wrap">
                    <table className="submitted-log-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Date</th>
                          <th>Hours</th>
                          <th>Summary</th>
                          <th>Blockers</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timesheet.entries.map((entry) => (
                          <tr key={`${timesheet.id}-${entry.workDate}`}>
                            <td>{entry.dayLabel}</td>
                            <td>{entry.workDate}</td>
                            <td>{entry.hours.toFixed(2)}</td>
                            <td>{entry.summary || "-"}</td>
                            <td>{entry.blockers || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="row-meta">
                    Total Hours: {(timesheet.totalMinutes / 60).toFixed(2)}
                  </p>
                  {isCandidate &&
                    timesheet.status === "revision_required" &&
                    timesheet.reviewNote && (
                      <p className="form-error">{timesheet.reviewNote}</p>
                    )}
                  {isCandidate && timesheet.status === "revision_required" && (
                    <button
                      className="command-button"
                      disabled={isBusy}
                      onClick={() => startRevision(timesheet)}
                      type="button"
                    >
                      <Edit3 size={18} aria-hidden="true" />
                      Edit Revision
                    </button>
                  )}

                  {canReview && (
                    <div className="review-controls">
                      <select
                        className="plain-input"
                        onChange={(event) =>
                          setReviewInputs((current) => ({
                            ...current,
                            [timesheet.id]: {
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
                            [timesheet.id]: {
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
                        onClick={() => void handleReview(timesheet)}
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

export default function TimesheetsPage() {
  return <TimesheetsContent />;
}
