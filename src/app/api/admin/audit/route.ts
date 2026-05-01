import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, hasRole } from "@/lib/auth/helpers";
import { queryAuditLogs, AuditAction } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const authCtx = await getAuthContext();
  if (!authCtx || !hasRole(authCtx, "admin")) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const result = await queryAuditLogs(authCtx.orgId, {
    from: params.get("from") ? new Date(params.get("from")!) : undefined,
    to: params.get("to") ? new Date(params.get("to")!) : undefined,
    userId: params.get("userId") || undefined,
    action: (params.get("action") as AuditAction) || undefined,
    page: parseInt(params.get("page") || "1"),
    limit: parseInt(params.get("limit") || "50"),
  });

  return NextResponse.json(result);
}
