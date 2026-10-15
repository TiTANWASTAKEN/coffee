import { db } from "./db";
import type { WaitlistEntry } from "./supabaseWaitlist";

export function listWaitlist(): WaitlistEntry[] {
  const rows = db.prepare("SELECT id, email, created_at FROM waitlist ORDER BY id DESC").all() as { id: number; email: string; created_at: string }[];
  return rows.map((row) => ({ id: row.id, email: row.email, createdAt: row.created_at }));
}

/** Saves a lowercase email once. A repeat signup stays on the list and is not duplicated. */
export function addWaitlistEmail(email: string): "added" | "exists" {
  const result = db.prepare("INSERT INTO waitlist (email) VALUES (?) ON CONFLICT(email) DO NOTHING").run(email);
  return result.changes === 1 ? "added" : "exists";
}
