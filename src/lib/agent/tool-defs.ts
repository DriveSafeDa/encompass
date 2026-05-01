/**
 * Encompass Tool Definitions — Claude tool_use schemas
 * 10 tools for enterprise knowledge operations.
 * Adapted from Compass tool-defs.ts pattern.
 */

import Anthropic from "@anthropic-ai/sdk";

export const encompassTools: Anthropic.Messages.Tool[] = [
  {
    name: "query_knowledge",
    description:
      "Search the organization's knowledge base using hybrid vector + graph retrieval. Returns relevant document sections with source metadata. Use this as the primary way to find information.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query in natural language",
        },
        mode: {
          type: "string",
          enum: ["hybrid", "local", "global"],
          description: "Search mode: hybrid (default, best results), local (nearby context), global (broad themes)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_documents",
    description:
      "Search document metadata (titles, categories, tags, dates). Use this to find specific documents by name or type, or to list documents matching criteria like 'all contracts' or 'reports from Q3'.",
    input_schema: {
      type: "object" as const,
      properties: {
        search: {
          type: "string",
          description: "Search term to match against document titles, categories, and tags",
        },
        category: {
          type: "string",
          description: "Filter by category: policy, procedure, contract, report, meeting_notes, training, handbook, financial, legal, correspondence",
        },
        folder: {
          type: "string",
          description: "Filter by folder name",
        },
      },
      required: [],
    },
  },
  {
    name: "read_section",
    description:
      "Read a specific document section by its ID. Use this after query_knowledge returns a relevant section and you need the full content for a detailed answer.",
    input_schema: {
      type: "object" as const,
      properties: {
        sectionId: {
          type: "string",
          description: "The section ID from a previous query_knowledge result",
        },
      },
      required: ["sectionId"],
    },
  },
  {
    name: "cross_reference",
    description:
      "Run multiple knowledge queries and synthesize the results. Use this for comparing documents, finding connections, or answering questions that span multiple sources.",
    input_schema: {
      type: "object" as const,
      properties: {
        queries: {
          type: "array",
          items: { type: "string" },
          description: "List of search queries to run and synthesize (2-5 queries)",
        },
        objective: {
          type: "string",
          description: "What you're trying to learn from cross-referencing these sources",
        },
      },
      required: ["queries", "objective"],
    },
  },
  {
    name: "generate_report",
    description:
      "Generate a formatted HTML report from knowledge base data. The report is delivered directly to the user's screen. Use for occupancy reports, pipeline summaries, competitive analyses, activity breakdowns, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        report_type: {
          type: "string",
          description: "Type of report: occupancy, pipeline, activity, referral, conversion, competitive, custom",
        },
        title: {
          type: "string",
          description: "Report title",
        },
        data_queries: {
          type: "array",
          items: { type: "string" },
          description: "Knowledge queries to gather data for the report",
        },
        instructions: {
          type: "string",
          description: "Specific instructions for report formatting or content focus",
        },
      },
      required: ["report_type", "title"],
    },
  },
  {
    name: "summarize_document",
    description:
      "Summarize an entire document or set of documents. Use when the user asks for a summary, overview, or key takeaways from a specific document.",
    input_schema: {
      type: "object" as const,
      properties: {
        document_title: {
          type: "string",
          description: "Title or partial title of the document to summarize",
        },
        focus: {
          type: "string",
          description: "Optional: specific aspect to focus the summary on",
        },
      },
      required: ["document_title"],
    },
  },
  {
    name: "search_web",
    description:
      "Search the web for information not found in the organization's knowledge base. Only available if enabled by the admin. Use for industry benchmarks, competitor info, or external data.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Web search query",
        },
        count: {
          type: "number",
          description: "Number of results to return (default 5, max 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "calculate",
    description:
      "Perform mathematical calculations. Use for financial metrics, percentages, occupancy rates, conversion rates, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        expression: {
          type: "string",
          description: "Mathematical expression to evaluate (e.g., '179/228*100' for occupancy percentage)",
        },
        label: {
          type: "string",
          description: "Description of what this calculation represents",
        },
      },
      required: ["expression"],
    },
  },
  {
    name: "list_documents",
    description:
      "List all available documents, optionally filtered by category or folder. Use when the user wants to browse what's available or when you need to find the right document to answer a question.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description: "Filter by document category",
        },
        folder: {
          type: "string",
          description: "Filter by folder name",
        },
        limit: {
          type: "number",
          description: "Max documents to return (default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "check_access",
    description:
      "Check if the current user has access to a specific document. Call this before citing a document if you're unsure about the user's access level.",
    input_schema: {
      type: "object" as const,
      properties: {
        documentId: {
          type: "string",
          description: "The document ID to check access for",
        },
      },
      required: ["documentId"],
    },
  },
];
