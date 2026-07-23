import { NextResponse } from "next/server";

const responseBody = {
  status: "not_configured",
  message:
    "Sakeni has reserved this Stripe webhook URL, but payment event handling is not configured in this MVP build.",
};

export async function GET() {
  return NextResponse.json(responseBody, { status: 501 });
}

export async function POST() {
  return NextResponse.json(responseBody, { status: 501 });
}
