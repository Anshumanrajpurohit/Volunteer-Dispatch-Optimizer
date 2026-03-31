import { useEffect, useState } from "react";

import {
  createVolunteer,
  deleteVolunteer,
  getVolunteers,
  updateVolunteer,
} from "../api/endpoints";
import { ErrorAlert } from "../components/ErrorAlert";
import { FormField } from "../components/FormField";
import { SectionCard } from "../components/SectionCard";
import { SkillTags, StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, formatTimeValue } from "../utils/format";

function emptyVolunteerForm() {
  return {
    active_status: true,
    availability_end: "",
    availability_start: "",
    email: "",
    latitude: "",
    longitude: "",
    name: "",
    phone: "",
    skills: "",
    successful_responses: "0",
    total_dispatches: "0",
  };
}

function parseList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getInitials(name) {
  return String(name || "VL")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function VolunteersPage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "coordinator";
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState(null);
  const [form, setForm] = useState(emptyVolunteerForm);

  const isEditing = selectedVolunteerId !== null;

  async function loadVolunteers(nextSelectedId = selectedVolunteerId) {
    setLoading(true);
    setPageError("");

    try {
      const data = await getVolunteers();
      setVolunteers(data);

      if (nextSelectedId !== null) {
        const volunteer = data.find((item) => item.id === nextSelectedId);
        if (volunteer) {
          setSelectedVolunteerId(volunteer.id);
          setForm({
            active_status: volunteer.active_status !== false,
            availability_end: formatTimeValue(volunteer.availability_end),
            availability_start: formatTimeValue(volunteer.availability_start),
            email: volunteer.email || "",
            latitude: String(volunteer.latitude ?? ""),
            longitude: String(volunteer.longitude ?? ""),
            name: volunteer.name || "",
            phone: volunteer.phone || "",
            skills: volunteer.skills?.join(", ") || "",
            successful_responses: String(volunteer.successful_responses ?? 0),
            total_dispatches: String(volunteer.total_dispatches ?? 0),
          });
        }
      }
    } catch (error) {
      setPageError(error.userMessage || "Unable to load volunteers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVolunteers();
  }, []);

  function resetForm() {
    setSelectedVolunteerId(null);
    setForm(emptyVolunteerForm());
    setFormError("");
  }

  function selectVolunteer(volunteer) {
    setSelectedVolunteerId(volunteer.id);
    setFormError("");
    setForm({
      active_status: volunteer.active_status !== false,
      availability_end: formatTimeValue(volunteer.availability_end),
      availability_start: formatTimeValue(volunteer.availability_start),
      email: volunteer.email || "",
      latitude: String(volunteer.latitude ?? ""),
      longitude: String(volunteer.longitude ?? ""),
      name: volunteer.name || "",
      phone: volunteer.phone || "",
      skills: volunteer.skills?.join(", ") || "",
      successful_responses: String(volunteer.successful_responses ?? 0),
      total_dispatches: String(volunteer.total_dispatches ?? 0),
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    const totalDispatches = Number(form.total_dispatches);
    const successfulResponses = Number(form.successful_responses);

    if (successfulResponses > totalDispatches) {
      setSaving(false);
      setFormError("Successful responses cannot exceed total dispatches.");
      return;
    }

    const payload = {
      active_status: Boolean(form.active_status),
      availability_end: form.availability_end || null,
      availability_start: form.availability_start || null,
      email: form.email.trim() || null,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      skills: parseList(form.skills),
      successful_responses: successfulResponses,
      total_dispatches: totalDispatches,
    };

    try {
      if (isEditing) {
        await updateVolunteer(selectedVolunteerId, payload);
        await loadVolunteers(selectedVolunteerId);
      } else {
        const created = await createVolunteer(payload);
        await loadVolunteers(created.id);
      }
    } catch (error) {
      setFormError(error.userMessage || "Unable to save volunteer.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(volunteerId) {
    const confirmed = window.confirm(`Delete volunteer #${volunteerId}?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(volunteerId);
    setPageError("");

    try {
      await deleteVolunteer(volunteerId);
      if (selectedVolunteerId === volunteerId) {
        resetForm();
      }
      await loadVolunteers(null);
    } catch (error) {
      setPageError(error.userMessage || "Unable to delete volunteer.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page-shell page-active">
      <div className="page-header">
        <div>
          <div className="page-kicker">People</div>
          <h1 className="page-title">Volunteers</h1>
          <p className="page-description">
            Manage volunteer coverage, skills, location, and dispatch history with exact POST and PUT payloads that match the backend schema.
          </p>
        </div>
        <div className="page-toolbar">
          <button className="btn-outline" onClick={() => loadVolunteers()} type="button">
            Refresh List
          </button>
          <button className="btn-primary" onClick={resetForm} type="button">
            New Volunteer
          </button>
        </div>
      </div>

      <ErrorAlert message={pageError} />

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          description="The form supports create and update with the same exact field names returned by the API."
          title={isEditing ? `Edit volunteer #${selectedVolunteerId}` : "Create volunteer"}
          titleTag={isEditing ? "edit mode" : "new record"}
        >
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <FormField
              label="Name"
              name="name"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              value={form.name}
            />
            <FormField
              label="Phone"
              name="phone"
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              value={form.phone}
            />
            <FormField
              label="Email"
              name="email"
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              type="email"
              value={form.email}
            />
            <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
              <FormField
                label="Latitude"
                name="latitude"
                onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
                required
                step="any"
                type="number"
                value={form.latitude}
              />
              <FormField
                label="Longitude"
                name="longitude"
                onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
                required
                step="any"
                type="number"
                value={form.longitude}
              />
            </div>
            <div className="md:col-span-2">
              <FormField
                hint="Comma-separated. Sent as an array."
                label="Skills"
                name="skills"
                onChange={(event) => setForm((current) => ({ ...current, skills: event.target.value }))}
                placeholder="transport, first aid"
                value={form.skills}
              />
            </div>
            <FormField
              label="Availability start"
              name="availability_start"
              onChange={(event) => setForm((current) => ({ ...current, availability_start: event.target.value }))}
              type="time"
              value={form.availability_start}
            />
            <FormField
              label="Availability end"
              name="availability_end"
              onChange={(event) => setForm((current) => ({ ...current, availability_end: event.target.value }))}
              type="time"
              value={form.availability_end}
            />
            <FormField
              label="Total dispatches"
              min="0"
              name="total_dispatches"
              onChange={(event) => setForm((current) => ({ ...current, total_dispatches: event.target.value }))}
              type="number"
              value={form.total_dispatches}
            />
            <FormField
              label="Successful responses"
              min="0"
              name="successful_responses"
              onChange={(event) => setForm((current) => ({ ...current, successful_responses: event.target.value }))}
              type="number"
              value={form.successful_responses}
            />
            <div className="md:col-span-2">
              <FormField
                checked={form.active_status}
                label="Active and available for assignment"
                name="active_status"
                onChange={(event) => setForm((current) => ({ ...current, active_status: event.target.checked }))}
                type="checkbox"
              />
            </div>
            <div className="md:col-span-2 space-y-3">
              <ErrorAlert message={formError} />
              <div className="flex flex-wrap gap-3">
                <button className="btn-primary" disabled={!canManage || saving} type="submit">
                  {saving ? "Saving..." : isEditing ? "Update Volunteer" : "Create Volunteer"}
                </button>
                {isEditing ? (
                  <button className="btn-outline" onClick={resetForm} type="button">
                    Cancel Edit
                  </button>
                ) : null}
                {!canManage ? <div className="notice notice-ai">Read-only: your role cannot change volunteer records.</div> : null}
              </div>
            </div>
          </form>
        </SectionCard>

        <SectionCard description="Latest data from GET /volunteers." title="Volunteer directory" titleTag="ops roster">
          {loading ? (
            <div className="loading-wrap">
              <div className="loading-state">
                <span className="pulse-dot" />
                <span>Loading volunteers...</span>
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Skills</th>
                    <th>Availability</th>
                    <th>Dispatches</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map((volunteer) => (
                    <tr key={volunteer.id}>
                      <td>
                        <div className="person-pill">
                          <div className="avatar-circle">
                            <span className="avatar-initials">{getInitials(volunteer.name)}</span>
                          </div>
                          <div>
                            <div className="td-primary">{volunteer.name}</div>
                            <div className="table-meta">#{volunteer.id} / {volunteer.email || volunteer.phone || "No direct contact"}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <SkillTags skills={volunteer.skills} />
                      </td>
                      <td>
                        {formatTimeValue(volunteer.availability_start)} - {formatTimeValue(volunteer.availability_end)}
                      </td>
                      <td>
                        {volunteer.successful_responses ?? 0}/{volunteer.total_dispatches ?? 0}
                      </td>
                      <td>
                        <StatusBadge status={volunteer.active_status ? "active" : "inactive"} />
                      </td>
                      <td>{formatDateTime(volunteer.updated_at)}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-outline" onClick={() => selectVolunteer(volunteer)} type="button">
                            Edit
                          </button>
                          <button
                            className="btn-danger"
                            disabled={!canManage || deletingId === volunteer.id}
                            onClick={() => handleDelete(volunteer.id)}
                            type="button"
                          >
                            {deletingId === volunteer.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!volunteers.length ? (
                    <tr>
                      <td className="text-center" colSpan="7">
                        <div className="empty-state">No volunteers found.</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
