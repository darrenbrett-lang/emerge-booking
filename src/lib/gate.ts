import "server-only";
import { connection } from "next/server";
import { availability, type Availability } from "./db";

// Every guest page asks once per request, never at build time. The phase
// comes from the database clock, so the holding page switches at 12:30 am
// without a deploy or a job.
export async function gate(): Promise<Availability> {
  await connection();
  return availability();
}
