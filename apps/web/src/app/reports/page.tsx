"use client";

import type { Candidate, CandidateOptions, ReportsOverview } from "@lms/api-contracts";
import { BarChart3, Filter } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../components/auth/auth-provider";
import { AppShell } from "../../components/layout/app-shell";
import {
  getReportsOverview,
  listCandidateOptions,
  listCandidates,
} from "../../lib/api";

const initialFilters = {
  programId: "",
  batchId: "",
  candidateId: "",
};

const emptyOptions: CandidateOptions = {
  programs: [],
  batches: [],
};

const formatPercent = (value: number | null) => (value === null ? "-" : `${value.toFixed(1)}%`);
const formatNumber = (value: number | null) => (value === null ? "-" : value.toFixed(2));

function ReportsContent() {
  const { accessToken, user } = useAuth();
  const [report, setReport] = useState<ReportsOverview | null>(null);
  const [options, setOptions] = useState<CandidateOptions>(emptyOptions);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableBatches = useMemo(
    () =>
      filters.programId
        ? options.batches.filter((batch) => batch.programId === filters.programId)
        : options.batches,
    [filters.programId, options.batches],
  );

  const availableCandidates = useMemo(
    () =>
      candidates.filter(
        (candidate) =>
          (!filters.programId || candidate.programId === filters.programId) &&
          (!filters.batchId || candidate.batchId === filters.batchId),
      ),
    [candidates, filters.batchId, filters.programId],
  );

  const loadPageData = async (nextFilters = filters) => {
    if (!accessToken) {
      return;
    }

    setError(null);
    setIsBusy(true);

    try {
      const [nextReport, nextOptions, nextCandidates] = await Promise.all([
        getReportsOverview(accessToken, nextFilters),
        listCandidateOptions(accessToken),
        listCandidates(accessToken),
      ]);
      setReport(nextReport);
      setOptions(nextOptions);
      setCandidates(nextCandidates);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load reports.");
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    void loadPageData().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load reports.");
    });
  }, [accessToken]);

  const handleProgramChange = (programId: string) => {
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
      candidateId: "",
    }));
  };

  const handleBatchChange = (batchId: string) => {
    setFilters((current) => ({
      ...current,
      batchId,
      candidateId: "",
    }));
  };

  const handleFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadPageData(filters);
  };

  return (
    <AppShell
      allowedRoles={["Super Admin", "Program Admin", "Program Lead"]}
      contentClassName="reports-page"
      title="Reports"
    >
      {(error || isBusy) && (
        <section className="feedback-row" aria-live="polite">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {isBusy && !error && <p className="form-success">Refreshing report data...</p>}
        </section>
      )}

      <section className="card panel">
        <div className="section-heading">
          <h2>Report filters</h2>
        </div>
        <form className="filter-bar reports-filter-bar" onSubmit={handleFilterSubmit}>
          <select
            className="plain-input"
            onChange={(event) => handleProgramChange(event.target.value)}
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
            onChange={(event) => handleBatchChange(event.target.value)}
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
                {candidate.fullName} ({candidate.candidateCode})
              </option>
            ))}
          </select>
          <button className="command-button primary" type="submit">
            <Filter size={16} aria-hidden="true" />
            Apply
          </button>
        </form>
      </section>

      <section className="grid stats reports-stats">
        <article className="card metric">
          <div className="metric-header">
            <span>Candidates</span>
            <BarChart3 size={18} aria-hidden="true" />
          </div>
          <p className="metric-value">{report?.summary.candidateCount ?? 0}</p>
          <p className="metric-note">
            Active {report?.summary.activeCandidateCount ?? 0}
          </p>
        </article>
        <article className="card metric">
          <div className="metric-header">
            <span>Monthly KPI</span>
            <BarChart3 size={18} aria-hidden="true" />
          </div>
          <p className="metric-value">
            {formatNumber(report?.summary.overallAverageMonthlyKpiScore ?? null)}
          </p>
          <p className="metric-note">
            Completed {report?.summary.completedMonthlyKpiCount ?? 0}
          </p>
        </article>
        <article className="card metric">
          <div className="metric-header">
            <span>Quarterly KPI</span>
            <BarChart3 size={18} aria-hidden="true" />
          </div>
          <p className="metric-value">
            {formatNumber(report?.summary.overallAverageQuarterlyKpiScore ?? null)}
          </p>
          <p className="metric-note">
            Completed {report?.summary.completedQuarterlySummaryCount ?? 0}
          </p>
        </article>
        <article className="card metric">
          <div className="metric-header">
            <span>Promotions</span>
            <BarChart3 size={18} aria-hidden="true" />
          </div>
          <p className="metric-value">{report?.summary.activePromotionReviewCount ?? 0}</p>
          <p className="metric-note">
            Approved {report?.summary.approvedPromotionCount ?? 0}
          </p>
        </article>
      </section>

      <section className="grid reports-grid">
        <article className="card panel">
          <div className="section-heading">
            <h2>Candidate Progress Report</h2>
          </div>
          <div className="submitted-log-table-wrap">
            <table className="submitted-log-table reports-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Program / Batch</th>
                  <th>Monthly KPI Avg</th>
                  <th>Latest Quarter</th>
                  <th>Total Hours</th>
                  <th>Tasks Approved</th>
                  <th>Promotion</th>
                </tr>
              </thead>
              <tbody>
                {report?.candidateProgress.map((row) => (
                  <tr key={row.candidateId}>
                    <td>
                      <strong>{row.fullName}</strong>
                      <div className="row-meta">{row.candidateCode}</div>
                    </td>
                    <td>
                      {row.programName}
                      <div className="row-meta">{row.batchName ?? "No batch"}</div>
                    </td>
                    <td>{formatNumber(row.monthlyKpiAverage)}</td>
                    <td>
                      {row.latestQuarterlyLabel ?? "-"}
                      <div className="row-meta">
                        {row.latestQuarterlyOutcome?.replaceAll("_", " ") ?? "No summary"}
                      </div>
                    </td>
                    <td>{formatNumber(row.totalLoggedHours)}</td>
                    <td>
                      {row.taskApprovedCount}/{row.taskAssignedCount}
                    </td>
                    <td>{row.activePromotionStatus?.replaceAll("_", " ") ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card panel">
          <div className="section-heading">
            <h2>Program and Batch Performance</h2>
          </div>
          <div className="submitted-log-table-wrap">
            <table className="submitted-log-table reports-table">
              <thead>
                <tr>
                  <th>Scope</th>
                  <th>Candidates</th>
                  <th>Monthly KPI Avg</th>
                  <th>Quarterly KPI Avg</th>
                  <th>Daily Log Rate</th>
                  <th>Timesheet Rate</th>
                  <th>Promotion Ready</th>
                </tr>
              </thead>
              <tbody>
                {report?.scopePerformance.map((row) => (
                  <tr key={`${row.scopeType}-${row.scopeId}`}>
                    <td>
                      <strong>{row.scopeName}</strong>
                      <div className="row-meta">
                        {row.scopeType === "program" ? "Program" : row.programName}
                      </div>
                    </td>
                    <td>
                      {row.activeCandidateCount}/{row.candidateCount}
                    </td>
                    <td>{formatNumber(row.averageMonthlyKpiScore)}</td>
                    <td>{formatNumber(row.averageQuarterlyKpiScore)}</td>
                    <td>{formatPercent(row.dailyLogApprovalRate)}</td>
                    <td>{formatPercent(row.timesheetApprovalRate)}</td>
                    <td>
                      {row.promotionReadyCount}
                      <div className="row-meta">
                        Revision required {row.revisionRequiredCount}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card panel">
          <div className="section-heading">
            <h2>Monthly KPI Report</h2>
          </div>
          <div className="submitted-log-table-wrap">
            <table className="submitted-log-table reports-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Period</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Improvement</th>
                  <th>Promotion Signal</th>
                </tr>
              </thead>
              <tbody>
                {report?.monthlyKpi.map((row) => (
                  <tr key={row.reviewId}>
                    <td>
                      <strong>{row.fullName}</strong>
                      <div className="row-meta">{row.programName}</div>
                    </td>
                    <td>{row.reviewPeriod}</td>
                    <td>{row.overallScore ?? "-"}</td>
                    <td>{row.status.replaceAll("_", " ")}</td>
                    <td>{row.improvementRequired ? "Required" : "No"}</td>
                    <td>
                      {row.readyForPromotion ? "Ready" : row.promotionWatch ? "Watch" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card panel">
          <div className="section-heading">
            <h2>Quarterly KPI Summary Report</h2>
          </div>
          <div className="submitted-log-table-wrap">
            <table className="submitted-log-table reports-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Quarter</th>
                  <th>Average</th>
                  <th>Outcome</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {report?.quarterlyKpi.map((row) => (
                  <tr key={row.summaryId}>
                    <td>
                      <strong>{row.fullName}</strong>
                      <div className="row-meta">{row.programName}</div>
                    </td>
                    <td>
                      Q{row.reviewQuarter} {row.reviewYear}
                    </td>
                    <td>{formatNumber(row.quarterlyAverageScore)}</td>
                    <td>{row.outcome?.replaceAll("_", " ") ?? "-"}</td>
                    <td>{formatNumber(row.totalQuarterlyHours)}</td>
                    <td>{row.status.replaceAll("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card panel">
          <div className="section-heading">
            <h2>Phase Promotion Pipeline</h2>
          </div>
          <div className="reports-chip-row">
            <span className="status">Draft {report?.promotionPipeline.summary.draft ?? 0}</span>
            <span className="status">
              Submitted {report?.promotionPipeline.summary.submitted ?? 0}
            </span>
            <span className="status">
              Under review {report?.promotionPipeline.summary.underReview ?? 0}
            </span>
            <span className="status warning">
              Revision {report?.promotionPipeline.summary.revisionRequired ?? 0}
            </span>
            <span className="status success">
              Approved {report?.promotionPipeline.summary.approved ?? 0}
            </span>
            <span className="status">Rejected {report?.promotionPipeline.summary.rejected ?? 0}</span>
          </div>
          <div className="submitted-log-table-wrap">
            <table className="submitted-log-table reports-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Phase Move</th>
                  <th>Status</th>
                  <th>Program Admin</th>
                  <th>Super Admin</th>
                  <th>Effective</th>
                </tr>
              </thead>
              <tbody>
                {report?.promotionPipeline.records.map((row) => (
                  <tr key={row.reviewId}>
                    <td>
                      <strong>{row.fullName}</strong>
                      <div className="row-meta">{row.programName}</div>
                    </td>
                    <td>
                      {row.currentPhase} to {row.proposedNextPhase}
                      <div className="row-meta">{row.proposedNextDesignation}</div>
                    </td>
                    <td>{row.status.replaceAll("_", " ")}</td>
                    <td>{row.programAdminDecision?.replaceAll("_", " ") ?? "-"}</td>
                    <td>{row.superAdminDecision?.replaceAll("_", " ") ?? "-"}</td>
                    <td>{row.promotionEffectiveDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card panel">
          <div className="section-heading">
            <h2>Submission Compliance Report</h2>
          </div>
          <div className="submitted-log-table-wrap">
            <table className="submitted-log-table reports-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Daily Logs</th>
                  <th>Timesheets</th>
                  <th>Tasks</th>
                  <th>Daily Rate</th>
                  <th>Timesheet Rate</th>
                  <th>Task Rate</th>
                </tr>
              </thead>
              <tbody>
                {report?.submissionCompliance.map((row) => (
                  <tr key={row.candidateId}>
                    <td>
                      <strong>{row.fullName}</strong>
                      <div className="row-meta">
                        {row.candidateCode} · {row.batchName ?? "No batch"}
                      </div>
                    </td>
                    <td>
                      {row.dailyLogApprovedCount}/{row.dailyLogSubmittedCount}
                    </td>
                    <td>
                      {row.timesheetApprovedCount}/{row.timesheetSubmittedCount}
                    </td>
                    <td>
                      {row.taskApprovedCount}/{row.taskAssignedCount}
                    </td>
                    <td>{formatPercent(row.dailyLogApprovalRate)}</td>
                    <td>{formatPercent(row.timesheetApprovalRate)}</td>
                    <td>{formatPercent(row.taskApprovalRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </AppShell>
  );
}

export default function ReportsPage() {
  return <ReportsContent />;
}
