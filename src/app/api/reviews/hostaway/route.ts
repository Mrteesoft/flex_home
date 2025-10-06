import { NextRequest, NextResponse } from "next/server";
import {
  buildHostawayResponse,
  refreshApprovals,
} from "@/lib/reviews/normalize";

refreshApprovals();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const payload = buildHostawayResponse(request.url);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to build Hostaway reviews response", error);
    return NextResponse.json(
      {
        error: "Unable to load Hostaway reviews",
      },
      {
        status: 500,
      },
    );
  }
}
