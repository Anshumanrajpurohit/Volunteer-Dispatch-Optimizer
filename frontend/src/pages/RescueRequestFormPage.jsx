import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiRequest } from "../api/client";
import { FormField } from "../components/FormField";
import { useAuth } from "../hooks/useAuth";
import { parseCommaSeparatedList } from "../utils/format";

const initialForm = {
  location: "",
  latitude: "39.7990",
  longitude: "-86.1600",
  animal_type: "",
  urgency: "high",
  required_skills: "dog handling, transport",
  notes: "",
};

export function RescueRequestFormPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const created = await apiRequest("/rescue-requests", {
        method: "POST",
        token,
        body: {
          location: form.location,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          animal_type: form.animal_type,
          urgency: form.urgency,
          required_skills: parseCommaSeparatedList(form.required_skills),
          notes: form.notes || null,
        },
      });
      navigate(`/rescues/${created.id}/match`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-card p-6">
      <div className="mb-6">
        <p className="text-sm text-slate-600">Create a rescue case for volunteer ranking.</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">New rescue request</h2>
      </div>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <div className="md:col-span-2">
          <FormField label="Rescue location">
            <input className="input" value={form.location} onChange={(e) => updateField("location", e.target.value)} required />
          </FormField>
        </div>
        <FormField label="Latitude">
          <input className="input" type="number" step="0.0001" value={form.latitude} onChange={(e) => updateField("latitude", e.target.value)} required />
        </FormField>
        <FormField label="Longitude">
          <input className="input" type="number" step="0.0001" value={form.longitude} onChange={(e) => updateField("longitude", e.target.value)} required />
        </FormField>
        <FormField label="Animal type">
          <input className="input" value={form.animal_type} onChange={(e) => updateField("animal_type", e.target.value)} required />
        </FormField>
        <FormField label="Urgency">
          <select className="input" value={form.urgency} onChange={(e) => updateField("urgency", e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </FormField>
        <div className="md:col-span-2">
          <FormField label="Required skills" hint="Comma separated, for example: transport, first aid">
            <input className="input" value={form.required_skills} onChange={(e) => updateField("required_skills", e.target.value)} />
          </FormField>
        </div>
        <div className="md:col-span-2">
          <FormField label="Notes">
            <textarea className="input min-h-28" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
          </FormField>
        </div>
        {error ? <div className="md:col-span-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        <div className="md:col-span-2 flex justify-end gap-3">
          <button type="button" onClick={() => navigate("/")} className="secondary-btn">Cancel</button>
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Creating..." : "Create and rank volunteers"}
          </button>
        </div>
      </form>
    </section>
  );
}
