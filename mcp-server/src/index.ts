import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { GetTransactions } from "./transactions.js";

const server = new McpServer({ name: "demo-server", version: "1.0.0" });

server.registerTool(
  "add",
  {
    title: "Addition Tool",
    description: "Add two numbers",
    inputSchema: { a: z.number(), b: z.number() },
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  })
);

server.registerTool(
  "get-transactions",
  {
    title: "Get Transactions Tool",
    description: `Get transactions matching the query parameters provided as arguments.

Arguents:
  fromDate: If specified, only get transactions on or after this date.

  toDate: If specified, only get transactions up to and including this date.

  description: If specified, only get transactions whose descriptions contain the given value as a substring.
             Matching is case insensitive.

  fromAmount: If specified, only get transactions whose amounts are greater than or equal to the given value.

  toAmount: If specified, only get transactions whose amounts are less than or equal to the given value.

  hasTags: If specified, only get transactions with the given tags.

  withoutTags: If specified, only get transactions that don't have the given tags.

  noTags: If specified and true, only get transactions that don't have any tags.

Returns:
  Array of transactions where each transaction has the following fields:
    date: Date the transaction occurred.
    description: Details about the transaction, usually the name of the merchant.
    amount: How much money was transacted.
    type: Whether the transaction was a debit (i.e., money flowing out of the account) or
          credit (i.e., money flowing into the account).
    source: Identifies the account at a financial institution where the transaction happened.
    tags: One or more tags the transaction was manually categorized into. Transactions tagged
          as 'transfer' can be ignored because it's money moving between accounts.

`,
    inputSchema: {
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      description: z.string().optional(),
      fromAmount: z.number().optional(),
      toAmount: z.number().optional(),
      hasTags: z.array(z.string()).optional(),
      withoutTags: z.array(z.string()).optional(),
      noTags: z.boolean().optional(),
    },
    outputSchema: {
      transactions: z.array(
        z.object({
          date: z.string(),
          description: z.string(),
          amount: z.string(),
          type: z.enum(["credit", "debit"]),
          source: z.string(),
          tags: z.array(z.string()).optional(),
        })
      ),
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

server.registerResource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  { title: "Greeting Resource", description: "Dynamic greeting generator" },
  async (uri, { name }) => ({
    contents: [{ uri: uri.href, text: `Hello, ${name}!` }],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
