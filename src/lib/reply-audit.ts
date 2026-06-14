import { prisma } from "@/lib/prisma";
import type { SafetyClassification } from "@/lib/review-safety";

export type ReplyAuditAction =
  | "DRAFT_GENERATED"
  | "DRAFT_EDITED"
  | "SENT_TO_GOOGLE"
  | "FAILED"
  | "SAFETY_BLOCKED";

export type ReplyAuditResultStatus = "SUCCESS" | "FAILED" | "BLOCKED";

export async function logReplyAudit({
  reviewId,
  locationId,
  userId,
  action,
  resultStatus,
  draftText,
  errorMessage,
  safetyClassification,
  metadata,
}: {
  reviewId: string;
  locationId: string;
  userId?: string | null;
  action: ReplyAuditAction;
  resultStatus: ReplyAuditResultStatus;
  draftText?: string | null;
  errorMessage?: string | null;
  safetyClassification?: SafetyClassification | null;
  metadata?: Record<string, unknown> | null;
}) {
  return prisma.replyAuditLog.create({
    data: {
      reviewId,
      locationId,
      action,
      resultStatus,
      userId: userId || undefined,
      draftText: draftText || undefined,
      errorMessage: errorMessage || undefined,
      safetyClassification: safetyClassification ? JSON.stringify(safetyClassification) : undefined,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  });
}
