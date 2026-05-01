/**
 * Auth Helpers — RBAC with Clerk orgs
 * Adapted from Director auth-helpers.ts
 */

import { auth } from "@clerk/nextjs/server";
import prisma from "../db";

export interface AuthContext {
  clerkUserId: string;
  orgId: string;
  memberId: string;
  memberRole: string;
  memberDept?: string;
  memberName?: string;
}

/**
 * Get authenticated user context from Clerk + DB.
 * Returns null if not authenticated or not a member of any org.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const { userId, orgId: clerkOrgId } = await auth();

  if (!userId) return null;

  // Find the user's org membership
  // For MVP: find the first org they belong to
  const member = await prisma.orgMember.findFirst({
    where: {
      clerkUserId: userId,
      status: "active",
    },
    include: {
      org: { select: { id: true, slug: true, name: true } },
    },
  });

  if (!member) return null;

  return {
    clerkUserId: userId,
    orgId: member.orgId,
    memberId: member.id,
    memberRole: member.role,
    memberDept: member.department || undefined,
    memberName: member.displayName || undefined,
  };
}

/**
 * Require a minimum role level.
 */
export function hasRole(
  authCtx: AuthContext,
  minRole: "viewer" | "member" | "admin" | "owner",
): boolean {
  const roleHierarchy: Record<string, number> = {
    viewer: 0,
    member: 1,
    admin: 2,
    owner: 3,
  };
  return (roleHierarchy[authCtx.memberRole] || 0) >= (roleHierarchy[minRole] || 0);
}

/**
 * Check if user can access a document based on folder policies.
 */
export async function canAccessDocument(
  authCtx: AuthContext,
  documentId: string,
): Promise<boolean> {
  // Admins and owners can access everything
  if (hasRole(authCtx, "admin")) return true;

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      folder: { select: { accessLevel: true, accessRoles: true, accessDepts: true } },
    },
  });

  if (!doc || doc.orgId !== authCtx.orgId) return false;

  // No folder or "all" access level = everyone can see it
  if (!doc.folder || doc.folder.accessLevel === "all") return true;

  const { accessLevel, accessRoles, accessDepts } = doc.folder;

  if (accessLevel === "role" && accessRoles.length > 0) {
    return accessRoles.includes(authCtx.memberRole);
  }

  if (accessLevel === "department" && accessDepts.length > 0) {
    return authCtx.memberDept ? accessDepts.includes(authCtx.memberDept) : false;
  }

  return true;
}
