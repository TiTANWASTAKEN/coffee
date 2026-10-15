import { Link, NavLink, Outlet } from "react-router";
import { ExternalLink, LayoutDashboard, LogOut, Mail, Package, Receipt } from "lucide-react";
import { site } from "@/config/site";
import { useAdminAuth } from "./auth";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/waitlist", label: "Waitlist", icon: Mail, end: false },
  { to: "/admin/orders", label: "Orders", icon: Receipt, end: false },
  { to: "/admin/products", label: "Products", icon: Package, end: false },
];

export function AdminLayout() {
  const { email, logout } = useAdminAuth();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="flex flex-col border-b border-line bg-surface md:sticky md:top-0 md:h-dvh md:border-b-0 md:border-r">
        <Link to="/admin" className="px-5 py-5">
          <span className="block font-display text-lg uppercase tracking-[0.2em]">{site.shortName}</span>
          <span className="text-[0.75rem] text-faint">Store admin</span>
        </Link>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="flex shrink-0 items-center gap-3 rounded-sm px-3 py-2.5 text-body-sm text-muted transition-colors hover:bg-surface-raised hover:text-ivory aria-[current=page]:bg-surface-raised aria-[current=page]:text-ivory"
            >
              <Icon aria-hidden="true" strokeWidth={1.6} className="size-4" />
              {label}
            </NavLink>
          ))}
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-3 rounded-sm px-3 py-2.5 text-body-sm text-muted transition-colors hover:bg-surface-raised hover:text-ivory"
          >
            <ExternalLink aria-hidden="true" strokeWidth={1.6} className="size-4" />
            View store
          </a>
        </nav>
        <div className="mt-auto hidden border-t border-line px-5 py-4 md:block">
          <p className="truncate text-[0.8rem] text-faint">{email}</p>
          <button type="button" onClick={() => void logout()} className="mt-2 flex items-center gap-2 text-body-sm text-muted hover:text-ivory">
            <LogOut aria-hidden="true" strokeWidth={1.6} className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
        <button type="button" onClick={() => void logout()} className="mt-12 flex items-center gap-2 text-body-sm text-muted hover:text-ivory md:hidden">
          <LogOut aria-hidden="true" strokeWidth={1.6} className="size-4" />
          Sign out
        </button>
      </main>
    </div>
  );
}
