"use client";

import type { Notification, NotificationPreferences } from "@lms/api-contracts";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../../components/auth/auth-provider";
import { AppShell } from "../../components/layout/app-shell";
import {
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from "../../lib/api";

function NotificationsContent() {
  const { accessToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailEnabled: true,
    inAppEnabled: true,
  });
  const [filterUnread, setFilterUnread] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    if (!accessToken) {
      return;
    }

    const [nextNotifications, nextPreferences] = await Promise.all([
      listNotifications(accessToken, { unreadOnly: filterUnread }),
      getNotificationPreferences(accessToken),
    ]);
    setNotifications(nextNotifications);
    setPreferences(nextPreferences);
  };

  useEffect(() => {
    void loadNotifications().catch((loadError) => {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load notifications.",
      );
    });
  }, [accessToken, filterUnread]);

  const handleMarkRead = async (notification: Notification) => {
    if (!accessToken || notification.readAt) {
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      await markNotificationRead(accessToken, notification.id);
      await loadNotifications();
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Failed to mark as read.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (!accessToken) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      await markAllNotificationsRead(accessToken);
      setMessage("All notifications marked as read.");
      await loadNotifications();
    } catch (markError) {
      setError(
        markError instanceof Error ? markError.message : "Failed to mark all as read.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handlePreferenceChange = async (
    field: keyof NotificationPreferences,
    value: boolean,
  ) => {
    if (!accessToken) {
      return;
    }

    const nextPreferences = { ...preferences, [field]: value };
    setPreferences(nextPreferences);
    setError(null);

    try {
      const savedPreferences = await updateNotificationPreferences(
        accessToken,
        nextPreferences,
      );
      setPreferences(savedPreferences);
      setMessage("Notification preferences updated.");
    } catch (preferenceError) {
      setError(
        preferenceError instanceof Error
          ? preferenceError.message
          : "Failed to update preferences.",
      );
    }
  };

  return (
    <AppShell contentClassName="notifications-page" title="Notifications">
      {(error || message) && (
        <section className="feedback-row" aria-live="polite">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && <p className="form-success">{message}</p>}
        </section>
      )}

      <section className="grid daily-logs-grid review-mode">
        <article className="card panel">
          <h2>Preferences</h2>
          <div className="stack-form">
            <label className="checkbox-row">
              <input
                checked={preferences.inAppEnabled}
                onChange={(event) =>
                  void handlePreferenceChange("inAppEnabled", event.target.checked)
                }
                type="checkbox"
              />
              <span>In-app notifications</span>
            </label>
            <label className="checkbox-row">
              <input
                checked={preferences.emailEnabled}
                onChange={(event) =>
                  void handlePreferenceChange("emailEnabled", event.target.checked)
                }
                type="checkbox"
              />
              <span>Email notifications</span>
            </label>
          </div>
        </article>

        <article className="card panel">
          <div className="section-heading">
            <h2>Inbox</h2>
            <div className="daily-log-table-actions">
              <label className="checkbox-row">
                <input
                  checked={filterUnread}
                  onChange={(event) => setFilterUnread(event.target.checked)}
                  type="checkbox"
                />
                <span>Unread only</span>
              </label>
              <button
                className="command-button"
                disabled={isBusy}
                onClick={() => void handleMarkAllRead()}
                type="button"
              >
                <CheckCheck size={18} aria-hidden="true" />
                Mark all read
              </button>
            </div>
          </div>

          <div className="daily-log-list">
            {notifications.length === 0 && (
              <p className="row-meta">No notifications to show.</p>
            )}
            {notifications.map((notification) => (
              <div className="daily-log-row" key={notification.id}>
                <div className="daily-log-main">
                  <div>
                    <p className="row-title">{notification.title}</p>
                    <p className="row-meta">{notification.body}</p>
                    <p className="row-meta">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`status ${notification.readAt ? "" : "warning"}`}>
                    {notification.readAt ? "read" : "unread"}
                  </span>
                </div>
                {!notification.readAt && (
                  <button
                    className="command-button"
                    disabled={isBusy}
                    onClick={() => void handleMarkRead(notification)}
                    type="button"
                  >
                    <Bell size={18} aria-hidden="true" />
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}

export default function NotificationsPage() {
  return <NotificationsContent />;
}
