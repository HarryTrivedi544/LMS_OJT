"use client";

import type { Candidate, CandidateOptions, TaskBrief } from "@lms/api-contracts";
import { workflowStatuses } from "@lms/shared";
import { CheckCircle2, Filter, Hand, Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../components/auth/auth-provider";
import { AppShell } from "../../components/layout/app-shell";
import {
  acknowledgeTaskBrief,
  createTaskBrief,
  listCandidateOptions,
  listCandidates,
  listTaskBriefs,
  reviewTaskBrief,
  submitTaskBrief,
} from "../../lib/api";

const initialFilters = {
  programId: "",
  batchId: "",
  candidateId: "",
  status: "",
};

const initialAssignForm = {
  candidateId: "",
  title: "",
  description: "",
  taskReference: "",
  priority: "medium" as "low" | "medium" | "high",
  dueDate: "",
};

const reviewStatuses = [
  "under_review",
  "approved",
  "rejected",
  "revision_required",
] as const;

function TasksContent() {
  const { accessToken, user } = useAuth();
  const [taskBriefs, setTaskBriefs] = useState<TaskBrief[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateOptions, setCandidateOptions] = useState<CandidateOptions>({
    programs: [],
    batches: [],
  });
  const [filters, setFilters] = useState(initialFilters);
  const [assignForm, setAssignForm] = useState(initialAssignForm);
  const [submitForms, setSubmitForms] = useState<
    Record<string, { submissionSummary: string; submissionDeliverables: string }>
  >({});
  const [reviewInputs, setReviewInputs] = useState<
    Record<string, { status: string; reviewNote: string }>
  >({});
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCandidate = user?.role === "Candidate";
  const canAssign =
    user?.role === "Super Admin" ||
    user?.role === "Program Admin" ||
    user?.role === "Program Lead";
  const canReview = canAssign;

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

  const assignableCandidates = useMemo(
    () =>
      candidates.map((candidate) => ({
        id: candidate.id,
        label: `${candidate.fullName} (${candidate.candidateCode})`,
      })),
    [candidates],
  );

  const loadTaskBriefs = async (nextFilters = filters) => {
    if (!accessToken) {
      return;
    }

    const data = await listTaskBriefs(accessToken, nextFilters);
    setTaskBriefs(data);
  };

  const loadPageData = async () => {
    if (!accessToken) {
      return;
    }

    setError(null);
    const [nextTaskBriefs, nextCandidates, nextOptions] = await Promise.all([
      listTaskBriefs(accessToken, filters),
      listCandidates(accessToken),
      listCandidateOptions(accessToken),
    ]);
    setTaskBriefs(nextTaskBriefs);
    setCandidates(nextCandidates);
    setCandidateOptions(nextOptions);
  };

  useEffect(() => {
    void loadPageData().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load tasks.");
    });
  }, [accessToken]);

  const handleFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await loadTaskBriefs(filters);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to filter tasks.");
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

  const handleAssignTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !canAssign) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const assignedTask = await createTaskBrief(accessToken, {
        candidateId: assignForm.candidateId,
        title: assignForm.title,
        description: assignForm.description,
        taskReference: assignForm.taskReference || undefined,
        priority: assignForm.priority,
        dueDate: assignForm.dueDate || undefined,
      });
      setMessage(`Assigned task "${assignedTask.title}" to ${assignedTask.fullName}.`);
      setAssignForm(initialAssignForm);
      await loadTaskBriefs();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Failed to assign task.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleAcknowledge = async (taskBrief: TaskBrief) => {
    if (!accessToken || !isCandidate) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const acknowledgedTask = await acknowledgeTaskBrief(accessToken, taskBrief.id);
      setMessage(`Acknowledged task "${acknowledgedTask.title}".`);
      await loadTaskBriefs();
    } catch (acknowledgeError) {
      setError(
        acknowledgeError instanceof Error
          ? acknowledgeError.message
          : "Failed to acknowledge task.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmitTask = async (taskBrief: TaskBrief) => {
    if (!accessToken || !isCandidate) {
      return;
    }

    const submitForm = submitForms[taskBrief.id] ?? {
      submissionSummary: "",
      submissionDeliverables: "",
    };

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const submittedTask = await submitTaskBrief(accessToken, taskBrief.id, {
        submissionSummary: submitForm.submissionSummary,
        submissionDeliverables: submitForm.submissionDeliverables || undefined,
      });
      setMessage(`Submitted task "${submittedTask.title}".`);
      await loadTaskBriefs();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit task.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleReview = async (taskBrief: TaskBrief) => {
    if (!accessToken || !canReview) {
      return;
    }

    const reviewInput = reviewInputs[taskBrief.id] ?? {
      status: "approved",
      reviewNote: "",
    };

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const reviewedTask = await reviewTaskBrief(accessToken, taskBrief.id, {
        status: reviewInput.status,
        reviewNote: reviewInput.reviewNote || undefined,
      });
      setMessage(`${reviewedTask.fullName}'s task is now ${reviewedTask.status}.`);
      await loadTaskBriefs();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Failed to review task.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AppShell contentClassName="tasks-page" title={isCandidate ? "My Tasks" : "Task Briefs"}>
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
        {canAssign && (
          <article className="card panel">
            <h2>Assign Task Brief</h2>
            <form className="stack-form" onSubmit={handleAssignTask}>
              <label>
                Candidate
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setAssignForm((current) => ({
                      ...current,
                      candidateId: event.target.value,
                    }))
                  }
                  required
                  value={assignForm.candidateId}
                >
                  <option value="">Select candidate</option>
                  {assignableCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Title
                <input
                  className="plain-input"
                  onChange={(event) =>
                    setAssignForm((current) => ({ ...current, title: event.target.value }))
                  }
                  required
                  value={assignForm.title}
                />
              </label>
              <label>
                Description
                <textarea
                  className="plain-input"
                  onChange={(event) =>
                    setAssignForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  required
                  rows={4}
                  value={assignForm.description}
                />
              </label>
              <label>
                Task reference
                <input
                  className="plain-input"
                  onChange={(event) =>
                    setAssignForm((current) => ({
                      ...current,
                      taskReference: event.target.value,
                    }))
                  }
                  value={assignForm.taskReference}
                />
              </label>
              <label>
                Priority
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setAssignForm((current) => ({
                      ...current,
                      priority: event.target.value as "low" | "medium" | "high",
                    }))
                  }
                  value={assignForm.priority}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label>
                Due date
                <input
                  className="plain-input"
                  onChange={(event) =>
                    setAssignForm((current) => ({ ...current, dueDate: event.target.value }))
                  }
                  type="date"
                  value={assignForm.dueDate}
                />
              </label>
              <button className="command-button primary" disabled={isBusy} type="submit">
                <Send size={18} aria-hidden="true" />
                Assign Task
              </button>
            </form>
          </article>
        )}

        <article className="card panel">
          <h2>{isCandidate ? "Assigned Tasks" : "Task Queue"}</h2>
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
            {taskBriefs.length === 0 && <p className="row-meta">No tasks found.</p>}
            {taskBriefs.map((taskBrief) => {
              const submitForm = submitForms[taskBrief.id] ?? {
                submissionSummary: "",
                submissionDeliverables: "",
              };
              const reviewInput = reviewInputs[taskBrief.id] ?? {
                status: "approved",
                reviewNote: "",
              };
              const canAcknowledge =
                isCandidate && taskBrief.status === "draft" && !taskBrief.acknowledgedAt;
              const canSubmit =
                isCandidate &&
                ((taskBrief.status === "draft" && taskBrief.acknowledgedAt) ||
                  taskBrief.status === "revision_required");

              return (
                <div className="daily-log-row" key={taskBrief.id}>
                  <div className="daily-log-main">
                    <div>
                      <p className="row-title">
                        {taskBrief.title}
                        {taskBrief.taskReference ? ` (${taskBrief.taskReference})` : ""}
                      </p>
                      <p className="row-meta">
                        {taskBrief.fullName} / {taskBrief.programName}
                        {taskBrief.batchName ? ` / ${taskBrief.batchName}` : ""}
                      </p>
                      <p className="row-meta">
                        Assigned by {taskBrief.assignedByName}
                        {taskBrief.dueDate ? ` / Due ${taskBrief.dueDate}` : ""}
                        {` / Priority ${taskBrief.priority}`}
                      </p>
                    </div>
                    <span
                      className={`status ${
                        taskBrief.status === "approved" ? "success" : ""
                      }`}
                    >
                      {taskBrief.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <p className="row-meta">{taskBrief.description}</p>

                  {taskBrief.submissionSummary && (
                    <div className="submitted-log-table-wrap">
                      <p className="row-title">Submission</p>
                      <p className="row-meta">{taskBrief.submissionSummary}</p>
                      {taskBrief.submissionDeliverables && (
                        <p className="row-meta">
                          Deliverables: {taskBrief.submissionDeliverables}
                        </p>
                      )}
                    </div>
                  )}

                  {isCandidate && taskBrief.status === "revision_required" && taskBrief.reviewNote && (
                    <p className="form-error">{taskBrief.reviewNote}</p>
                  )}

                  {canAcknowledge && (
                    <button
                      className="command-button"
                      disabled={isBusy}
                      onClick={() => void handleAcknowledge(taskBrief)}
                      type="button"
                    >
                      <Hand size={18} aria-hidden="true" />
                      Acknowledge
                    </button>
                  )}

                  {canSubmit && (
                    <div className="review-controls stack-form">
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setSubmitForms((current) => ({
                            ...current,
                            [taskBrief.id]: {
                              ...submitForm,
                              submissionSummary: event.target.value,
                            },
                          }))
                        }
                        placeholder="Submission summary"
                        required
                        rows={3}
                        value={submitForm.submissionSummary}
                      />
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setSubmitForms((current) => ({
                            ...current,
                            [taskBrief.id]: {
                              ...submitForm,
                              submissionDeliverables: event.target.value,
                            },
                          }))
                        }
                        placeholder="Deliverables (optional)"
                        rows={2}
                        value={submitForm.submissionDeliverables}
                      />
                      <button
                        className="command-button primary"
                        disabled={isBusy}
                        onClick={() => void handleSubmitTask(taskBrief)}
                        type="button"
                      >
                        <Send size={18} aria-hidden="true" />
                        {taskBrief.status === "revision_required" ? "Resubmit" : "Submit"}
                      </button>
                    </div>
                  )}

                  {canReview && taskBrief.status === "submitted" && (
                    <div className="review-controls">
                      <select
                        className="plain-input"
                        onChange={(event) =>
                          setReviewInputs((current) => ({
                            ...current,
                            [taskBrief.id]: {
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
                            [taskBrief.id]: {
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
                        onClick={() => void handleReview(taskBrief)}
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

export default function TasksPage() {
  return <TasksContent />;
}
