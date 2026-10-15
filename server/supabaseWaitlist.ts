export interface WaitlistEntry {
  id: number;
  email: string;
  createdAt: string;
}

export class WaitlistStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WaitlistStorageError";
  }
}

interface Row {
  id: number;
  email: string;
  created_at: string;
}

/** Talks to Supabase with the service-role key. Callers must not log that key. */
export function supabaseWaitlist(url: string, serviceRoleKey: string, fetchImpl: typeof fetch = fetch) {
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  async function send(path: string, init: RequestInit): Promise<unknown> {
    let res: Response;
    try {
      res = await fetchImpl(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers } });
    } catch {
      throw new WaitlistStorageError("Could not reach the waitlist database.");
    }
    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = null;
      }
    }
    if (res.status === 404) throw new WaitlistStorageError("The waitlist table is missing. Run supabase/waitlist.sql in the Supabase SQL editor.");
    if (!res.ok) {
      const code = typeof body === "object" && body && "code" in body ? String((body as { code: unknown }).code) : "";
      if (res.status === 409 || code === "23505") return [];
      throw new WaitlistStorageError("The waitlist database rejected the request.");
    }
    return body;
  }

  return {
    async add(email: string): Promise<"added" | "exists"> {
      const body = await send("waitlist?on_conflict=email", {
        method: "POST",
        headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
        body: JSON.stringify({ email }),
      });
      return Array.isArray(body) && body.length > 0 ? "added" : "exists";
    },
    async list(): Promise<WaitlistEntry[]> {
      const body = await send("waitlist?select=id,email,created_at&order=id.desc", { method: "GET" });
      if (!Array.isArray(body)) throw new WaitlistStorageError("The waitlist database returned an unexpected response.");
      return (body as Row[]).map((row) => ({ id: row.id, email: row.email, createdAt: row.created_at }));
    },
  };
}
