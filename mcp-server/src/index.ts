import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { GetTransactions } from "./transactions.js";
import logger from "./logger.js";

const server = new McpServer({ name: "demo-server", version: "1.0.0" });

server.registerTool(
  "get-expenses",
  {
    title: "Get Expenses Tool",
    description: "Get expenses by year and tag",
    inputSchema: {
      fromYear: z
        .number()
        .optional()
        .describe("When specified, returns expenses >= fromYear."),
      toYear: z
        .number()
        .optional()
        .describe("When specified, returns expenses <= endYear."),
    },
    outputSchema: {
      transactions: z
        .array(
          z.object({
            year: z.string().describe("Year the transaction happened"),
            amount: z.string().describe("How much money was spent"),
            tag: z
              .string()
              .describe(
                "Manual categorization tag (transactions tagged as 'transfer' can be ignored)"
              ),
          })
        )
        .describe("Array of expense amounts by year and tag"),
    },
    annotations: {
      idempotentHint: true,
    },
  },
  async ({ fromYear, toYear }) => {
    try {
      logger.info(
        `Got get-expenses request fromYear=${fromYear} toYear=${toYear}.`
      );
      const t = await GetTransactions({ fromYear, toYear });
      logger.info(
        `Returning ${t.transactions.length} transactions for get-expenses.`
      );
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
      logger.error(`get-expenses error: ${error}`);
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
