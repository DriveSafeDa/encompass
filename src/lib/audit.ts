/**
 * Audit Log — Immutable, append-only flight recorder.
 * Adapted from ATLAS safety/audit-log.ts pattern.
 * Every query, response, upload, and admin action gets logged.
 */

import prisma from "./db";

export type AuditAction =
  | "query"
  | "response"
  | "doc_upload"
  | "doc_delete"
  | "doc_ingest"
  | "login"
  | "export"
  | "admin_action"
  | "api_call"
  | "memory_extract";

interface AuditDetail {
  query?: string;
  response_summary?: string;
  doc_id?: string;
  doc_title?: string;
  tool_calls?: Array<{ tool: string; success: boolean }>;
  session_id?: string;
  api_key_prefix?: string;
  action_detail?: string;
  token_count?: number;
  latency_ms?: number;
  [key: string]: unknown;
}

/**
 * Append an immutable audit log entry.
 * This NEVER updates or deletes — append only.
 */
export async function logAudit(
  orgId: string,
  action: AuditAction,
  detail: AuditDetail,
  clerkUserId?: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        orgId,
        clerkUserId: clerkUserId || null,
        action,
        detail: detail as any,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  } catch (e) {
    // Audit logging must never block the main flow
    console.error("Audit log failed:", e);
  }
}

/**
 * Query audit logs with filters.
 */
export async function queryAuditLogs(
  orgId: string,
  filters: {
    from?: Date;
    to?: Date;
    userId?: string;
    action?: AuditAction;
    page?: number;
    limit?: number;
  } = {},
) {
  const { from, to, userId, action, page = 1, limit = 50 } = filters;

  const where: Record<string, unknown> = { orgId };
  if (userId) where.clerkUserId = userId;
  if (action) where.action = action;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, limit };
}
