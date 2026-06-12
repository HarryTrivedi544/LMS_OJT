import {
  calls,
  candidateLogs,
  db,
  evidenceLinks,
  evidenceRegistry,
  files,
  kpiReviews,
  quarterlyKpiSummaries,
  taskBriefs,
  timesheets,
} from "@lms/db";
import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";

import type {
  EvidenceChildEntityType,
  EvidenceLinkRefRecord,
  EvidenceParentEntityType,
  LinkedEvidenceBundleRecord,
} from "./evidence.types.js";

const emptyLinkedEvidence = (): LinkedEvidenceBundleRecord => ({
  dailyLogs: [],
  timesheets: [],
  taskBriefs: [],
  files: [],
  calls: [],
  kpiReviews: [],
  quarterlySummaries: [],
});

export const getMonthDateRange = (reviewPeriod: string) => {
  const [yearText, monthText] = reviewPeriod.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));

  return {
    periodStart: startDate.toISOString().slice(0, 10),
    periodEnd: endDate.toISOString().slice(0, 10),
  };
};

export class EvidenceRepository {
  async buildLinkedEvidenceForPeriod(input: {
    candidateId: string;
    periodStart: string;
    periodEnd: string;
    includeKpiReviews?: boolean;
    includeQuarterlySummaries?: boolean;
    kpiReviewPeriods?: string[];
    fileIds?: string[];
  }): Promise<LinkedEvidenceBundleRecord> {
    const [dailyLogRows, timesheetRows, taskRows, callRows, fileRows] = await Promise.all([
      db
        .select({
          id: candidateLogs.id,
          logDate: candidateLogs.logDate,
          status: candidateLogs.status,
          minutesSpent: candidateLogs.minutesSpent,
          summary: candidateLogs.summary,
        })
        .from(candidateLogs)
        .where(
          and(
            eq(candidateLogs.candidateId, input.candidateId),
            gte(candidateLogs.logDate, input.periodStart),
            lte(candidateLogs.logDate, input.periodEnd),
            isNull(candidateLogs.deletedAt),
          ),
        )
        .orderBy(desc(candidateLogs.logDate)),
      db
        .select({
          id: timesheets.id,
          weekStartDate: timesheets.weekStartDate,
          weekEndDate: timesheets.weekEndDate,
          status: timesheets.status,
          totalMinutes: timesheets.totalMinutes,
        })
        .from(timesheets)
        .where(
          and(
            eq(timesheets.candidateId, input.candidateId),
            gte(timesheets.weekStartDate, input.periodStart),
            lte(timesheets.weekStartDate, input.periodEnd),
            isNull(timesheets.deletedAt),
          ),
        )
        .orderBy(desc(timesheets.weekStartDate)),
      db
        .select({
          id: taskBriefs.id,
          title: taskBriefs.title,
          status: taskBriefs.status,
          dueDate: taskBriefs.dueDate,
          submittedAt: taskBriefs.submittedAt,
          createdAt: taskBriefs.createdAt,
        })
        .from(taskBriefs)
        .where(
          and(
            eq(taskBriefs.candidateId, input.candidateId),
            gte(
              sql<string>`coalesce(${taskBriefs.submittedAt}::date, ${taskBriefs.createdAt}::date)`,
              input.periodStart,
            ),
            lte(
              sql<string>`coalesce(${taskBriefs.submittedAt}::date, ${taskBriefs.createdAt}::date)`,
              input.periodEnd,
            ),
            isNull(taskBriefs.deletedAt),
          ),
        )
        .orderBy(desc(taskBriefs.createdAt)),
      db
        .select({
          id: calls.id,
          title: calls.title,
          status: calls.status,
          scheduledStartAt: calls.scheduledStartAt,
        })
        .from(calls)
        .where(
          and(
            eq(calls.candidateId, input.candidateId),
            gte(sql<string>`${calls.scheduledStartAt}::date`, input.periodStart),
            lte(sql<string>`${calls.scheduledStartAt}::date`, input.periodEnd),
            isNull(calls.deletedAt),
          ),
        )
        .orderBy(desc(calls.scheduledStartAt)),
      this.listCandidateFiles(input.candidateId, input.periodStart, input.periodEnd, input.fileIds),
    ]);

    const bundle = emptyLinkedEvidence();

    bundle.dailyLogs = dailyLogRows.map((row) => ({
      entityType: "candidate_log",
      entityId: row.id,
      label: `Daily log ${row.logDate}`,
      status: row.status,
      occurredAt: row.logDate,
      summary: row.summary,
      metadata: {
        minutesSpent: row.minutesSpent,
      },
    }));

    bundle.timesheets = timesheetRows.map((row) => ({
      entityType: "timesheet",
      entityId: row.id,
      label: `Timesheet ${row.weekStartDate} to ${row.weekEndDate}`,
      status: row.status,
      occurredAt: row.weekStartDate,
      summary: `${(row.totalMinutes / 60).toFixed(1)} hours`,
      metadata: {
        totalMinutes: row.totalMinutes,
        weekEndDate: row.weekEndDate,
      },
    }));

    bundle.taskBriefs = taskRows.map((row) => ({
      entityType: "task_brief",
      entityId: row.id,
      label: row.title,
      status: row.status,
      occurredAt: row.submittedAt?.toISOString() ?? row.createdAt.toISOString(),
      summary: row.dueDate ? `Due ${row.dueDate}` : null,
      metadata: {
        dueDate: row.dueDate,
      },
    }));

    bundle.calls = callRows.map((row) => ({
      entityType: "call",
      entityId: row.id,
      label: row.title,
      status: row.status,
      occurredAt: row.scheduledStartAt.toISOString(),
      summary: null,
      metadata: {},
    }));

    bundle.files = fileRows.map((row) => ({
      entityType: "file",
      entityId: row.id,
      label: row.originalName,
      status: row.module,
      occurredAt: row.createdAt.toISOString(),
      summary: row.mimeType,
      metadata: {
        module: row.module,
        sizeBytes: row.sizeBytes,
      },
    }));

    if (input.includeKpiReviews && input.kpiReviewPeriods && input.kpiReviewPeriods.length > 0) {
      const kpiRows = await db
        .select({
          id: kpiReviews.id,
          reviewPeriod: kpiReviews.reviewPeriod,
          overallScore: kpiReviews.overallScore,
          status: kpiReviews.status,
        })
        .from(kpiReviews)
        .where(
          and(
            eq(kpiReviews.candidateId, input.candidateId),
            inArray(kpiReviews.reviewPeriod, input.kpiReviewPeriods),
            isNull(kpiReviews.deletedAt),
          ),
        )
        .orderBy(desc(kpiReviews.reviewPeriod));

      bundle.kpiReviews = kpiRows.map((row) => ({
        entityType: "kpi_review",
        entityId: row.id,
        label: `Monthly KPI ${row.reviewPeriod}`,
        status: row.status,
        occurredAt: row.reviewPeriod,
        summary: row.overallScore !== null ? `Score ${row.overallScore}/100` : null,
        metadata: {
          overallScore: row.overallScore,
        },
      }));
    }

    if (input.includeQuarterlySummaries) {
      const quarterlyRows = await db
        .select({
          id: quarterlyKpiSummaries.id,
          reviewYear: quarterlyKpiSummaries.reviewYear,
          reviewQuarter: quarterlyKpiSummaries.reviewQuarter,
          status: quarterlyKpiSummaries.status,
          rollup: quarterlyKpiSummaries.rollup,
        })
        .from(quarterlyKpiSummaries)
        .where(
          and(
            eq(quarterlyKpiSummaries.candidateId, input.candidateId),
            gte(quarterlyKpiSummaries.reviewPeriodStart, input.periodStart),
            lte(quarterlyKpiSummaries.reviewPeriodEnd, input.periodEnd),
            isNull(quarterlyKpiSummaries.deletedAt),
          ),
        )
        .orderBy(
          desc(quarterlyKpiSummaries.reviewYear),
          desc(quarterlyKpiSummaries.reviewQuarter),
        );

      bundle.quarterlySummaries = quarterlyRows.map((row) => {
        const rollup =
          row.rollup && typeof row.rollup === "object"
            ? (row.rollup as { quarterlyAverageScore?: number | null })
            : null;

        return {
          entityType: "quarterly_kpi_summary",
          entityId: row.id,
          label: `Q${row.reviewQuarter} ${row.reviewYear}`,
          status: row.status,
          occurredAt: `${row.reviewYear}-Q${row.reviewQuarter}`,
          summary:
            rollup?.quarterlyAverageScore !== null && rollup?.quarterlyAverageScore !== undefined
              ? `Quarterly average ${rollup.quarterlyAverageScore}/100`
              : null,
          metadata: {
            reviewYear: row.reviewYear,
            reviewQuarter: row.reviewQuarter,
          },
        };
      });
    }

    return bundle;
  }

