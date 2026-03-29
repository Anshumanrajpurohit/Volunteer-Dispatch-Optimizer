import { useEffect, useMemo, useRef, useState } from "react";

import { getChatMessages, sendChatMessage } from "../api/endpoints";
import { ErrorAlert } from "./ErrorAlert";
import { useAIAssist } from "../hooks/useAIAssist";

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
      <div className="flex min-h-[18rem] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-10 text-center text-sm text-slate-500">
        <div className="max-w-md space-y-2">
          <div className="text-base font-medium text-slate-950">Chat becomes available after volunteer assignment</div>
          <div>
            Once a volunteer is assigned and the rescue is in dispatched status, this section will show the live coordination thread.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
        Active assignment chat with <span className="font-medium text-slate-950">{volunteerName || `Volunteer #${volunteerId}`}</span>
      </div>

      <ErrorAlert message={error || (showSuggestReply ? suggestReplyAssist.error : "")} />
      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div
        className="max-h-[24rem] min-h-[18rem] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4"
        ref={listRef}
      >
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading chat history...</div>
        ) : messages.length ? (
          <div className="space-y-3">
            {messages.map((item) => {
              const isCoordinator = item.sender_type === "coordinator";
              return (
                <article
                  className={`flex ${isCoordinator ? "justify-end" : "justify-start"}`}
                  key={item.id}
                >
                  <div
                    className={`max-w-[85%] rounded-3xl px-4 py-3 shadow-sm ${
                      isCoordinator
                        ? "border border-cyan-200 bg-cyan-50 text-cyan-950"
                        : "border border-slate-200 bg-slate-50 text-slate-900"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                      <span>{item.sender_type}</span>
                      <span>•</span>
                      <span>{formatTimestamp(item.created_at)}</span>
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.message}</div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">
            No chat messages yet. Start the coordination thread when needed.
          </div>
        )}
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <textarea
          className={`w-full rounded-3xl border px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:ring-4 ${
            aiFilled
              ? "border-amber-300 bg-amber-50/70 focus:border-amber-400 focus:ring-amber-100"
              : "border-slate-200 bg-white focus:border-cyan-400 focus:ring-cyan-100"
          }`}
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
              className="secondary-button"
              disabled={suggestReplyAssist.loading || sending}
              onClick={handleSuggestReply}
              type="button"
            >
              {suggestReplyAssist.loading ? "Suggesting..." : "Suggest Reply"}
            </button>
          ) : null}
          <button className="primary-button" disabled={!draft.trim() || sending} type="submit">
            {sending ? "Sending..." : "Send message"}
          </button>
        </div>
      </form>
    </div>
  );
}
