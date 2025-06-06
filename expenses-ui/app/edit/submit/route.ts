
import { NextResponse, NextRequest } from 'next/server'
import { z, ZodError } from 'zod';
import { StatusCodes } from 'http-status-codes';

const RequestSchema = z.object({
    txnIds: z.array(z.number()),
    tags: z.array(z.string())
});

function zodErrorStr(err: ZodError): string {
    let result = "";
    err.issues.forEach((issue) => {
        const path = issue.path.join('.');
        result += `- ${path ? `"${path}": ` : ''}${issue.message}\n`;
    });
    return result;
}

export async function POST(request: NextRequest) {
    let txnIDs: number[] = [];
    let tags: string[] = [];
    try {
        const parsed = RequestSchema.safeParse(await request.json())
        if (!parsed.success) {
            return new NextResponse(
                `invalid request: ${zodErrorStr(parsed.error)}`, {
                status: StatusCodes.BAD_REQUEST,
            }
            );
        }
        txnIDs = parsed.data.txnIds;
        tags = parsed.data.tags;
    } catch (error) {
        if (error instanceof SyntaxError) {
            return new NextResponse(
                `Request body was not valid JSON: ${error.message}`, {
                status: StatusCodes.BAD_REQUEST,
            }
            );
        }
    }
    console.log(`Updating tags for txns ${txnIDs} to ${tags}`);
    const url = `http://localhost:4000/txns`;
    try {
        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ids: txnIDs,
                ...(tags.length === 0 ? { clearTags: true } : { tags: tags }),
            })
        });
        if (!response.ok) {
            return new NextResponse(`error updating tags on backend: ${await response.text()}`, {
                status: response.status,
            })
        }
    } catch (error) {
        return new NextResponse(`error forwarding request to update tags to backend: ${error}`, {
            status: StatusCodes.INTERNAL_SERVER_ERROR,
        })
    }
    return new NextResponse("OK\n", {
        status: StatusCodes.OK,
    });
}