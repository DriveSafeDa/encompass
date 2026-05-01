import { NextResponse } from "next/server";
import { getAuthContext, hasRole } from "@/lib/auth/helpers";
import prisma from "@/lib/db";

export async function GET() {
  const authCtx = await getAuthContext();
  if (!authCtx || !hasRole(authCtx, "admin")) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  const orgId = authCtx.orgId;

  const [queryCount, activeUsers, docCount, org, categories] = await Promise.all([
    prisma.auditLog.count({ where: { orgId, action: "query" } }),
    prisma.orgMember.count({ where: { orgId, status: "active" } }),
    prisma.document.count({ where: { orgId, status: "indexed" } }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { tokensUsed: true, tokenBudget: true },
    }),
    prisma.document.groupBy({
      by: ["category"],
      where: { orgId, status: "indexed" },
      _count: true,
      orderBy: { _count: { category: "desc" } },
    }),
  ]);

  return NextResponse.json({
    totalQueries: queryCount,
    activeUsers,
    documentsIndexed: docCount,
    tokensUsed: org?.tokensUsed || 0,
    tokenBudget: org?.tokenBudget || 1000000,
    unanswered: 0,
    topCategories: categories.map((c) => ({
      category: c.category || "uncategorized",
      count: c._count,
    })),
  });
}
