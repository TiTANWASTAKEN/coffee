import { useMemo, useState } from "react";
import { formatDate } from "@/lib/format";
import { useAdminQuery } from "../auth";
import { AdminButton, Alert, Card, inputClass, Loading, PageTitle } from "../ui";

interface WaitlistEntry {
  id: number;
  email: string;
  createdAt: string;
}

export default function Waitlist() {
  const { data, error, loading } = useAdminQuery<WaitlistEntry[]>("/waitlist");
  const [query, setQuery] = useState("");

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!data || !q) return data ?? [];
    return data.filter((entry) => entry.email.includes(q));
  }, [data, query]);

  return (
    <>
      <PageTitle
        title="Waitlist"
        subtitle={data ? `${data.length} email${data.length === 1 ? "" : "s"}` : undefined}
        actions={
          <AdminButton tone="secondary" disabled={!entries.length} onClick={() => downloadCsv(entries)}>
            Export CSV
          </AdminButton>
        }
      />
      <input
        type="search"
        aria-label="Search emails"
        placeholder="Search email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={`${inputClass} mb-5 max-w-xs`}
      />
      {error && <Alert>{error}</Alert>}
      <Card>
        {loading && !data ? (
          <Loading />
        ) : entries.length === 0 ? (
          <p className="py-6 text-body-sm text-muted">No one has joined yet.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead className="text-[0.75rem] uppercase tracking-wider text-faint">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Email</th>
                  <th className="px-5 py-2.5 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <a href={`mailto:${entry.email}`} className="hover:underline">
                        {entry.email}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function downloadCsv(entries: WaitlistEntry[]) {
  const lines = ["Email,Joined (UTC)", ...entries.map((entry) => `${escapeCell(entry.email)},${escapeCell(entry.createdAt)}`)];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "waitlist.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCell(value: string) {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}
