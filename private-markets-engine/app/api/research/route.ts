import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM = `You are a private-markets research agent for an investor/operator. Research only public information. Never fabricate companies, metrics, ownership, or sources. Distinguish facts from inferences. Optimize for actionable investment judgment rather than generic industry description.

For every request, produce a concise but substantive investment brief with these sections:
1. Executive verdict: 3-5 bullets and a 0-100 market attractiveness score.
2. Market structure: fragmentation, recurring/repeat revenue, pricing power, cyclicality, labor intensity, capex intensity, regulation, customer concentration, and demand tailwinds/headwinds.
3. Why now: catalysts and timing.
4. Geographic view: why the requested geography is attractive or unattractive.
5. Target universe: identify up to 15 real companies fitting the screen. For each, include name, location, website if available, what it does, rough scale signals, ownership clues, evidence, and an attractiveness score. Do not invent revenue/EBITDA.
6. Value-creation playbook: concrete levers an acquirer could execute.
7. Key risks / reasons not to invest.
8. Diligence questions: the 10 highest-value questions still unanswered.
9. Sources: provide links/citations for material claims.

Think like a strong PE associate plus an operator. Prefer primary sources, company sites, government data, trade publications, credible news, and high-signal databases available through search.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { industry, geography, thesis, model = "gpt-6-astra", pin } = body;

    if (process.env.REMOTE_PIN && pin !== process.env.REMOTE_PIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!industry || !geography) {
      return NextResponse.json({ error: "Industry and geography are required." }, { status: 400 });
    }

    const prompt = `Industry: ${industry}\nGeography: ${geography}\nOptional thesis/screen: ${thesis || "None provided"}\n\nRun a fresh public-web private-markets screen. Prioritize evidence from the last 24 months when relevant, but use older primary sources for durable facts. Return a decision-useful investment brief.`;

    const response = await client.responses.create({
      model,
      input: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt }
      ],
      tools: [{ type: "web_search" }],
      reasoning: { effort: model === "gpt-6-astra" ? "high" : "medium" },
      background: true,
      store: true
    });

    return NextResponse.json({
      id: response.id,
      status: response.status,
      model,
      industry,
      geography
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
