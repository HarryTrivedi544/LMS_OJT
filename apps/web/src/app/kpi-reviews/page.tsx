"use client";

import type { Candidate, CandidateOptions, KpiReview, KpiScoreEntry } from "@lms/api-contracts";
import { CheckCircle2, Filter, Plus, Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../components/auth/auth-provider";
import { AppShell } from "../../components/layout/app-shell";
import {
  completeKpiReview,
  createKpiReview,
  listCandidateOptions,
  listCandidates,
  listKpiReviews,
  updateKpiReview,
} from "../../lib/api";

const initialFilters = {
  programId: "",
  batchId: "",
  candidateId: "",
  status: "",
  reviewPeriod: "",
};

const currentReviewPeriod = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${now.getFullYear()}-${month}`;
};

const createScoreRow = (): KpiScoreEntry => ({
  criterion: "",
  score: 0,
  maxScore: 5,
  notes: "",
});

const initialCreateForm = {
  candidateId: "",
  reviewPeriod: currentReviewPeriod(),
  feedback: "",
  scores: [createScoreRow()],
};

function KpiReviewsContent() {
  const { accessToken, user } = useAuth();
  const [kpiReviews, setKpiReviews] = useState<KpiReview[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateOptions, setCandidateOptions] = useState<CandidateOptions>({
    programs: [],
    batches: [],
  });
  const [filters, setFilters] = useState(initialFilters);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCandidate = user?.role === "Candidate";
  const canManage =
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

  const assignableCandidates = useMemo(
    () =>
      candidates.map((candidate) => ({
        id: candidate.id,
        label: `${candidate.fullName} (${candidate.candidateCode})`,
      })),
    [candidates],
  );

  const loadKpiReviews = async (nextFilters = filters) => {
    if (!accessToken) {
      return;
    }

    const data = await listKpiReviews(accessToken, nextFilters);
    setKpiReviews(data);
  };

  const loadPageData = async () => {
    if (!accessToken) {
      return;
    }

    setError(null);
    const [nextReviews, nextCandidates, nextOptions] = await Promise.all([
      listKpiReviews(accessToken, filters),
      listCandidates(accessToken),
      listCandidateOptions(accessToken),
    ]);
    setKpiReviews(nextReviews);
    setCandidates(nextCandidates);
    setCandidateOptions(nextOptions);
  };

  useEffect(() => {
    void loadPageData().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load KPI reviews.");
    });
  }, [accessToken]);

  const updateScoreRow = (
    index: number,
    field: keyof KpiScoreEntry,
    value: string | number,
  ) => {
    setCreateForm((current) => ({
      ...current,
      scores: current.scores.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry,
      ),
    }));
  };

  const handleCreateReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !canManage) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const createdReview = await createKpiReview(accessToken, {
        candidateId: createForm.candidateId,
        reviewPeriod: createForm.reviewPeriod,
        scores: createForm.scores,
        feedback: createForm.feedback || undefined,
      });
      setMessage(
        `Created KPI review for ${createdReview.fullName} (${createdReview.reviewPeriod}).`,
      );
      setCreateForm(initialCreateForm);
      await loadKpiReviews();
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Failed to create KPI review.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleCompleteReview = async (kpiReview: KpiReview) => {
    if (!accessToken || !canManage) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const completedReview = await completeKpiReview(accessToken, kpiReview.id);
      setMessage(
        `Completed KPI review for ${completedReview.fullName} (${completedReview.reviewPeriod}).`,
      );
      await loadKpiReviews();
    } catch (completeError) {
      setError(
        completeError instanceof Error ? completeError.message : "Failed to complete KPI review.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveDraft = async (kpiReview: KpiReview) => {
    if (!accessToken || !canManage) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const updatedReview = await updateKpiReview(accessToken, kpiReview.id, {
        scores: kpiReview.scores,
        feedback: kpiReview.feedback || undefined,
      });
      setMessage(`Updated draft review for ${updatedReview.fullName}.`);
      await loadKpiReviews();
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "Failed to update KPI review.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AppShell
      contentClassName="kpi-reviews-page"
      title={isCandidate ? "KPI Feedback" : "KPI Reviews"}
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

      <section className="grid daily-logs-grid review-mode">
        {canManage && (
          <article className="card panel">
            <h2>Create KPI Review</h2>
            <form className="stack-form" onSubmit={handleCreateReview}>
              <label>
                Candidate
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      candidateId: event.target.value,
                    }))
                  }
                  required
                  value={createForm.candidateId}
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
                Review period
                <input
                  className="plain-input"
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      reviewPeriod: event.target.value,
                    }))
                  }
                  pattern="\d{4}-\d{2}"
                  placeholder="YYYY-MM"
                  required
                  type="month"
                  value={createForm.reviewPeriod}
                />
              </label>
              <div className="daily-log-table-wrap">
                <table className="daily-log-table">
                  <thead>
                    <tr>
                      <th>Criterion</th>
                      <th>Score</th>
                      <th>Max</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {createForm.scores.map((entry, index) => (
                      <tr key={`create-score-${index}`}>
                        <td>
                          <input
                            onChange={(event) =>
                              updateScoreRow(index, "criterion", event.target.value)
                            }
                            required
                            value={entry.criterion}
                          />
                        </td>
                        <td>
                          <input
                            min="0"
                            onChange={(event) =>
                              updateScoreRow(index, "score", Number(event.target.value))
                            }
                            required
                            type="number"
                            value={entry.score}
                          />
                        </td>
                        <td>
                          <input
                            min="1"
                            onChange={(event) =>
                              updateScoreRow(index, "maxScore", Number(event.target.value))
                            }
                            required
                            type="number"
                            value={entry.maxScore}
                          />
                        </td>
                        <td>
                          <input
                            onChange={(event) =>
                              updateScoreRow(index, "notes", event.target.value)
                            }
                            value={entry.notes ?? ""}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className="command-button"
                onClick={() =>
                  setCreateForm((current) => ({
                    ...current,
                    scores: [...current.scores, createScoreRow()],
                  }))
                }
                type="button"
              >
                <Plus size={18} aria-hidden="true" />
                Add Criterion
              </button>
              <label>
                Feedback
                <textarea
                  className="plain-input"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, feedback: event.target.value }))
                  }
                  rows={3}
                  value={createForm.feedback}
                />
              </label>
              <button className="command-button primary" disabled={isBusy} type="submit">
                <Send size={18} aria-hidden="true" />
                Save Draft Review
              </button>
            </form>
          </article>
        )}

        <article className="card panel">
          <h2>{isCandidate ? "My KPI Feedback" : "Review Queue"}</h2>
          {!isCandidate && (
            <form
              className="filter-bar timesheet-filters"
              onSubmit={(event) => {
                event.preventDefault();
                void loadKpiReviews(filters).catch((loadError) => {
                  setError(
                    loadError instanceof Error ? loadError.message : "Failed to filter reviews.",
                  );
                });
              }}
            >
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
              <input
                className="plain-input"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, reviewPeriod: event.target.value }))
                }
                placeholder="YYYY-MM"
                type="month"
                value={filters.reviewPeriod}
              />
              <button className="command-button primary" type="submit">
                <Filter size={18} aria-hidden="true" />
                Filter
              </button>
            </form>
          )}

          <div className="daily-log-list">
            {kpiReviews.length === 0 && <p className="row-meta">No KPI reviews found.</p>}
            {kpiReviews.map((kpiReview) => (
              <div className="daily-log-row" key={kpiReview.id}>
                <div className="daily-log-main">
                  <div>
                    <p className="row-title">
                      {kpiReview.fullName} / {kpiReview.reviewPeriod}
                    </p>
                    <p className="row-meta">
                      {kpiReview.programName}
                      {kpiReview.batchName ? ` / ${kpiReview.batchName}` : ""}
                    </p>
                    <p className="row-meta">
                      Reviewer: {kpiReview.reviewerName}
                      {kpiReview.overallScore !== null
                        ? ` / Overall ${kpiReview.overallScore}%`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`status ${
                      kpiReview.status === "approved" ? "success" : ""
                    }`}
                  >
                    {kpiReview.status.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="submitted-log-table-wrap">
                  <table className="submitted-log-table">
                    <thead>
                      <tr>
                        <th>Criterion</th>
                        <th>Score</th>
                        <th>Max</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpiReview.scores.map((entry) => (
                        <tr key={`${kpiReview.id}-${entry.criterion}`}>
                          <td>{entry.criterion}</td>
                          <td>{entry.score}</td>
                          <td>{entry.maxScore}</td>
                          <td>{entry.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {kpiReview.feedback && (
                  <p className="row-meta">Feedback: {kpiReview.feedback}</p>
                )}

                {canManage && kpiReview.status === "draft" && (
                  <div className="review-controls">
                    <button
                      className="command-button"
                      disabled={isBusy}
                      onClick={() => void handleSaveDraft(kpiReview)}
                      type="button"
                    >
                      Save Draft
                    </button>
                    <button
                      className="command-button primary"
                      disabled={isBusy}
                      onClick={() => void handleCompleteReview(kpiReview)}
                      type="button"
                    >
                      <CheckCircle2 size={18} aria-hidden="true" />
                      Complete Review
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}

export default function KpiReviewsPage() {
  return <KpiReviewsContent />;
}
