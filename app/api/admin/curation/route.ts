import { NextResponse } from "next/server";
import { saveCurationConfig, listCurationConfigs } from "@/lib/homepage-curation";
import type { CurationConfig } from "@/lib/homepage-curation-core";

function authorized(request: Request) {
  const token = process.env.CURATION_ADMIN_TOKEN;
  return Boolean(token && request.headers.get("authorization") === `Bearer ${token}`);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ sections: await listCurationConfigs() });
}

export async function PUT(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<CurationConfig>;
  const slots = body.slots;
  if (!body.section || !body.mode || !Number.isInteger(slots) || (slots ?? 0) < 1 || (slots ?? 0) > 20 || !["AUTO", "MANUAL", "HYBRID"].includes(body.mode)) return NextResponse.json({ error: "Invalid curation configuration" }, { status: 400 });
  return NextResponse.json(await saveCurationConfig(body as CurationConfig));
}
