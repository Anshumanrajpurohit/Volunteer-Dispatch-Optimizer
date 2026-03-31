import { useEffect, useState } from "react";

import { apiRequest } from "../api/client";
import { FormField } from "../components/FormField";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { joinList, parseCommaSeparatedList } from "../utils/format";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  latitude: "39.7800",
  longitude: "-86.1600",
  skills: "",
  availability_start: "08:00",
  availability_end: "18:00",
  total_dispatches: "0",
  successful_responses: "0",
  active_status: true,
};

export function VolunteerManagementPage() {
  const { token } = useAuth();
  const [volunteers, setVolunteers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadVolunteers() {
    setLoading(true);
    try {
      const data = await apiRequest("/volunteers", { token });
      setVolunteers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVolunteers();
  }, [token]);

  const sortedVolunteers = [...volunteers].sort((a, b) => a.name.localeCompare(b.name));

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(volunteer) {
    setEditingId(volunteer.id);
    setForm({
      name: volunteer.name,
      phone: volunteer.phone,
      email: volunteer.email,
      latitude: String(volunteer.latitude),
      longitude: String(volunteer.longitude),
      skills: joinList(volunteer.skills),
      availability_start: volunteer.availability_start,
      availability_end: volunteer.availability_end,
      total_dispatches: String(volunteer.total_dispatches),
      successful_responses: String(volunteer.successful_responses),
      active_status: volunteer.active_status,
    });
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      skills: parseCommaSeparatedList(form.skills),
      availability_start: form.availability_start,
      availability_end: form.availability_end,
      total_dispatches: Number(form.total_dispatches),
      successful_responses: Number(form.successful_responses),
      active_status: form.active_status,
    };

    try {
      await apiRequest(editingId ? `/volunteers/${editingId}` : "/volunteers", {
        method: editingId ? "PUT" : "POST",
        token,
        body: payload,
      });
      resetForm();
      await loadVolunteers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
      <section className="page-card p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-600">Create or update coordinator-managed volunteer profiles.</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink">Volunteer management</h2>
          </div>
          {editingId ? (
            <button type="button" onClick={resetForm} className="secondary-btn">
              Clear edit
            </button>
          ) : null}
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <FormField label="Name">
            <input className="input" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
          </FormField>
          <FormField label="Phone">
            <input className="input" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} required />
          </FormField>
          <FormField label="Email">
            <input className="input" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} required />
          </FormField>
          <FormField label="Skills" hint="Comma separated">
            <input className="input" value={form.skills} onChange={(e) => updateField("skills", e.target.value)} />
          </FormField>
          <FormField label="Latitude">
            <input className="input" type="number" step="0.0001" value={form.latitude} onChange={(e) => updateField("latitude", e.target.value)} required />
          </FormField>
          <FormField label="Longitude">
            <input className="input" type="number" step="0.0001" value={form.longitude} onChange={(e) => updateField("longitude", e.target.value)} required />
          </FormField>
          <FormField label="Availability start">
            <input className="input" type="time" value={form.availability_start} onChange={(e) => updateField("availability_start", e.target.value)} required />
          </FormField>
          <FormField label="Availability end">
            <input className="input" type="time" value={form.availability_end} onChange={(e) => updateField("availability_end", e.target.value)} required />
          </FormField>
          <FormField label="Total dispatches">
            <input className="input" type="number" min="0" value={form.total_dispatches} onChange={(e) => updateField("total_dispatches", e.target.value)} />
          </FormField>
          <FormField label="Successful responses">
            <input className="input" type="number" min="0" value={form.successful_responses} onChange={(e) => updateField("successful_responses", e.target.value)} />
          </FormField>
          <label className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              checked={form.active_status}
              onChange={(e) => updateField("active_status", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-pine focus:ring-pine"
            />
            <span className="text-sm text-slate-700">Volunteer is active and eligible for matching</span>
          </label>
          {error ? <div className="md:col-span-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={resetForm} className="secondary-btn">Reset</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update volunteer" : "Create volunteer"}
            </button>
          </div>
        </form>
      </section>

      <section className="page-card overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="section-title">Volunteer roster</h3>
        </div>
        {loading ? <div className="px-6 py-8 text-sm text-slate-500">Loading volunteers...</div> : null}
        {!loading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="soft-layout-surface text-left text-slate-600">
                <tr>
                  <th className="px-6 py-3 font-medium">Volunteer</th>
                  <th className="px-6 py-3 font-medium">Skills</th>
                  <th className="px-6 py-3 font-medium">Availability</th>
                  <th className="px-6 py-3 font-medium">Response</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="soft-layout-surface divide-y divide-slate-100">
                {sortedVolunteers.map((volunteer) => (
                  <tr key={volunteer.id}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink">{volunteer.name}</div>
                      <div className="text-slate-500">{volunteer.phone} | {volunteer.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{joinList(volunteer.skills) || "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{volunteer.availability_start} - {volunteer.availability_end}</td>
                    <td className="px-6 py-4 text-slate-600">{volunteer.successful_responses}/{volunteer.total_dispatches}</td>
                    <td className="px-6 py-4"><StatusBadge status={volunteer.active_status ? "active" : "inactive"} /></td>
                    <td className="px-6 py-4">
                      <button type="button" className="secondary-btn" onClick={() => startEdit(volunteer)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}



