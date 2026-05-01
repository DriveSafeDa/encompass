/**
 * Seed script: Ingest WelcomeHome CRM data as the first Encompass org.
 * Run with: npx tsx scripts/seed-welcomehome.ts
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { splitDocument } from "../src/lib/ingestion/splitter";
import fs from "fs";
import path from "path";

const DATA_DIR = "C:/Projects/SOLACE/scraper/data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 Seeding Encompass with WelcomeHome CRM data...\n");

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { slug: "pointe-deerfield" },
    create: {
      name: "The Pointe at Deerfield",
      slug: "pointe-deerfield",
      plan: "professional",
      tokenBudget: 5000000,
      personaFile: `# Compass\nYou are Compass, the AI knowledge assistant for The Pointe at Deerfield, a Sinceri Senior Living community.\nYou help sales counselors, administrators, and staff find information about prospects, referrers, occupancy, and community operations.\nYou speak in a professional, warm, and concise tone.`,
    },
    update: {},
  });
  console.log(`✓ Organization: ${org.name} (${org.id})`);

  // 2. Create test member (Stephanie)
  const member = await prisma.orgMember.upsert({
    where: { orgId_clerkUserId: { orgId: org.id, clerkUserId: "test_stephanie" } },
    create: {
      orgId: org.id,
      clerkUserId: "test_stephanie",
      role: "admin",
      displayName: "Stephanie Southern",
      email: "stephanie@pointe.com",
      department: "Sales",
      title: "Sales Counselor",
    },
    update: {},
  });
  console.log(`✓ Member: ${member.displayName} (${member.role})`);

  // 3. Create folders
  const folders: Record<string, string> = {};
  for (const name of ["Prospects", "Referrers", "Activities", "Occupancy", "Reports", "Operations"]) {
    const folder = await prisma.docFolder.upsert({
      where: { id: `folder-${name.toLowerCase()}` },
      create: { id: `folder-${name.toLowerCase()}`, orgId: org.id, name, accessLevel: "all" },
      update: {},
    });
    folders[name] = folder.id;
  }
  console.log(`✓ Created ${Object.keys(folders).length} folders`);

  // 4. Ingest data files
  const filesToIngest: Array<{ filename: string; folder: string; category: string; title: string }> = [
    { filename: "prospects.csv", folder: "Prospects", category: "data", title: "Prospects Export" },
    { filename: "prospects-full.csv", folder: "Prospects", category: "data", title: "Prospects Full Export" },
    { filename: "referrers.csv", folder: "Referrers", category: "data", title: "Referrers Export" },
    { filename: "activities-past-due.csv", folder: "Activities", category: "data", title: "Past Due Activities" },
    { filename: "activities-full.csv", folder: "Activities", category: "data", title: "All Activities" },
    { filename: "dashboard-partials.json", folder: "Operations", category: "report", title: "Dashboard Metrics" },
    { filename: "occupancy.html", folder: "Occupancy", category: "report", title: "Occupancy Report" },
    { filename: "day-planner.html", folder: "Operations", category: "report", title: "Day Planner" },
    { filename: "report-lead-source.html", folder: "Reports", category: "report", title: "Lead Source Analysis" },
    { filename: "report-funnel-inquiry-to-post-tour.html", folder: "Reports", category: "report", title: "Funnel: Inquiry to Post-Tour" },
    { filename: "report-funnel-tour-to-deposit.html", folder: "Reports", category: "report", title: "Funnel: Tour to Deposit" },
    { filename: "report-funnel-post-tour-to-move-in.html", folder: "Reports", category: "report", title: "Funnel: Post-Tour to Move-In" },
    { filename: "report-sales-conversion.html", folder: "Reports", category: "report", title: "Sales Conversion Report" },
    { filename: "report-sales-funnel.html", folder: "Reports", category: "report", title: "Sales Funnel Report" },
    { filename: "report-rent-roll.html", folder: "Reports", category: "financial", title: "Rent Roll Report" },
    { filename: "report-mimo-summary.html", folder: "Reports", category: "report", title: "Move-In/Move-Out Summary" },
    { filename: "report-move-ins-by-lead-source.html", folder: "Reports", category: "report", title: "Move-Ins by Lead Source" },
    { filename: "report-move-ins-by-referrer.html", folder: "Reports", category: "report", title: "Move-Ins by Referrer" },
    { filename: "report-lost-lead.html", folder: "Reports", category: "report", title: "Lost Lead Report" },
    { filename: "report-dwell-time.html", folder: "Reports", category: "report", title: "Dwell Time Report" },
    { filename: "report-move-out-reasons.html", folder: "Reports", category: "report", title: "Move-Out Reasons Report" },
    { filename: "events.html", folder: "Operations", category: "data", title: "Community Events Calendar" },
  ];

  let totalDocs = 0;
  let totalSections = 0;

  for (const file of filesToIngest) {
    const filePath = path.join(DATA_DIR, file.filename);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⏭ Skipped ${file.filename} (not found)`);
      continue;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const fileSize = fs.statSync(filePath).size;
    const crypto = await import("crypto");
    const contentHash = crypto.createHash("sha256").update(content).digest("hex");

    // Extract text based on type
    let text = content;
    if (file.filename.endsWith(".html")) {
      // Simple HTML text extraction
      text = content
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
    } else if (file.filename.endsWith(".json")) {
      // Pretty-print JSON for readability
      try {
        const parsed = JSON.parse(content);
        text = JSON.stringify(parsed, null, 2);
      } catch { /* use raw */ }
    }

    // Create document
    const doc = await prisma.document.upsert({
      where: { orgId_contentHash: { orgId: org.id, contentHash } },
      create: {
        orgId: org.id,
        title: file.title,
        filename: file.filename,
        mimeType: file.filename.endsWith(".csv") ? "text/csv" :
                  file.filename.endsWith(".html") ? "text/html" :
                  file.filename.endsWith(".json") ? "application/json" : "text/plain",
        fileSize,
        r2Key: `${org.id}/${file.filename}`,
        contentHash,
        status: "indexed",
        category: file.category,
        folderId: folders[file.folder],
        lastIndexedAt: new Date(),
      },
      update: { status: "indexed", lastIndexedAt: new Date() },
    });

    // Split into sections
    const sections = splitDocument(text);

    // Delete old sections and create new
    await prisma.documentSection.deleteMany({ where: { documentId: doc.id } });

    if (sections.length > 0) {
      await prisma.documentSection.createMany({
        data: sections.map((s) => ({
          documentId: doc.id,
          sectionIndex: s.index,
          heading: s.heading,
          content: s.content,
          pageNumber: s.pageNumber,
        })),
      });
    }

    totalDocs++;
    totalSections += sections.length;
    console.log(`  ✓ ${file.title}: ${sections.length} sections (${(fileSize / 1024).toFixed(0)} KB)`);
  }

  // 5. Ingest prospect stage data (JSON)
  for (const stage of ["inquiry", "connection", "pre-tour", "post-tour", "deposit", "move-in"]) {
    const jsonPath = path.join(DATA_DIR, `prospects-${stage}.json`);
    if (!fs.existsSync(jsonPath)) continue;

    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const text = JSON.stringify(data, null, 2);
    const crypto = await import("crypto");
    const contentHash = crypto.createHash("sha256").update(text).digest("hex");

    const doc = await prisma.document.upsert({
      where: { orgId_contentHash: { orgId: org.id, contentHash } },
      create: {
        orgId: org.id,
        title: `Prospects - ${stage.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Stage`,
        filename: `prospects-${stage}.json`,
        mimeType: "application/json",
        fileSize: Buffer.byteLength(text),
        r2Key: `${org.id}/prospects-${stage}.json`,
        contentHash,
        status: "indexed",
        category: "data",
        folderId: folders["Prospects"],
        lastIndexedAt: new Date(),
      },
      update: { status: "indexed" },
    });

    const sections = splitDocument(text);
    await prisma.documentSection.deleteMany({ where: { documentId: doc.id } });
    if (sections.length > 0) {
      await prisma.documentSection.createMany({
        data: sections.map((s) => ({
          documentId: doc.id,
          sectionIndex: s.index,
          heading: s.heading,
          content: s.content,
          pageNumber: null,
        })),
      });
    }

    totalDocs++;
    totalSections += sections.length;
    console.log(`  ✓ Prospects ${stage}: ${sections.length} sections`);
  }

  // 6. Create ingestion job record
  await prisma.ingestionJob.create({
    data: {
      orgId: org.id,
      type: "upload",
      source: "welcomehome_scrape",
      status: "completed",
      totalFiles: totalDocs,
      processed: totalDocs,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  console.log(`\n✅ Done! ${totalDocs} documents, ${totalSections} sections ingested.`);
  console.log(`   Org: ${org.name} (${org.slug})`);
  console.log(`   Member: ${member.displayName} (${member.role})`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
