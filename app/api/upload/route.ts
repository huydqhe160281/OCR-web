import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getConfigOrNull } from "@/lib/config";
import { SUPPORTED_MIME_TYPES } from "@/lib/types";

export async function POST(request: Request): Promise<NextResponse> {
  const config = getConfigOrNull();
  const maxBytes = config?.maxFileSizeBytes ?? 25 * 1024 * 1024;

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...SUPPORTED_MIME_TYPES],
        maximumSizeInBytes: maxBytes,
      }),
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
