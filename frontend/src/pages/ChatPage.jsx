import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { getDispatchLogs, getVolunteerRescues } from "../api/endpoints";
import { ChatPanel } from "../components/ChatPanel";
import { ErrorAlert } from "../components/ErrorAlert";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge, UrgencyChip } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime } from "../utils/format";

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function getTimeValue(value) {
  const timestamp = Date.parse(value || "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function buildCoordinatorThreads(logs) {
  const latestByRescue = new Map();

  logs
    .filter((log) => log.rescue_request_id && log.volunteer_id && log.rescue_request)
    .forEach((log) => {
      const existing = latestByRescue.get(log.rescue_request_id);
      if (!existing || getTimeValue(log.created_at) >= getTimeValue(existing.updatedAt)) {
        latestByRescue.set(log.rescue_request_id, {
          animalType: log.rescue_request?.animal_type,
          detailPath: `/rescue-requests/${log.rescue_request_id}`,
          location: log.rescue_request?.location || `Request #${log.rescue_request_id}`,
          rescueId: log.rescue_request_id,
          rescueStatus: normalizeStatus(log.rescue_request?.status || "open"),
          status: normalizeStatus(log.dispatch_status || log.rescue_request?.status || "unknown"),
          updatedAt: log.created_at,
          urgency: log.rescue_request?.urgency,
          volunteerId: log.volunteer_id,
          volunteerName: log.volunteer?.name || null,
        });
      }
    });

  return Array.from(latestByRescue.values())
    .filter((thread) => thread.rescueStatus === "dispatched")
    .sort((left, right) => getTimeValue(right.updatedAt) - getTimeValue(left.updatedAt));
}

function buildVolunteerThreads(rescues) {
  return rescues
    .filter((rescue) => rescue.chat_enabled || normalizeStatus(rescue.rescue_status) === "dispatched")
    .map((rescue) => ({
      animalType: rescue.animal_type,
      detailPath: `/my-rescues/${rescue.id}`,
      location: rescue.location || `Rescue #${rescue.id}`,
      rescueId: rescue.id,
      rescueStatus: normalizeStatus(rescue.rescue_status || "open"),
      status: normalizeStatus(rescue.current_response_status || rescue.rescue_status || "unknown"),
      updatedAt: rescue.last_update_at || rescue.assigned_at,
      urgency: rescue.urgency,
      volunteerId: rescue.volunteer_id,
      volunteerName: rescue.volunteer_name || null,
    }))
    .sort((left, right) => getTimeValue(right.updatedAt) - getTimeValue(left.updatedAt));
}

export function ChatPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const role = normalizeStatus(user?.role);
  const isVolunteer = role === "volunteer";

  useEffect(() => {
    let cancelled = false;

    async function loadThreads() {
      setLoading(true);
      setError("");

      try {
        const data = isVolunteer ? await getVolunteerRescues() : await getDispatchLogs();
        const nextThreads = isVolunteer ? buildVolunteerThreads(data) : buildCoordinatorThreads(data);
        if (!cancelled) {
          setThreads(nextThreads);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.userMessage || "Unable to load rescue chats.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadThreads();
    return () => {
      cancelled = true;
    };
  }, [isVolunteer]);

  const selectedRescueId = searchParams.get("rescueId");
  const selectedThread = useMemo(() => {
    if (!threads.length) {
      return null;
    }

    return threads.find((thread) => String(thread.rescueId) === String(selectedRescueId)) || threads[0];
  }, [selectedRescueId, threads]);

  useEffect(() => {
    if (!threads.length) {
      if (selectedRescueId) {
        setSearchParams({}, { replace: true });
      }
      return;
    }

    if (!selectedThread || String(selectedThread.rescueId) !== String(selectedRescueId)) {
      setSearchParams({ rescueId: String((selectedThread || threads[0]).rescueId) }, { replace: true });
    }
  }, [selectedRescueId, selectedThread, setSearchParams, threads]);

  return (
    <div className="page-shell page-active">
      <div className="page-header">
        <div>
          <div className="page-kicker">Communication</div>
          <h1 className="page-title">Rescue chat</h1>
          <p className="page-description">
            {isVolunteer
              ? "Open the live coordination thread for your currently assigned rescues."
              : "Monitor and continue live coordination threads for dispatched rescue assignments."}
          </p>
        </div>
        <div className="page-chip">
          Visible threads <strong>{threads.length}</strong>
        </div>
      </div>

      <ErrorAlert message={error} />

      <div className="chat-container">
        <SectionCard
          description={isVolunteer ? "Only rescues assigned to you appear here." : "Only active dispatched rescue chats appear here."}
          title="Available chats"
          titleTag="thread list"
        >
          {loading ? (
            <div className="loading-wrap">
              <div className="loading-state">
                <span className="pulse-dot" />
                <span>Loading rescue chats...</span>
              </div>
            </div>
          ) : threads.length ? (
            <div className="chat-thread-list">
              {threads.map((thread) => {
                const isSelected = selectedThread?.rescueId === thread.rescueId;
                return (
                  <button
                    className={`chat-thread-item${isSelected ? " active" : ""}`}
                    key={thread.rescueId}
                    onClick={() => setSearchParams({ rescueId: String(thread.rescueId) })}
                    type="button"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="td-primary">{thread.location}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge status={thread.status} />
                          <UrgencyChip value={thread.urgency || "N/A"} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 muted-copy">{thread.animalType || "Animal not specified"}</div>
                    <div className="mt-2 subdued-copy">{thread.volunteerName || `Volunteer #${thread.volunteerId}`}</div>
                    <div className="table-meta">Updated {formatDateTime(thread.updatedAt)}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              {isVolunteer
                ? "Chat threads appear here when you have a currently dispatched rescue assignment."
                : "Chat threads appear here after a rescue is assigned and moved into dispatched status."}
            </div>
          )}
        </SectionCard>

        <SectionCard
          actions={selectedThread ? <Link className="btn-outline" to={selectedThread.detailPath}>Open Rescue Detail</Link> : null}
          description={selectedThread ? "Use chat to coordinate without leaving the assignment thread." : "Select a rescue thread to start chatting."}
          title="Conversation"
          titleTag="live channel"
        >
          {selectedThread ? (
            <ChatPanel
              rescueRequestId={selectedThread.rescueId}
              rescueStatus={selectedThread.rescueStatus}
              userRole={user?.role}
              volunteerId={selectedThread.volunteerId}
              volunteerName={selectedThread.volunteerName}
            />
          ) : (
            <div className="empty-state">Select an available rescue chat from the list to open the conversation panel.</div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
