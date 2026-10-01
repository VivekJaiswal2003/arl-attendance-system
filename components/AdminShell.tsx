import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { getSession } from "@/lib/auth";

const navigation = [
  ["Dashboard", "/admin"],
  ["Workers", "/admin/workers"],
  ["Attendance", "/admin/attendance"],
  ["Sites", "/admin/sites"],
  ["Reports", "/admin/reports"],
  ["Settings", "/admin/settings"],
];

export async function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  const session = await getSession();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">ARL ENGINEERS</div>
          <div className="brand-subtitle">Workforce Attendance</div>
        </div>
        <nav className="nav" aria-label="Main navigation">
          <div className="nav-label">Operations</div>
          {navigation.map(([label, href]) => (
            <Link className={href === "/admin" && title === "Dashboard" ? "nav-link nav-link-active" : `nav-link ${title === label ? "nav-link-active" : ""}`} href={href} key={href}>{label}</Link>
          ))}
        </nav>
        <div className="sidebar-footer"><span className="status-dot" /> System online<br /><span className="sidebar-footer-muted">ARL Workforce Attendance</span></div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">{title}</div>
          <div className="topbar-actions"><div className="topbar-meta"><strong>{session?.name ?? "Administrator"}</strong><span>Administration workspace</span></div><SignOutButton /></div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
