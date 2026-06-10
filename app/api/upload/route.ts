import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getConfigOrNull } from "@/lib/config";
import { SUPPORTED_MIME_TYPES } from "@/lib/types";

export async function POST(request: Request): Promise<NextResponse> {
  const config = getConfigOrNull();
  const maxBytes = config?.maxFileSizeBytes ?? 25 * 1024 * 1024;
  const blobToken = config?.BLOB_READ_WRITE_TOKEN;

  if (!blobToken) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured" },
      { status: 500 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: blobToken,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...SUPPORTED_MIME_TYPES],
        maximumSizeInBytes: maxBytes,
        addRandomSuffix: false,
      }),
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
