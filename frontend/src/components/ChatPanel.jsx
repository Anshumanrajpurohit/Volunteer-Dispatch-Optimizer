import { useEffect, useMemo, useRef, useState } from "react";

import { getChatMessages, sendChatMessage } from "../api/endpoints";
import { useAIAssist } from "../hooks/useAIAssist";
import { ErrorAlert } from "./ErrorAlert";

const POLL_INTERVAL_MS = 8000;

function formatTimestamp(value) {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeSenderType(userRole) {
  return userRole === "volunteer" ? "volunteer" : "coordinator";
}

export function ChatPanel({
  rescueRequestId,
  volunteerId,
  volunteerName,
  rescueStatus,
  userRole,
}) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [aiFilled, setAiFilled] = useState(false);
  const listRef = useRef(null);
  const canChat = Boolean(volunteerId) && rescueStatus === "dispatched";
  const senderType = normalizeSenderType((userRole || "").trim().toLowerCase());
  const showSuggestReply = senderType === "coordinator" && Boolean(volunteerId);
  const suggestReplyAssist = useAIAssist(
    volunteerId ? `/ai/message-assist/${rescueRequestId}/${volunteerId}` : `/ai/message-assist/${rescueRequestId}/0`,
  );

  async function loadMessages({ silent = false } = {}) {
    if (!canChat) {
      setMessages([]);
      setError("");
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    try {
      const chatHistory = await getChatMessages(rescueRequestId);
      setMessages(chatHistory);
      setError("");
    } catch (requestError) {
      setError(requestError.userMessage || "Unable to load chat history.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadMessages();
  }, [rescueRequestId, volunteerId, rescueStatus]);

  useEffect(() => {
    if (!canChat) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadMessages({ silent: true });
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [canChat, rescueRequestId, volunteerId]);

  useEffect(() => {
    const container = listRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  const recentChatContext = useMemo(
    () => messages.slice(-6).map((item) => ({
      sender_type: item.sender_type,
      message: item.message,
      created_at: item.created_at,
    })),
    [messages],
  );

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canChat || !draft.trim()) {
      return;
    }

    setSending(true);
    setError("");
    setNotice("");

    try {
      const createdMessage = await sendChatMessage({
        rescue_request_id: Number(rescueRequestId),
        volunteer_id: Number(volunteerId),
        sender_type: senderType,
        message: draft.trim(),
      });
      setMessages((current) => [...current, createdMessage]);
      setDraft("");
      setAiFilled(false);
      setNotice("Message sent.");
    } catch (requestError) {
      setError(requestError.userMessage || "Unable to send chat message.");
    } finally {
      setSending(false);
    }
  }

  async function handleSuggestReply() {
    if (!canChat || !showSuggestReply) {
      return;
    }

    setError("");
    setNotice("");
    suggestReplyAssist.reset();

    try {
      const response = await suggestReplyAssist.runAssist({
        scope: "full_rescue",
        current_message: draft.trim() || null,
        current_data: {
          message: draft.trim() || null,
          chat_messages: recentChatContext,
        },
        context: {
          chat_messages: recentChatContext,
          chat_mode: true,
          rescue_request_id: Number(rescueRequestId),
          volunteer_id: Number(volunteerId),
        },
      });
      const nextDraft = response.message || response.generated_message || "";
      if (nextDraft.trim()) {
        setDraft(nextDraft);
        setAiFilled(true);
        setNotice(response.explanation || "AI suggested a reply. Review it before sending.");
      }
    } catch (requestError) {
      setError(requestError.userMessage || suggestReplyAssist.error || "Unable to suggest a reply.");
    }
  }

  if (!canChat) {
    return (
      <div className="empty-state">
        <div className="mx-auto max-w-md space-y-2">
          <div className="text-base font-semibold text-[var(--text)]">Chat becomes available after volunteer assignment</div>
          <div>
            Once a volunteer is assigned and the rescue is in dispatched status, this section will show the live coordination thread.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="chat-banner">
        Active assignment chat with <strong className="text-[var(--text)]">{volunteerName || `Volunteer #${volunteerId}`}</strong>
      </div>

      <ErrorAlert message={error || (showSuggestReply ? suggestReplyAssist.error : "")} />
      {notice ? <div className="notice notice-success">{notice}</div> : null}

      <div className="chat-messages" ref={listRef}>
        {loading ? (
          <div className="loading-wrap py-0">
            <div className="loading-state">
              <span className="pulse-dot" />
              <span>Loading chat history...</span>
            </div>
          </div>
        ) : messages.length ? (
          messages.map((item) => {
            const isOutgoing = item.sender_type === senderType;
            return (
              <div className={`chat-message ${isOutgoing ? "outgoing" : "incoming"}`} key={item.id}>
                <div className="chat-meta">
                  {item.sender_type} / {formatTimestamp(item.created_at)}
                </div>
                <div className="whitespace-pre-wrap">{item.message}</div>
              </div>
            );
          })
        ) : (
          <div className="empty-state !border-none !bg-transparent px-0 py-10">
            No chat messages yet. Start the coordination thread when needed.
          </div>
        )}
      </div>

      <form className="chat-compose" onSubmit={handleSubmit}>
        <textarea
          className={aiFilled ? "ai-filled-field" : ""}
          onChange={(event) => {
            setDraft(event.target.value);
            setAiFilled(false);
          }}
          placeholder={senderType === "volunteer" ? "Type an update for the coordinator" : "Type a coordination update for the assigned volunteer"}
          rows={4}
          value={draft}
        />
        <div className={`flex flex-wrap items-center gap-3 ${showSuggestReply ? "justify-between" : "justify-end"}`}>
          {showSuggestReply ? (
            <button
              className="btn-outline"
              disabled={suggestReplyAssist.loading || sending}
              onClick={handleSuggestReply}
              type="button"
            >
              <span className="btn-prefix">AI</span>
              <span>{suggestReplyAssist.loading ? "Suggesting..." : "Suggest Reply"}</span>
            </button>
          ) : null}
          <button className="btn-primary" disabled={!draft.trim() || sending} type="submit">
            <span>{sending ? "Sending..." : "Send Message"}</span>
            <span className="btn-suffix">&gt;&gt;</span>
          </button>
        </div>
      </form>
    </div>
  );
}
