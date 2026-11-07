import "server-only";
import { createHash } from "node:crypto";
import { env } from "./env";

export function clientHash(req: Request): string | null {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  if (!ip) return null;
  return createHash("sha256").update(env.hashSalt() + ip).digest("hex").slice(0, 32);
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const str = (v: unknown, max = 254) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const bool = (v: unknown) => v === true || v === "on" || v === "true";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
