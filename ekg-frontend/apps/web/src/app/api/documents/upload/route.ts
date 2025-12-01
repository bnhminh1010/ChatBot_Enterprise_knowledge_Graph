import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookies (adjust based on your auth implementation)
    const authToken =
      request.cookies.get("auth_token")?.value ||
      request.cookies.get("token")?.value ||
      request.headers.get("authorization");

    // Get the multipart form data from the request
    const formData = await request.formData();

    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/documents/upload`, {
      method: "POST",
      headers: {
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: formData,
    });

    // Check if response is JSON
    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("application/json")) {
      // Non-JSON response (likely HTML error page)
      const text = await response.text();
      console.error(
        "Backend returned non-JSON response:",
        text.substring(0, 200)
      );
      return NextResponse.json(
        {
          error: "Backend error",
          message: `Backend returned ${response.status} error. Check backend logs.`,
          statusCode: response.status,
        },
        { status: 500 }
      );
    }

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.message || "Upload failed", details: result },
        { status: response.status }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
