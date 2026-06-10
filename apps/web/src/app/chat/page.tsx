"use client";

import type { Candidate, ChatMessage, ChatRoom } from "@lms/api-contracts";
import { Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../components/auth/auth-provider";
import { AppShell } from "../../components/layout/app-shell";
import {
  ensureChatRoom,
  listCandidates,
  listChatMessages,
  listChatRooms,
  sendChatMessage,
} from "../../lib/api";
import { disconnectChatSocket, getChatSocket } from "../../lib/socket";

function ChatContent() {
  const { accessToken, user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCandidate = user?.role === "Candidate";
  const canManage = !isCandidate;

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );

  const loadRooms = async () => {
    if (!accessToken) {
      return;
    }

    let nextRooms = await listChatRooms(accessToken);

    if (isCandidate && nextRooms.length === 0 && candidates[0]) {
      const ensuredRoom = await ensureChatRoom(accessToken, candidates[0].id);
      nextRooms = [ensuredRoom];
    }

    setRooms(nextRooms);

    if (!selectedRoomId && nextRooms[0]) {
      setSelectedRoomId(nextRooms[0].id);
    }
  };

  const loadMessages = async (roomId: string) => {
    if (!accessToken) {
      return;
    }

    const nextMessages = await listChatMessages(accessToken, roomId);
    setMessages(nextMessages);
  };

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void listCandidates(accessToken)
      .then((nextCandidates) => {
        setCandidates(nextCandidates);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Failed to load chat.");
      });
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || candidates.length === 0) {
      return;
    }

    void loadRooms().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load rooms.");
    });
  }, [accessToken, candidates, isCandidate]);

  useEffect(() => {
    if (!accessToken || !selectedRoomId) {
      return;
    }

    const socket = getChatSocket(accessToken);

    void loadMessages(selectedRoomId).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load messages.");
    });

    socket.emit("chat.join", { roomId: selectedRoomId });

    const handleIncomingMessage = (message: ChatMessage) => {
      if (message.roomId === selectedRoomId) {
        setMessages((current) => [...current, message]);
      }
    };

    socket.on("chat.message", handleIncomingMessage);

    return () => {
      socket.off("chat.message", handleIncomingMessage);
    };
  }, [accessToken, selectedRoomId]);

  useEffect(() => () => disconnectChatSocket(), []);

  const handleOpenCandidateRoom = async () => {
    if (!accessToken || !selectedCandidateId) {
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const room = await ensureChatRoom(accessToken, selectedCandidateId);
      setRooms((current) => {
        const existing = current.find((entry) => entry.id === room.id);
        return existing ? current : [room, ...current];
      });
      setSelectedRoomId(room.id);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Failed to open chat room.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !selectedRoomId || !messageBody.trim()) {
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const socket = getChatSocket(accessToken);

      await new Promise<void>((resolve, reject) => {
        socket.emit(
          "chat.send",
          { roomId: selectedRoomId, body: messageBody.trim() },
          (response: { success: boolean; error?: string }) => {
            if (!response?.success) {
              reject(new Error(response?.error ?? "Failed to send message."));
              return;
            }

            resolve();
          },
        );
      });

      setMessageBody("");
      await loadMessages(selectedRoomId);
      await loadRooms();
    } catch (sendError) {
      try {
        await sendChatMessage(accessToken, selectedRoomId, messageBody.trim());
        setMessageBody("");
        await loadMessages(selectedRoomId);
      } catch {
        setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AppShell contentClassName="chat-page" title="Chat">
      {error && (
        <section className="feedback-row" aria-live="polite">
          <p className="form-error" role="alert">
            {error}
          </p>
        </section>
      )}

      <section className="grid daily-logs-grid review-mode">
        <article className="card panel">
          <h2>Rooms</h2>
          {canManage && (
            <div className="stack-form">
              <select
                className="plain-input"
                onChange={(event) => setSelectedCandidateId(event.target.value)}
                value={selectedCandidateId}
              >
                <option value="">Select candidate</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.fullName} ({candidate.candidateCode})
                  </option>
                ))}
              </select>
              <button
                className="command-button"
                disabled={isBusy || !selectedCandidateId}
                onClick={() => void handleOpenCandidateRoom()}
                type="button"
              >
                Open chat
              </button>
            </div>
          )}
          <div className="daily-log-list">
            {rooms.length === 0 && <p className="row-meta">No chat rooms yet.</p>}
            {rooms.map((room) => (
              <button
                className={`program-row ${selectedRoomId === room.id ? "active" : ""}`}
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                type="button"
              >
                <span>{room.fullName}</span>
                <span className="row-meta">{room.programName}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="card panel">
          <h2>{selectedRoom ? selectedRoom.fullName : "Messages"}</h2>
          <div className="chat-message-list">
            {messages.map((message) => (
              <div className="chat-message-row" key={message.id}>
                <p className="row-title">{message.senderName}</p>
                <p className="row-meta">{message.body}</p>
                <time className="row-meta">
                  {new Date(message.createdAt).toLocaleString()}
                </time>
              </div>
            ))}
          </div>
          {selectedRoomId && (
            <form className="chat-compose stack-form" onSubmit={handleSendMessage}>
              <textarea
                className="plain-input"
                onChange={(event) => setMessageBody(event.target.value)}
                placeholder="Write a message"
                required
                rows={3}
                value={messageBody}
              />
              <button className="command-button primary" disabled={isBusy} type="submit">
                <Send size={18} aria-hidden="true" />
                Send
              </button>
            </form>
          )}
        </article>
      </section>
    </AppShell>
  );
}

export default function ChatPage() {
  return <ChatContent />;
}
