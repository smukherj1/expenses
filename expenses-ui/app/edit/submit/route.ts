import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { StatusCodes } from "http-status-codes";

const RequestSchema = z.object({
  ids: z.array(z.string()),
  op: z.string(),
  tags: z.array(z.string()),
});

function zodErrorStr(err: ZodError): string {
  let result = "";
  err.issues.forEach((issue) => {
    const path = issue.path.join(".");
    result += `- ${path ? `"${path}": ` : ""}${issue.message}\n`;
  });
  return result;
}

export async function POST(request: NextRequest) {
  let ids: string[] = [];
  let tags: string[] = [];
  let op: string = "";
  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { details: `invalid request: ${zodErrorStr(parsed.error)}` },
        {
          status: StatusCodes.BAD_REQUEST,
        }
      );
    }
    ids = parsed.data.ids;
    tags = parsed.data.tags;
    op = parsed.data.op;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json(
        { details: `Request body was not valid JSON: ${error.message}` },
        {
          status: StatusCodes.BAD_REQUEST,
        }
      );
    }
  }
  console.log(`Apply op ${op} on tags ${tags} for txns ${ids}`);
  const url = `http://localhost:4000/txns/tags`;
  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ids: ids,
        op: op,
        tags: tags,
      }),
    });
    if (!response.ok) {
      return Response.json(
        { details: `error updating tags on backend: ${await response.text()}` },
        {
          status: response.status,
        }
      );
    }
  } catch (error) {
    return Response.json(
      {
        details: `error forwarding request to update tags to backend: ${error}`,
      },
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      }
    );
  }
  return Response.json(
    { details: "OK" },
    {
      status: StatusCodes.OK,
    }
  );
}
