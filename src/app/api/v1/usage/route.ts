import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-keys";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("X-API-Key") || "";
  const keyCtx = await validateApiKey(apiKey);
  if (!keyCtx) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const [org, queryCount, docCount] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: keyCtx.orgId },
      select: { tokensUsed: true, tokenBudget: true, plan: true },
    }),
    prisma.auditLog.count({ where: { orgId: keyCtx.orgId, action: "query" } }),
    prisma.document.count({ where: { orgId: keyCtx.orgId, status: "indexed" } }),
  ]);

  return NextResponse.json({
    tokensUsed: org?.tokensUsed || 0,
    tokenBudget: org?.tokenBudget || 1000000,
    plan: org?.plan || "starter",
    queryCount,
    documentsIndexed: docCount,
  });
}
