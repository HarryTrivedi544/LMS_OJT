"use client";

import {
  Bell,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Gauge,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

import { workflowStatuses } from "@lms/shared";

import { AuthGuard } from "../../components/auth/auth-guard";
import { useAuth } from "../../components/auth/auth-provider";

const metrics = [
  {
    label: "Active candidates",
    value: "128",
    note: "14 batches in progress",
    icon: Users,
  },
  {
    label: "Pending reviews",
    value: "36",
    note: "KPI and timesheet queue",
    icon: ClipboardCheck,
  },
  {
    label: "Open tasks",
    value: "214",
    note: "42 due this week",
    icon: FileText,
  },
  {
    label: "Unread chats",
    value: "19",
    note: "Lead and candidate rooms",
    icon: MessageSquare,
  },
];

const reviewQueue = [
  {
    title: "Weekly timesheet approval",
    meta: "Aarav Patel, AI OJT Batch 03",
    status: "submitted",
    due: "Today",
  },
  {
    title: "Task brief acknowledgement",
    meta: "Meera Shah, Backend Track",
    status: "under_review",
    due: "Jun 11",
  },
  {
    title: "Monthly KPI review",
    meta: "Rohan Iyer, Full Stack Track",
    status: "revision_required",
    due: "Jun 12",
  },
];

const sideItems = [
  {
    title: "Call invite",
    text: "Program Lead sync at 4:30 PM",
    icon: CalendarClock,
  },
  {
    title: "Permission audit",
    text: "2 permission changes need review",
    icon: ShieldCheck,
  },
  {
    title: "Reminder queue",
    text: "Daily log reminders scheduled",
    icon: Bell,
  },
];

function DashboardContent() {
  const { logout, user } = useAuth();
  const statuses = workflowStatuses.slice(0, 4).join(" / ");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Gauge size={20} aria-hidden="true" />
          </span>
          <span>LMS OJT</span>
        </div>
        <nav className="nav" aria-label="Main navigation">
          {[
            ["Dashboard", "/dashboard"],
            ["Users", "/users"],
            ["Candidates", "/dashboard"],
            ["Timesheets", "/dashboard"],
            ["Tasks", "/dashboard"],
            ["Reports", "/dashboard"],
          ].map(([item, href], index) => (
            <a
              className={`nav-item ${index === 0 ? "active" : ""}`}
              href={href}
              key={item}
            >
              <Gauge size={16} aria-hidden="true" />
              <span>{item}</span>
            </a>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">{user?.role} Workspace</p>
            <h1>Operations Dashboard</h1>
          </div>
          <div className="actions">
            <div className="user-chip">
              <span>{user?.fullName}</span>
            </div>
            <button className="icon-button" type="button" title="Search">
              <Search size={18} aria-hidden="true" />
            </button>
            <button className="icon-button" type="button" title="Notifications">
              <Bell size={18} aria-hidden="true" />
            </button>
            <button className="command-button primary" type="button">
              <Plus size={18} aria-hidden="true" />
              New Task
            </button>
            <button
              className="icon-button"
              type="button"
              title="Sign out"
              onClick={() => void logout()}
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className="grid stats" aria-label="Dashboard metrics">
          {metrics.map((metric) => (
            <article className="card metric" key={metric.label}>
              <div className="metric-header">
                <span>{metric.label}</span>
                <metric.icon size={18} aria-hidden="true" />
              </div>
              <p className="metric-value">{metric.value}</p>
              <p className="metric-note">{metric.note}</p>
            </article>
          ))}
        </section>

        <section className="grid content-grid">
          <article className="card panel">
            <h2>Review Queue</h2>
            <div className="queue">
              {reviewQueue.map((item) => (
                <div className="queue-row" key={item.title}>
                  <div>
                    <p className="row-title">{item.title}</p>
                    <p className="row-meta">{item.meta}</p>
                  </div>
                  <span
                    className={`status ${
                      item.status === "revision_required" ? "warning" : "success"
                    }`}
                  >
                    {item.status.replaceAll("_", " ")}
                  </span>
                  <time>{item.due}</time>
                  <button className="icon-button" type="button" title="Open item">
                    <ClipboardCheck size={18} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </article>

          <aside className="card panel">
            <h2>Today</h2>
            <div className="side-list">
              {sideItems.map((item) => (
                <div className="side-item" key={item.title}>
                  <span className="side-icon">
                    <item.icon size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="row-title">{item.title}</p>
                    <p className="row-meta">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="row-meta flow-note">Workflow states: {statuses}</p>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
