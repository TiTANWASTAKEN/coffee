import { config } from "./config";
import { supabaseWaitlist, type WaitlistEntry } from "./supabaseWaitlist";

export type { WaitlistEntry };

export function waitlistUsesSupabase(): boolean {
  return Boolean(config.supabase.url && config.supabase.serviceRoleKey);
}

function remote() {
  return supabaseWaitlist(config.supabase.url, config.supabase.serviceRoleKey);
}

export async function saveWaitlistEmail(email: string): Promise<"added" | "exists"> {
  if (waitlistUsesSupabase()) return remote().add(email);
  const { addWaitlistEmail } = await import("./waitlistLocal");
  return addWaitlistEmail(email);
}

export async function loadWaitlist(): Promise<WaitlistEntry[]> {
  if (waitlistUsesSupabase()) return remote().list();
  const { listWaitlist } = await import("./waitlistLocal");
  return listWaitlist();
}
