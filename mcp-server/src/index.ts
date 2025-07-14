import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { GetTransactions } from "./transactions.js";

const server = new McpServer({ name: "demo-server", version: "1.0.0" });

server.registerTool(
  "get-transactions",
  {
    title: "Get Transactions Tool",
    description: "Get transactions matching the specified query parameters",
    inputSchema: {
      fromDate: z
        .string()
        .optional()
        .describe("If specified, only get transactions on or after this date"),
      toDate: z
        .string()
        .optional()
        .describe(
          "If specified, only get transactions up to and including this date"
        ),
      description: z
        .string()
        .optional()
        .describe(
          "If specified, only get transactions whose descriptions contain the given value as a substring (case insensitive)"
        ),
      fromAmount: z
        .number()
        .optional()
        .describe(
          "If specified, only get transactions whose amounts are greater than or equal to this value"
        ),
      toAmount: z
        .number()
        .optional()
        .describe(
          "If specified, only get transactions whose amounts are less than or equal to this value"
        ),
      hasTags: z
        .array(z.string())
        .optional()
        .describe("If specified, only get transactions with these tags"),
      withoutTags: z
        .array(z.string())
        .optional()
        .describe(
          "If specified, only get transactions that don't have these tags"
        ),
      noTags: z
        .boolean()
        .optional()
        .describe("If true, only get transactions that don't have any tags"),
    },
    outputSchema: {
      transactions: z
        .array(
          z.object({
            date: z.string().describe("Date the transaction occurred"),
            description: z
              .string()
              .describe(
                "Details about the transaction, usually the merchant name"
              ),
            amount: z.string().describe("How much money was transacted"),
            type: z
              .enum(["credit", "debit"])
              .describe(
                "Whether money flowed into (credit) or out of (debit) the account"
              ),
            source: z
              .string()
              .describe("Identifies the account at the financial institution"),
            tags: z
              .array(z.string())
              .optional()
              .describe(
                "Manual categorization tags (transactions tagged as 'transfer' can be ignored)"
              ),
          })
        )
        .describe("Array of matching transactions"),
    },
    annotations: {
      idempotentHint: true,
    },
  },
  async ({
    fromDate,
    toDate,
    description,
    fromAmount,
    toAmount,
    hasTags,
    withoutTags,
    noTags,
  }) => {
    try {
      const t = await GetTransactions({
        fromDate,
        toDate,
        description,
        fromAmount,
        toAmount,
        hasTags,
        withoutTags,
        noTags,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(t),
          },
        ],
        structuredContent: t,
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${error}`,
          },
        ],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
