import { NextResponse } from "next/server";
import { providerStatus } from "@/core/studio";

export const dynamic = "force-dynamic";
/** Booleans only. API keys are never returned to the browser. */
export function GET() { return NextResponse.json(providerStatus()); }
