import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, hasRole } from "@/lib/auth/helpers";
import prisma from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authCtx = await getAuthContext();
  if (!authCtx || !hasRole(authCtx, "member")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id, orgId: authCtx.orgId },
    include: {
      sections: {
        orderBy: { sectionIndex: "asc" },
        select: { id: true, sectionIndex: true, heading: true, content: true, pageNumber: true },
      },
      folder: { select: { name: true } },
    },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json(doc);
}
