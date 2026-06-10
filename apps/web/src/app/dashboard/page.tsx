"use client";

import {
  Bell,
  CalendarClock,
  ClipboardCheck,
  FileText,
  GraduationCap,
  MessageSquare,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

import { workflowStatuses } from "@lms/shared";

import { useAuth } from "../../components/auth/auth-provider";
import { AppShell } from "../../components/layout/app-shell";

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
  const { user } = useAuth();
  const statuses = workflowStatuses.slice(0, 4).join(" / ");

  if (user?.role === "Candidate") {
    return (
      <AppShell title="Candidate Dashboard">
        <section className="grid stats" aria-label="Candidate dashboard actions">
          {[
            {
              label: "Daily Logs",
              note: "Submit today or review previous logs",
              href: "/daily-logs",
              icon: ClipboardCheck,
            },
            {
              label: "My Enrollment",
              note: "View your program and batch",
              href: "/candidates",
              icon: GraduationCap,
            },
            {
              label: "My Tasks",
              note: "Task workflow will be available soon",
              href: "/dashboard",
              icon: FileText,
            },
            {
              label: "Messages",
              note: "Chat will be available soon",
              href: "/dashboard",
              icon: MessageSquare,
            },
          ].map((item) => (
            <Link className="card metric dashboard-link-card" href={item.href} key={item.label}>
              <div className="metric-header">
                <span>{item.label}</span>
                <item.icon size={18} aria-hidden="true" />
              </div>
              <p className="metric-note candidate-dashboard-note">{item.note}</p>
            </Link>
          ))}
        </section>

        <section className="grid content-grid">
          <article className="card panel">
            <h2>Today</h2>
            <div className="side-list">
              <div className="side-item">
                <span className="side-icon">
                  <ClipboardCheck size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="row-title">Daily log</p>
                  <p className="row-meta">Submit one structured log for today.</p>
                </div>
              </div>
              <div className="side-item">
                <span className="side-icon">
                  <CalendarClock size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="row-title">Upcoming calls</p>
                  <p className="row-meta">Call invites will appear here when enabled.</p>
                </div>
              </div>
            </div>
          </article>

          <aside className="card panel">
            <h2>Status</h2>
            <p className="row-meta">
              Candidate workflows currently available: enrollment view and daily logs.
            </p>
          </aside>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      primaryAction={
        <button className="command-button primary" type="button">
          <Plus size={18} aria-hidden="true" />
          New Task
        </button>
      }
      title="Operations Dashboard"
    >
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
    </AppShell>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
