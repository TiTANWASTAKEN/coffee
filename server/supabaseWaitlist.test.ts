import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { supabaseWaitlist, WaitlistStorageError } from "./supabaseWaitlist.ts";

function fakeFetch(status: number, body: unknown): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })) as typeof fetch;
}

describe("supabase waitlist", () => {
  it("treats a returned row as a new signup and an empty body as a duplicate", async () => {
    const added = supabaseWaitlist("https://example.supabase.co", "service-role", fakeFetch(201, [{ id: 1, email: "a@b.com", created_at: "2026-10-13T00:00:00Z" }]));
    assert.equal(await added.add("a@b.com"), "added");

    const duplicate = supabaseWaitlist("https://example.supabase.co", "service-role", fakeFetch(201, []));
    assert.equal(await duplicate.add("a@b.com"), "exists");
  });

  it("does not describe a missing table as a success", async () => {
    const missing = supabaseWaitlist("https://example.supabase.co", "service-role", fakeFetch(404, { message: "not found" }));
    await assert.rejects(() => missing.list(), WaitlistStorageError);
  });
});