  async buildMonthlyLinkedEvidence(input: {
    candidateId: string;
    reviewPeriod: string;
  }): Promise<LinkedEvidenceBundleRecord> {
    const { periodStart, periodEnd } = getMonthDateRange(input.reviewPeriod);

    return this.buildLinkedEvidenceForPeriod({
      candidateId: input.candidateId,
      periodStart,
      periodEnd,
    });
  }

  async syncEvidenceLinks(input: {
    parentEntityType: EvidenceParentEntityType;
    parentEntityId: string;
    candidateId: string;
    bundle: LinkedEvidenceBundleRecord;
    actorId?: string;
  }) {
    const links = this.flattenBundle(input.bundle);

    await db
      .update(evidenceLinks)
      .set({
        deletedAt: new Date(),
        deletedBy: input.actorId,
        isActive: false,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(
        and(
          eq(evidenceLinks.parentEntityType, input.parentEntityType),
          eq(evidenceLinks.parentEntityId, input.parentEntityId),
          isNull(evidenceLinks.deletedAt),
        ),
      );

    if (links.length === 0) {
      return;
    }

    await db.insert(evidenceLinks).values(
      links.map((link) => ({
        parentEntityType: input.parentEntityType,
        parentEntityId: input.parentEntityId,
        childEntityType: link.entityType,
        childEntityId: link.entityId,
        linkSource: "auto_derived",
        metadata: {
          label: link.label,
          status: link.status,
          occurredAt: link.occurredAt,
          summary: link.summary,
          ...link.metadata,
        },
        createdBy: input.actorId,
        updatedBy: input.actorId,
      })),
    );

    await Promise.all(
      links.map((link) =>
        this.ensureRegistryEntry({
          candidateId: input.candidateId,
          entityType: link.entityType,
          entityId: link.entityId,
          evidenceType: input.parentEntityType,
          metadata: {
            linkedParentType: input.parentEntityType,
            linkedParentId: input.parentEntityId,
            label: link.label,
          },
          actorId: input.actorId,
        }),
      ),
    );
  }

  private async listCandidateFiles(
    candidateId: string,
    periodStart: string,
    periodEnd: string,
    explicitFileIds?: string[],
  ) {
    const fileConditions = [
      eq(files.candidateId, candidateId),
      isNull(files.deletedAt),
    ];

    if (explicitFileIds && explicitFileIds.length > 0) {
      fileConditions.push(
        or(
          inArray(files.id, explicitFileIds),
          and(
            gte(sql<string>`${files.createdAt}::date`, periodStart),
            lte(sql<string>`${files.createdAt}::date`, periodEnd),
          ),
        )!,
      );
    } else {
      fileConditions.push(
        gte(sql<string>`${files.createdAt}::date`, periodStart),
        lte(sql<string>`${files.createdAt}::date`, periodEnd),
      );
    }

    return db
      .select({
        id: files.id,
        originalName: files.originalName,
        mimeType: files.mimeType,
        sizeBytes: files.sizeBytes,
        module: files.module,
        createdAt: files.createdAt,
      })
      .from(files)
      .where(and(...fileConditions))
      .orderBy(desc(files.createdAt));
  }

  private flattenBundle(bundle: LinkedEvidenceBundleRecord): EvidenceLinkRefRecord[] {
    return [
      ...bundle.dailyLogs,
      ...bundle.timesheets,
      ...bundle.taskBriefs,
      ...bundle.files,
      ...bundle.calls,
      ...bundle.kpiReviews,
      ...bundle.quarterlySummaries,
    ];
  }

  private async ensureRegistryEntry(input: {
    candidateId: string;
    entityType: EvidenceChildEntityType;
    entityId: string;
    evidenceType: string;
    metadata: Record<string, unknown>;
    actorId?: string;
  }) {
    const [existing] = await db
      .select({ id: evidenceRegistry.id })
      .from(evidenceRegistry)
      .where(
        and(
          eq(evidenceRegistry.entityType, input.entityType),
          eq(evidenceRegistry.entityId, input.entityId),
          isNull(evidenceRegistry.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      return;
    }

    await db.insert(evidenceRegistry).values({
      candidateId: input.candidateId,
      entityType: input.entityType,
      entityId: input.entityId,
      evidenceType: input.evidenceType,
      metadata: input.metadata,
      createdBy: input.actorId,
      updatedBy: input.actorId,
    });
  }
}
