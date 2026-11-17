import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const pin = req.nextUrl.searchParams.get("pin");
    if (process.env.REMOTE_PIN && pin !== process.env.REMOTE_PIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await client.responses.retrieve(id);
    return NextResponse.json({
      id: response.id,
      status: response.status,
      output_text: response.output_text || "",
      error: response.error || null,
      usage: response.usage || null
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
