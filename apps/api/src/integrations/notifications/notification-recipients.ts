import {
  batchAssignments,
  candidates,
  db,
  programAssignments,
  users,
} from "@lms/db";
import { and, eq, isNull } from "drizzle-orm";

export const getCandidateUserId = async (candidateId: string) => {
  const [candidate] = await db
    .select({ userId: candidates.userId })
    .from(candidates)
    .where(and(eq(candidates.id, candidateId), isNull(candidates.deletedAt)))
    .limit(1);

  return candidate?.userId ?? null;
};

export const getReviewerUserIdsForCandidate = async (candidateId: string) => {
  const [candidate] = await db
    .select({
      programId: candidates.programId,
      batchId: candidates.batchId,
    })
    .from(candidates)
    .where(and(eq(candidates.id, candidateId), isNull(candidates.deletedAt)))
    .limit(1);

  if (!candidate) {
    return [];
  }

  const programAdmins = await db
    .select({ userId: programAssignments.userId })
    .from(programAssignments)
    .where(
      and(
        eq(programAssignments.programId, candidate.programId),
        eq(programAssignments.role, "Program Admin"),
        isNull(programAssignments.deletedAt),
      ),
    );

  const batchLeads = candidate.batchId
    ? await db
        .select({ userId: batchAssignments.userId })
        .from(batchAssignments)
        .where(
          and(
            eq(batchAssignments.batchId, candidate.batchId),
            eq(batchAssignments.role, "Program Lead"),
            isNull(batchAssignments.deletedAt),
          ),
        )
    : [];

  const reviewerIds = new Set([
    ...programAdmins.map((row) => row.userId),
    ...batchLeads.map((row) => row.userId),
  ]);

  return [...reviewerIds];
};

export const getProgramAdminUserIdsForCandidate = async (candidateId: string) => {
  const [candidate] = await db
    .select({
      programId: candidates.programId,
    })
    .from(candidates)
    .where(and(eq(candidates.id, candidateId), isNull(candidates.deletedAt)))
    .limit(1);

  if (!candidate) {
    return [];
  }

  const programAdmins = await db
    .select({ userId: programAssignments.userId })
    .from(programAssignments)
    .where(
      and(
        eq(programAssignments.programId, candidate.programId),
        eq(programAssignments.role, "Program Admin"),
        isNull(programAssignments.deletedAt),
      ),
    );

  return [...new Set(programAdmins.map((row) => row.userId))];
};

export const getSuperAdminUserIds = async () => {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.role, "Super Admin"),
        eq(users.status, "active"),
        isNull(users.deletedAt),
      ),
    );

  return [...new Set(rows.map((row) => row.id))];
};

export const getActiveCandidateUserIds = async () => {
  const rows = await db
    .select({ userId: candidates.userId })
    .from(candidates)
    .innerJoin(users, eq(users.id, candidates.userId))
    .where(
      and(
        isNull(candidates.deletedAt),
        eq(candidates.status, "active"),
        eq(users.status, "active"),
        isNull(users.deletedAt),
      ),
    );

  return rows.map((row) => row.userId);
};
