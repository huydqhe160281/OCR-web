import { NextResponse } from "next/server";
import type { ZodError, ZodType } from "zod";

export function validationErrorResponse(error: ZodError): NextResponse {
  return NextResponse.json(
    {
      error: "Validation failed",
      details: error.flatten(),
    },
    { status: 400 },
  );
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: validationErrorResponse(parsed.error) };
  }

  return { data: parsed.data };
}

export function parseParams<T>(
  params: Record<string, string>,
  schema: ZodType<T>,
): { data: T } | { error: NextResponse } {
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    return { error: validationErrorResponse(parsed.error) };
  }
  return { data: parsed.data };
}
