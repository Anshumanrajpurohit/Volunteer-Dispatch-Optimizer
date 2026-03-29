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
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, formatSkills, formatTimeValue } from "../utils/format";

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="page-eyebrow">People</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Volunteers</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Manage volunteer coverage, skills, location, and dispatch history with exact
            POST and PUT payloads that match the backend schema.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="secondary-button" onClick={() => loadVolunteers()} type="button">
            Refresh list
          </button>
          <button className="secondary-button" onClick={resetForm} type="button">
            New volunteer
          </button>
        </div>
      </div>

      <ErrorAlert message={pageError} />

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <SectionCard
          description="The form supports create and update with the same exact field names returned by the API."
          title={isEditing ? `Edit volunteer #${selectedVolunteerId}` : "Create volunteer"}
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
            <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
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
                <button className="primary-button" disabled={!canManage || saving} type="submit">
                  {saving ? "Saving..." : isEditing ? "Update volunteer" : "Create volunteer"}
                </button>
                {isEditing ? (
                  <button className="secondary-button" onClick={resetForm} type="button">
                    Cancel edit
                  </button>
                ) : null}
                {!canManage ? (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                    Read-only: your role cannot change volunteer records.
                  </span>
                ) : null}
              </div>
            </div>
          </form>
        </SectionCard>

        <SectionCard description="Latest data from GET /volunteers." title="Volunteer directory">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading volunteers...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-medium">Name</th>
                    <th className="px-3 py-3 font-medium">Skills</th>
                    <th className="px-3 py-3 font-medium">Availability</th>
                    <th className="px-3 py-3 font-medium">Dispatches</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Updated</th>
                    <th className="px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map((volunteer) => (
                    <tr className="border-b border-slate-100" key={volunteer.id}>
                      <td className="px-3 py-4">
                        <div className="font-medium text-slate-950">{volunteer.name}</div>
                        <div className="text-xs text-slate-500">
                          #{volunteer.id} • {volunteer.email || volunteer.phone || "No direct contact"}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-slate-600">{formatSkills(volunteer.skills)}</td>
                      <td className="px-3 py-4 text-slate-600">
                        {formatTimeValue(volunteer.availability_start)} - {formatTimeValue(volunteer.availability_end)}
                      </td>
                      <td className="px-3 py-4 text-slate-600">
                        {volunteer.successful_responses ?? 0}/{volunteer.total_dispatches ?? 0}
                      </td>
                      <td className="px-3 py-4">
                        <StatusBadge status={volunteer.active_status ? "active" : "inactive"} />
                      </td>
                      <td className="px-3 py-4 text-slate-600">{formatDateTime(volunteer.updated_at)}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button className="secondary-button px-3 py-2 text-xs" onClick={() => selectVolunteer(volunteer)} type="button">
                            Edit
                          </button>
                          <button
                            className="danger-button px-3 py-2 text-xs"
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
                      <td className="px-3 py-10 text-center text-slate-500" colSpan="7">
                        No volunteers found.
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
