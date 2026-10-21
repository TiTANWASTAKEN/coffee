import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CustomerAccount } from "@shared/store";
import { accountsEnabled } from "@/config/features";
import { api } from "@/lib/api";

interface AccountValue {
  /** True until the first /me check has finished. */
  loading: boolean;
  customer: CustomerAccount | null;
  setCustomer: (customer: CustomerAccount | null) => void;
  logout: () => Promise<void>;
}

const AccountContext = createContext<AccountValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(accountsEnabled);
  const [customer, setCustomer] = useState<CustomerAccount | null>(null);

  useEffect(() => {
    if (!accountsEnabled) return;
    api<{ customer: CustomerAccount | null }>("/account/me")
      .then((res) => setCustomer(res.customer))
      .catch(() => setCustomer(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async () => {
    await api("/account/logout", { method: "POST" }).catch(() => undefined);
    setCustomer(null);
  }, []);

  const value = useMemo(() => ({ loading, customer, setCustomer, logout }), [loading, customer, logout]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside <AccountProvider>");
  return ctx;
}
