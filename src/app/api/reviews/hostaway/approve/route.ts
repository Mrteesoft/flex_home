import { NextRequest, NextResponse } from "next/server";
import { approvalsStore } from "@/lib/reviews/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviewId, approved } = body ?? {};

    if (!reviewId || typeof reviewId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid reviewId" },
        { status: 400 },
      );
    }

    if (typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "Missing or invalid approved flag" },
        { status: 400 },
      );
    }

    approvalsStore.setApproval(reviewId, approved);

    return NextResponse.json({
      reviewId,
      approved,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to update approval", error);
    return NextResponse.json(
      { error: "Unable to update approval" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    approvals: approvalsStore.snapshot(),
  });
}
