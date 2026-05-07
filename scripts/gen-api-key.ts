import prisma from "../src/lib/db";
import crypto from "crypto";

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  console.log("Organizations:", orgs.map(o => `${o.name} (${o.id})`).join(", "));

  if (orgs.length === 0) {
    console.error("No organizations found. Create one first.");
    process.exit(1);
  }

  const orgId = orgs[0].id;
  const key = "enc_" + crypto.randomBytes(32).toString("hex");
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  const keyPrefix = key.slice(0, 12);

  await prisma.apiKey.create({
    data: {
      orgId,
      name: "n8n-integration",
      keyHash,
      keyPrefix,
      permissions: ["query", "ingest"],
      rateLimit: 100,
    },
  });

  console.log("\n=== ENCOMPASS API KEY (save this — shown once) ===");
  console.log(key);
  console.log("=== Permissions: query, ingest ===");
  console.log("=== Org:", orgs[0].name, "===\n");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
