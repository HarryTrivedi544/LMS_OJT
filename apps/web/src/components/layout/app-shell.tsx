"use client";

import type { Role } from "@lms/shared";
import {
  Bell,
  ClipboardCheck,
  FileText,
  Gauge,
  Layers3,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AuthGuard } from "../auth/auth-guard";
import { useAuth } from "../auth/auth-provider";

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof Gauge;
  roles: Role[];
  isReady: boolean;
};

type AppShellProps = {
  title: string;
  children: ReactNode;
  allowedRoles?: Role[];
  contentClassName?: string;
  primaryAction?: ReactNode;
};

const allRoles: Role[] = [
  "Super Admin",
  "Program Admin",
  "Program Lead",
  "Candidate",
];

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Gauge,
    roles: allRoles,
    isReady: true,
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    roles: ["Super Admin"],
    isReady: true,
  },
  {
    label: "Programs",
    href: "/programs",
    icon: Layers3,
    roles: ["Super Admin"],
    isReady: true,
  },
  {
    label: "Candidates",
    href: "/candidates",
    icon: Users,
    roles: ["Super Admin", "Program Admin", "Program Lead", "Candidate"],
    isReady: true,
  },
  {
    label: "Daily Logs",
    href: "/daily-logs",
    icon: ClipboardCheck,
    roles: ["Super Admin", "Program Admin", "Program Lead", "Candidate"],
    isReady: true,
  },
  {
    label: "Timesheets",
    href: "/timesheets",
    icon: ClipboardCheck,
    roles: ["Super Admin", "Program Admin", "Program Lead", "Candidate"],
    isReady: true,
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: FileText,
    roles: ["Super Admin", "Program Admin", "Program Lead", "Candidate"],
    isReady: false,
  },
  {
    label: "Chat",
    href: "/chat",
    icon: MessageSquare,
    roles: ["Super Admin", "Program Admin", "Program Lead", "Candidate"],
    isReady: false,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: ShieldCheck,
    roles: ["Super Admin", "Program Admin"],
    isReady: false,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["Super Admin"],
    isReady: false,
  },
];

function AppShellContent({
  allowedRoles,
  children,
  contentClassName,
  primaryAction,
  title,
}: AppShellProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  if (!user) {
    return null;
  }

  const visibleItems = navigationItems.filter(
    (item) => item.isReady && item.roles.includes(user.role),
  );
  const canAccessPage = !allowedRoles || allowedRoles.includes(user.role);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">
            <Gauge size={20} aria-hidden="true" />
          </span>
          <span>LMS OJT</span>
        </Link>
        <nav className="nav" aria-label="Main navigation">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                className={`nav-item ${isActive ? "active" : ""}`}
                href={item.href}
                key={item.href}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className={`main ${contentClassName ?? ""}`.trim()}>
        <header className="topbar">
          <div>
            <p className="eyebrow">{user.role} Workspace</p>
            <h1>{title}</h1>
          </div>
          <div className="actions">
            <div className="user-chip">
              <span>{user.fullName}</span>
            </div>
            <button className="icon-button" type="button" title="Search">
              <Search size={18} aria-hidden="true" />
            </button>
            <button className="icon-button" type="button" title="Notifications">
              <Bell size={18} aria-hidden="true" />
            </button>
            {primaryAction}
            <button
              className="icon-button"
              onClick={() => void logout()}
              title="Sign out"
              type="button"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        {canAccessPage ? (
          children
        ) : (
          <section className="card panel permission-panel">
            <h2>Permission denied</h2>
            <p className="row-meta">
              You do not have permission to access this workspace area.
            </p>
            <Link className="command-button primary" href="/dashboard">
              <Gauge size={18} aria-hidden="true" />
              Dashboard
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <AuthGuard>
      <AppShellContent {...props} />
    </AuthGuard>
  );
}
