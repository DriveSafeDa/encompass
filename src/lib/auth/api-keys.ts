/**
 * API Key authentication for public endpoints.
 * Pattern from LightRAG proxy.
 */

import crypto from "crypto";
import prisma from "../db";

export interface ApiKeyContext {
  orgId: string;
  keyId: string;
  permissions: string[];
}

/**
 * Validate an API key from the X-API-Key header.
 */
export async function validateApiKey(key: string): Promise<ApiKeyContext | null> {
  if (!key) return null;

  const keyHash = crypto.createHash("sha256").update(key).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { org: { select: { id: true } } },
  });

  if (!apiKey) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update last used
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return {
    orgId: apiKey.orgId,
    keyId: apiKey.id,
    permissions: apiKey.permissions,
  };
}

/**
 * Generate a new API key.
 */
export async function generateApiKey(
  orgId: string,
  name: string,
  permissions: string[] = ["query"],
  rateLimit = 100,
): Promise<{ key: string; keyPrefix: string; id: string }> {
  const key = `enc_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  const keyPrefix = key.slice(0, 12);

  const record = await prisma.apiKey.create({
    data: { orgId, name, keyHash, keyPrefix, permissions, rateLimit },
  });

  return { key, keyPrefix, id: record.id };
}
