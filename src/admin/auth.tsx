import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";

type Status = "checking" | "signed-in" | "signed-out";

interface AuthValue {
  status: Status;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Calls the admin API; a 401 signs the user out locally. */
  request: <T>(path: string, init?: Parameters<typeof api>[1]) => Promise<T>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [email, setEmail] = useState<string | null>(null);

  const signedOut = useCallback(() => {
    setEmail(null);
    setStatus("signed-out");
  }, []);

  useEffect(() => {
    api<{ email: string }>("/admin/me")
      .then((me) => {
        setEmail(me.email);
        setStatus("signed-in");
      })
      .catch(signedOut);
  }, [signedOut]);

  const request = useCallback(
    async <T,>(path: string, init?: Parameters<typeof api>[1]) => {
      try {
        return await api<T>(`/admin${path}`, init);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) signedOut();
        throw err;
      }
    },
    [signedOut],
  );

  const value = useMemo<AuthValue>(
    () => ({
      status,
      email,
      request,
      login: async (loginEmail, password) => {
        const me = await api<{ email: string }>("/admin/login", { method: "POST", body: { email: loginEmail, password } });
        setEmail(me.email);
        setStatus("signed-in");
      },
      logout: async () => {
        await api("/admin/logout", { method: "POST" }).catch(() => undefined);
        signedOut();
      },
    }),
    [status, email, request, signedOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside <AdminAuthProvider>");
  return ctx;
}

/** Loads an admin endpoint and exposes loading / error / reload. */
export function useAdminQuery<T>(path: string) {
  const { request } = useAdminAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await request<T>(path));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [path, request]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, error, loading, reload };
}
