import { NextResponse } from "next/server";
import { getInternalApiUrl } from "@/lib/api-url";

interface OAuthCompleteRequest {
  access_token?: string;
}

export async function POST(request: Request) {
  let body: OAuthCompleteRequest;

  try {
    body = (await request.json()) as OAuthCompleteRequest;
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body.access_token) {
    return NextResponse.json(
      { detail: "Missing access_token." },
      { status: 400 }
    );
  }

  try {
    const apiUrl = getInternalApiUrl();
    const backendResponse = await fetch(`${apiUrl}/auth/oauth-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: body.access_token }),
      cache: "no-store",
    });

    const rawBody = await backendResponse.text();
    let responseBody: unknown = null;

    if (rawBody) {
      try {
        responseBody = JSON.parse(rawBody) as unknown;
      } catch {
        responseBody = { detail: rawBody };
      }
    }

    if (!backendResponse.ok) {
      return NextResponse.json(
        responseBody ?? { detail: "OAuth completion failed." },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(responseBody, { status: backendResponse.status });
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : "Unable to reach the authentication service.";
    return NextResponse.json(
      { detail },
      { status: 502 }
    );
  }
}
