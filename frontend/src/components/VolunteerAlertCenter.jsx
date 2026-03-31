import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getVolunteerAlerts, respondToVolunteerRescue } from "../api/endpoints";
import { StatusBadge, UrgencyChip } from "./StatusBadge";

const POLL_INTERVAL_MS = 8000;

export function VolunteerAlertCenter() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [responding, setResponding] = useState(false);

  async function loadAlerts() {
    try {
      const nextAlerts = await getVolunteerAlerts();
      setAlerts(nextAlerts);
      setDismissedIds((current) => current.filter((id) => nextAlerts.some((item) => item.rescue_request_id === id)));
    } catch {
      // Keep alert polling silent to avoid disrupting the volunteer panel.
    }
  }

  useEffect(() => {
    loadAlerts();
    const intervalId = window.setInterval(loadAlerts, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  const activeAlert = useMemo(
    () => alerts.find((alert) => !dismissedIds.includes(alert.rescue_request_id)) || null,
    [alerts, dismissedIds],
  );

  async function handleResponse(nextStatus) {
    if (!activeAlert) {
      return;
    }

    setResponding(true);
    try {
      await respondToVolunteerRescue(activeAlert.rescue_request_id, { status: nextStatus });
      await loadAlerts();
      setDismissedIds((current) => [...current, activeAlert.rescue_request_id]);
      if (nextStatus !== "declined") {
        navigate(`/my-rescues/${activeAlert.rescue_request_id}`);
      }
    } finally {
      setResponding(false);
    }
  }

  if (!activeAlert) {
    return null;
  }

  return (
    <div className="volunteer-alert page-active">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="page-kicker">New Dispatch Alert</div>
          <div className="mt-3 text-xl font-bold text-[var(--text)]">{activeAlert.location}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={activeAlert.current_response_status || "contacted"} />
            <UrgencyChip value={activeAlert.urgency || "N/A"} />
          </div>
          <div className="mt-3 text-sm text-[var(--text2)]">{activeAlert.animal_type || "Animal not specified"}</div>
        </div>
        <button
          className="btn-ghost"
          onClick={() => setDismissedIds((current) => [...current, activeAlert.rescue_request_id])}
          type="button"
        >
          Dismiss
        </button>
      </div>

      <div className="notice notice-muted mt-4">
        {activeAlert.dispatch_message || "A coordinator assigned a new rescue and is waiting for your response."}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button className="btn-primary" disabled={responding} onClick={() => handleResponse("accepted")} type="button">
          {responding ? "Working..." : "Accept"}
        </button>
        <button className="btn-danger" disabled={responding} onClick={() => handleResponse("declined")} type="button">
          Decline
        </button>
        <button className="btn-outline" onClick={() => navigate(`/my-rescues/${activeAlert.rescue_request_id}`)} type="button">
          Open Rescue
        </button>
        <button className="btn-outline" onClick={() => navigate(`/chat?rescueId=${activeAlert.rescue_request_id}`)} type="button">
          Open Chat
        </button>
      </div>
    </div>
  );
}
