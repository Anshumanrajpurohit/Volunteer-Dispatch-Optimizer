import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getVolunteerAlerts, respondToVolunteerRescue } from "../api/endpoints";

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
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-md rounded-[1.75rem] border border-amber-300 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">New Dispatch Alert</div>
          <div className="mt-2 text-lg font-semibold text-slate-950">{activeAlert.location}</div>
          <div className="mt-1 text-sm text-slate-600">
            {activeAlert.animal_type || "Animal not specified"} • urgency {activeAlert.urgency || "n/a"}
          </div>
        </div>
        <button
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          onClick={() => setDismissedIds((current) => [...current, activeAlert.rescue_request_id])}
          type="button"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-4 rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {activeAlert.dispatch_message || "A coordinator assigned a new rescue and is waiting for your response."}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button className="primary-button" disabled={responding} onClick={() => handleResponse("accepted")} type="button">
          {responding ? "Working..." : "Accept"}
        </button>
        <button className="danger-button" disabled={responding} onClick={() => handleResponse("declined")} type="button">
          Decline
        </button>
        <button className="secondary-button" onClick={() => navigate(`/my-rescues/${activeAlert.rescue_request_id}`)} type="button">
          Open Rescue
        </button>
        <button className="secondary-button" onClick={() => navigate(`/chat?rescueId=${activeAlert.rescue_request_id}`)} type="button">
          Open Chat
        </button>
      </div>
    </div>
  );
}
