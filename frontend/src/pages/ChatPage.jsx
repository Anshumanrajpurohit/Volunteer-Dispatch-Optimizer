import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { getDispatchLogs, getVolunteerRescues } from "../api/endpoints";
import { ChatPanel } from "../components/ChatPanel";
import { ErrorAlert } from "../components/ErrorAlert";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="page-eyebrow">Communication</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Rescue chat</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {isVolunteer
              ? "Open the live coordination thread for your currently assigned rescues."
              : "Monitor and continue live coordination threads for dispatched rescue assignments."}
          </p>
        </div>
        <div className="rounded-full bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm">
          Visible threads
          <span className="ml-2 font-medium text-slate-900">{threads.length}</span>
        </div>
      </div>

      <ErrorAlert message={error} />

      <div className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
        <SectionCard
          description={isVolunteer ? "Only rescues assigned to you appear here." : "Only active dispatched rescue chats appear here."}
          title="Available chats"
        >
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading rescue chats...</div>
          ) : threads.length ? (
            <div className="space-y-4">
              {threads.map((thread) => {
                const isSelected = selectedThread?.rescueId === thread.rescueId;
                return (
                  <button
                    className={`w-full rounded-3xl border px-5 py-4 text-left transition ${
                      isSelected
                        ? "border-cyan-300 bg-cyan-50/80 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                    key={thread.rescueId}
                    onClick={() => setSearchParams({ rescueId: String(thread.rescueId) })}
                    type="button"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-950">{thread.location}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {thread.animalType || "Animal not specified"} • urgency {thread.urgency || "n/a"}
                        </div>
                      </div>
                      <StatusBadge status={thread.status} />
                    </div>
                    <div className="mt-3 text-sm text-slate-600">
                      {thread.volunteerName || `Volunteer #${thread.volunteerId}`}
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                      Updated {formatDateTime(thread.updatedAt)}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500">
              {isVolunteer
                ? "Chat threads appear here when you have a currently dispatched rescue assignment."
                : "Chat threads appear here after a rescue is assigned and moved into dispatched status."}
            </div>
          )}
        </SectionCard>

        <SectionCard
          actions={selectedThread ? <Link className="secondary-button" to={selectedThread.detailPath}>Open rescue detail</Link> : null}
          description={selectedThread ? "Use chat to coordinate without leaving the assignment thread." : "Select a rescue thread to start chatting."}
          title="Conversation"
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
            <div className="flex min-h-[24rem] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-10 text-center text-sm text-slate-500">
              Select an available rescue chat from the list to open the conversation panel.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
