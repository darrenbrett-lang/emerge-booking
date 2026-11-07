import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";
import { EVENT } from "./event";

let admin: SupabaseClient | null = null;

// Service role client. Server only: it bypasses row-level security.
export function db(): SupabaseClient {
  admin ??= createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

export type Rpc = Record<string, unknown> & { result?: string };

export async function rpc<T = Rpc>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

export type Availability = {
  capacity: number;
  taken: number;
  remaining: number;
  show_count: boolean;
  waiting: number;
  phase: "open" | "checkout_closed" | "closed" | "holding";
};

export async function availability(): Promise<Availability> {
  // Local preview before Supabase is connected: render the page with a
  // made-up count. Never in production.
  if (process.env.NODE_ENV !== "production" && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const remaining = Number(process.env.PREVIEW_REMAINING ?? 40);
    const phase = (process.env.PREVIEW_PHASE ?? "open") as Availability["phase"];
    return { capacity: 100, taken: 100 - remaining, remaining, show_count: remaining <= 20, waiting: 0, phase };
  }
  return rpc<Availability>("emerge_availability", { p_event: EVENT.id });
}
