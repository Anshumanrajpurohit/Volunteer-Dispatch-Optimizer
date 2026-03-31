import { useEffect, useState } from "react";

import { getDispatchLogs, getRescueRequests, getVolunteers } from "../api/endpoints";
import { ErrorAlert } from "../components/ErrorAlert";
import { FormField } from "../components/FormField";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge, getStatusDotClass } from "../components/StatusBadge";
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
    <div className="page-shell page-active">
      <div className="page-header">
        <div>
          <div className="page-kicker">Audit Trail</div>
          <h1 className="page-title">Dispatch logs</h1>
          <p className="page-description">
            Filter dispatch history by rescue request or volunteer using GET /dispatch-logs query parameters.
          </p>
        </div>
      </div>

      <SectionCard description="Apply server-side filtering without reloading the app shell." title="Filters" titleTag="query">
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
          <div className="flex gap-3 md:pt-6">
            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? "Loading..." : "Apply"}
            </button>
            <button className="btn-outline" onClick={handleClearFilters} type="button">
              Clear
            </button>
          </div>
        </form>
      </SectionCard>

      <ErrorAlert message={error} />

      <SectionCard
        description="Latest dispatch log rows, including related request and volunteer objects."
        title="Dispatch history"
        titleTag="server data"
      >
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Created</th>
                <th>Request</th>
                <th>Volunteer</th>
                <th>Dispatch</th>
                <th>Message snapshot</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className={getStatusDotClass(log.dispatch_status)} />
                  </td>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td>
                    <div className="td-primary">
                      {log.rescue_request ? log.rescue_request.location : `Request #${log.rescue_request_id || "n/a"}`}
                    </div>
                    <div className="table-meta">#{log.rescue_request_id || "n/a"}</div>
                  </td>
                  <td>
                    <div className="td-primary">
                      {log.volunteer ? log.volunteer.name : `Volunteer #${log.volunteer_id || "n/a"}`}
                    </div>
                    <div className="table-meta">#{log.volunteer_id || "n/a"}</div>
                  </td>
                  <td>
                    <StatusBadge status={log.dispatch_status} />
                  </td>
                  <td>{truncateText(log.message_snapshot || "No snapshot", 120)}</td>
                  <td>{truncateText(log.notes || "No notes", 72)}</td>
                </tr>
              ))}
              {!logs.length && !loading ? (
                <tr>
                  <td className="text-center" colSpan="7">
                    <div className="empty-state">No dispatch logs matched the selected filters.</div>
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
