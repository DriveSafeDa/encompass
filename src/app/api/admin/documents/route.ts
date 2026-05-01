import { NextResponse } from "next/server";
import { getAuthContext, hasRole } from "@/lib/auth/helpers";
import prisma from "@/lib/db";

export async function GET() {
  const authCtx = await getAuthContext();
  if (!authCtx || !hasRole(authCtx, "admin")) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  const documents = await prisma.document.findMany({
    where: { orgId: authCtx.orgId },
    select: {
      id: true, title: true, filename: true, category: true,
      status: true, pageCount: true, fileSize: true, createdAt: true, tags: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ documents });
}
