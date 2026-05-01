import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, hasRole } from "@/lib/auth/helpers";
import prisma from "@/lib/db";

export async function GET() {
  const authCtx = await getAuthContext();
  if (!authCtx || !hasRole(authCtx, "owner")) {
    return NextResponse.json({ error: "Owner required" }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: authCtx.orgId },
    select: {
      name: true, slug: true, domain: true, logoUrl: true,
      personaFile: true, voiceConfig: true, plan: true,
      tokenBudget: true, tokensUsed: true, billingEmail: true,
    },
  });

  return NextResponse.json(org);
}

export async function PATCH(req: NextRequest) {
  const authCtx = await getAuthContext();
  if (!authCtx || !hasRole(authCtx, "owner")) {
    return NextResponse.json({ error: "Owner required" }, { status: 403 });
  }

  const body = await req.json();
  const allowed = ["name", "personaFile", "voiceConfig", "billingEmail", "tokenBudget"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.organization.update({
    where: { id: authCtx.orgId },
    data,
  });

  return NextResponse.json(updated);
}
