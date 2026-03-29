import { useEffect, useState } from "react";

import { getDispatchLogs, getRescueRequests, getVolunteers } from "../api/endpoints";
import { ErrorAlert } from "../components/ErrorAlert";
import { FormField } from "../components/FormField";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateTime, truncateText } from "../utils/format";

export function DispatchLogsPage() {
  const [logs, setLogs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [filters, setFilters] = useState({
    rescue_request_id: "",
    volunteer_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMetadata() {
    const [requestData, volunteerData] = await Promise.all([getRescueRequests(), getVolunteers()]);
    setRequests(requestData);
    setVolunteers(volunteerData);
  }

  async function loadLogs(nextFilters = filters) {
    setLoading(true);
    setError("");

    try {
      const data = await getDispatchLogs(nextFilters);
      setLogs(data);
    } catch (requestError) {
      setError(requestError.userMessage || "Unable to load dispatch logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setError("");

      try {
        await Promise.all([loadMetadata(), loadLogs({ rescue_request_id: "", volunteer_id: "" })]);
      } catch (requestError) {
        setError(requestError.userMessage || "Unable to load dispatch logs.");
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  async function handleApplyFilters(event) {
    event.preventDefault();
    await loadLogs(filters);
  }

  async function handleClearFilters() {
    const cleared = { rescue_request_id: "", volunteer_id: "" };
    setFilters(cleared);
    await loadLogs(cleared);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="page-eyebrow">Audit Trail</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Dispatch logs</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Filter dispatch history by rescue request or volunteer using GET /dispatch-logs query parameters.
        </p>
      </div>

      <SectionCard description="Apply server-side filtering without reloading the app shell." title="Filters">
        <form className="grid gap-4 md:grid-cols-[minmax(0,1fr),minmax(0,1fr),auto]" onSubmit={handleApplyFilters}>
          <FormField
            label="Rescue request"
            name="rescue_request_id"
            onChange={(event) => setFilters((current) => ({ ...current, rescue_request_id: event.target.value }))}
            options={[
              { label: "All rescue requests", value: "" },
              ...requests.map((request) => ({
                label: `#${request.id} - ${request.location}`,
                value: String(request.id),
              })),
            ]}
            type="select"
            value={filters.rescue_request_id}
          />
          <FormField
            label="Volunteer"
            name="volunteer_id"
            onChange={(event) => setFilters((current) => ({ ...current, volunteer_id: event.target.value }))}
            options={[
              { label: "All volunteers", value: "" },
              ...volunteers.map((volunteer) => ({
                label: `${volunteer.name} (#${volunteer.id})`,
                value: String(volunteer.id),
              })),
            ]}
            type="select"
            value={filters.volunteer_id}
          />
          <div className="flex gap-3 md:pt-7">
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "Loading..." : "Apply"}
            </button>
            <button className="secondary-button" onClick={handleClearFilters} type="button">
              Clear
            </button>
          </div>
        </form>
      </SectionCard>

      <ErrorAlert message={error} />

      <SectionCard
        description="Latest dispatch log rows, including related request and volunteer objects."
        title="Dispatch history"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-3 font-medium">Created</th>
                <th className="px-3 py-3 font-medium">Request</th>
                <th className="px-3 py-3 font-medium">Volunteer</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Message snapshot</th>
                <th className="px-3 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr className="border-b border-slate-100" key={log.id}>
                  <td className="px-3 py-4 text-slate-600">{formatDateTime(log.created_at)}</td>
                  <td className="px-3 py-4">
                    <div className="font-medium text-slate-950">
                      {log.rescue_request ? log.rescue_request.location : `Request #${log.rescue_request_id || "n/a"}`}
                    </div>
                    <div className="text-xs text-slate-500">#{log.rescue_request_id || "n/a"}</div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="font-medium text-slate-950">
                      {log.volunteer ? log.volunteer.name : `Volunteer #${log.volunteer_id || "n/a"}`}
                    </div>
                    <div className="text-xs text-slate-500">#{log.volunteer_id || "n/a"}</div>
                  </td>
                  <td className="px-3 py-4">
                    <StatusBadge status={log.dispatch_status} />
                  </td>
                  <td className="px-3 py-4 text-slate-600">{truncateText(log.message_snapshot || "No snapshot", 120)}</td>
                  <td className="px-3 py-4 text-slate-600">{truncateText(log.notes || "No notes", 72)}</td>
                </tr>
              ))}
              {!logs.length && !loading ? (
                <tr>
                  <td className="px-3 py-10 text-center text-slate-500" colSpan="6">
                    No dispatch logs matched the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
