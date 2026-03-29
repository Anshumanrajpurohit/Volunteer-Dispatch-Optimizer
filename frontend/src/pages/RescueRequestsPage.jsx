import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createRescueRequest, getRescueRequests } from "../api/endpoints";
import { AIActionButton } from "../components/AIActionButton";
import { ErrorAlert } from "../components/ErrorAlert";
import { FormField } from "../components/FormField";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAIAssist } from "../hooks/useAIAssist";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, formatSkills, truncateText } from "../utils/format";

function emptyRequestForm() {
  return {
    animal_type: "",
    latitude: "",
    location: "",
    longitude: "",
    notes: "",
    required_skills: "",
    urgency: "2",
  };
}

function parseList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAiFieldProps(aiFilledFields, fieldName, hint) {
  if (!aiFilledFields.includes(fieldName)) {
    return { hint };
  }

  return {
    hint: hint ? `${hint} AI-filled suggestion applied.` : "AI-filled suggestion applied.",
    inputClassName: "border-amber-300 bg-amber-50/70 focus:border-amber-400 focus:ring-amber-100",
    labelClassName: "text-amber-900",
    hintClassName: "text-amber-700",
  };
}

function serializeRequestSummary(request) {
  return {
    id: request.id,
    location: request.location,
    animal_type: request.animal_type,
    urgency: request.urgency,
    required_skills: request.required_skills || [],
    status: request.status,
  };
}

export function RescueRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "coordinator";
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestForm, setRequestForm] = useState(emptyRequestForm);
  const [aiDescription, setAiDescription] = useState("");
  const [assistNotice, setAssistNotice] = useState("");
  const [aiFilledFields, setAiFilledFields] = useState([]);
  const rescueAssist = useAIAssist("/ai/rescue-form-assist");

  async function loadRequests() {
    setLoading(true);
    setPageError("");

    try {
      const requestData = await getRescueRequests();
      setRequests(requestData);
    } catch (error) {
      setPageError(error.userMessage || "Unable to load rescue requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  function updateAiFilledFields(fieldNames) {
    setAiFilledFields((current) => Array.from(new Set([...current, ...fieldNames])));
  }

  function clearAiField(fieldName) {
    setAiFilledFields((current) => current.filter((item) => item !== fieldName));
  }

  function handleRequestFieldChange(fieldName, value) {
    clearAiField(fieldName);
    setRequestForm((current) => ({ ...current, [fieldName]: value }));
  }

  function applyAssistResult(result) {
    const responseFields = {
      location: result.fields?.location ?? result.location,
      animal_type: result.fields?.animal_type ?? result.animal_type,
      urgency: result.fields?.urgency ?? result.urgency,
      required_skills: result.fields?.required_skills ?? result.required_skills,
      notes: result.fields?.notes ?? result.notes,
    };
    const appliedFields = [];

    setRequestForm((current) => {
      const next = { ...current };

      if (typeof responseFields.location === "string" && responseFields.location.trim()) {
        next.location = responseFields.location;
        appliedFields.push("location");
      }

      if (typeof responseFields.animal_type === "string" && responseFields.animal_type.trim()) {
        next.animal_type = responseFields.animal_type;
        appliedFields.push("animal_type");
      }

      const urgencyValue = Number(responseFields.urgency);
      if (Number.isInteger(urgencyValue) && urgencyValue >= 1 && urgencyValue <= 4) {
        next.urgency = String(urgencyValue);
        appliedFields.push("urgency");
      }

      if (Array.isArray(responseFields.required_skills) && responseFields.required_skills.length) {
        next.required_skills = responseFields.required_skills.join(", ");
        appliedFields.push("required_skills");
      }

      if (typeof responseFields.notes === "string" && responseFields.notes.trim()) {
        next.notes = responseFields.notes;
        appliedFields.push("notes");
      }

      return next;
    });

    updateAiFilledFields(appliedFields);
  }

  async function handleAssist(scope) {
    if (!aiDescription.trim() && !requestForm.notes.trim() && !requestForm.location.trim()) {
      setRequestError("Add current rescue details before using AI assist.");
      return;
    }

    setAssistNotice("");
    setRequestError("");
    rescueAssist.reset();

    try {
      const result = await rescueAssist.runAssist({
        scope,
        description: aiDescription.trim() || null,
        current_data: {
          description: aiDescription.trim() || null,
          location: requestForm.location.trim() || null,
          animal_type: requestForm.animal_type.trim() || null,
          urgency: Number(requestForm.urgency),
          required_skills: parseList(requestForm.required_skills),
          notes: requestForm.notes.trim() || null,
          latitude: requestForm.latitude ? Number(requestForm.latitude) : null,
          longitude: requestForm.longitude ? Number(requestForm.longitude) : null,
        },
        context: {
          recent_requests: requests.slice(0, 5).map(serializeRequestSummary),
        },
      });
      applyAssistResult(result);
      setAssistNotice(result.message || "AI suggestions were applied to the rescue form. Review them before submitting.");
    } catch (error) {
      setRequestError(error.userMessage || rescueAssist.error || "Unable to generate AI rescue form suggestions.");
    }
  }

  async function handleRequestSubmit(event) {
    event.preventDefault();
    setRequestSaving(true);
    setRequestError("");

    try {
      const created = await createRescueRequest({
        animal_type: requestForm.animal_type.trim() || null,
        latitude: Number(requestForm.latitude),
        location: requestForm.location.trim(),
        longitude: Number(requestForm.longitude),
        notes: requestForm.notes.trim() || null,
        required_skills: parseList(requestForm.required_skills),
        urgency: Number(requestForm.urgency),
      });

      setRequestForm(emptyRequestForm());
      setAiDescription("");
      setAssistNotice("");
      setAiFilledFields([]);
      rescueAssist.reset();
      await loadRequests();
      navigate(`/rescue-requests/${created.id}/matches`);
    } catch (error) {
      setRequestError(error.userMessage || "Unable to create rescue request.");
    } finally {
      setRequestSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="page-eyebrow">Operations</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Rescue requests</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Rescue intake now flows directly into optimization. Create a request, rank eligible volunteers,
            review the generated dispatch draft, and confirm assignment from recommendations.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AIActionButton
            disabled={!canManage || rescueAssist.loading}
            label="AI Assist"
            loading={rescueAssist.loading}
            onSelect={handleAssist}
          />
          <button className="secondary-button" onClick={loadRequests} type="button">
            Refresh queue
          </button>
        </div>
      </div>

      <ErrorAlert message={pageError} />

      <div className="grid gap-6 xl:grid-cols-[1fr,1.1fr]">
        <SectionCard
          actions={
            <AIActionButton
              disabled={!canManage || rescueAssist.loading}
              label="Auto-fill with AI"
              loading={rescueAssist.loading}
              onSelect={handleAssist}
            />
          }
          description="Creates a live rescue request, then routes directly into ranked volunteer recommendations."
          title="Create rescue request"
        >
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleRequestSubmit}>
            <div className="md:col-span-2">
              <FormField
                hint="AI fills location, animal type, urgency, required skills, and notes. Coordinates stay manual."
                label="Describe rescue in natural language"
                name="ai_description"
                onChange={(event) => setAiDescription(event.target.value)}
                placeholder="Dog stuck in flood water near Riverside bridge with possible leg injury"
                rows={3}
                type="textarea"
                value={aiDescription}
              />
            </div>
            <div className="md:col-span-2">
              <FormField
                {...getAiFieldProps(aiFilledFields, "location")}
                label="Location"
                name="location"
                onChange={(event) => handleRequestFieldChange("location", event.target.value)}
                placeholder="Broad Ripple alley pickup"
                required
                value={requestForm.location}
              />
            </div>
            <FormField
              label="Latitude"
              name="latitude"
              onChange={(event) => setRequestForm((current) => ({ ...current, latitude: event.target.value }))}
              placeholder="39.8687"
              required
              step="any"
              type="number"
              value={requestForm.latitude}
            />
            <FormField
              label="Longitude"
              name="longitude"
              onChange={(event) => setRequestForm((current) => ({ ...current, longitude: event.target.value }))}
              placeholder="-86.1400"
              required
              step="any"
              type="number"
              value={requestForm.longitude}
            />
            <FormField
              {...getAiFieldProps(aiFilledFields, "animal_type")}
              label="Animal type"
              name="animal_type"
              onChange={(event) => handleRequestFieldChange("animal_type", event.target.value)}
              placeholder="injured dog"
              value={requestForm.animal_type}
            />
            <FormField
              {...getAiFieldProps(aiFilledFields, "urgency")}
              label="Urgency"
              name="urgency"
              onChange={(event) => handleRequestFieldChange("urgency", event.target.value)}
              options={[
                { label: "1", value: "1" },
                { label: "2", value: "2" },
                { label: "3", value: "3" },
                { label: "4", value: "4" },
              ]}
              required
              type="select"
              value={requestForm.urgency}
            />
            <div className="md:col-span-2">
              <FormField
                {...getAiFieldProps(aiFilledFields, "required_skills", "Comma-separated. Sent to the backend as an array.")}
                label="Required skills"
                name="required_skills"
                onChange={(event) => handleRequestFieldChange("required_skills", event.target.value)}
                placeholder="dog handling, transport, first aid"
                value={requestForm.required_skills}
              />
            </div>
            <div className="md:col-span-2">
              <FormField
                {...getAiFieldProps(aiFilledFields, "notes")}
                label="Notes"
                name="notes"
                onChange={(event) => handleRequestFieldChange("notes", event.target.value)}
                placeholder="Medium-size dog with possible leg injury."
                rows={5}
                type="textarea"
                value={requestForm.notes}
              />
            </div>
            <div className="md:col-span-2 space-y-3">
              {assistNotice ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {assistNotice}
                </div>
              ) : null}
              <ErrorAlert message={requestError || rescueAssist.error} />
              <div className="flex flex-wrap gap-3">
                <button className="primary-button" disabled={!canManage || requestSaving} type="submit">
                  {requestSaving ? "Creating..." : "Create and optimize"}
                </button>
                {!canManage ? (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                    Read-only: your role cannot create requests.
                  </span>
                ) : null}
              </div>
            </div>
          </form>
        </SectionCard>

        <SectionCard description="Each rescue request can be reviewed in detail or sent into the optimizer." title="Request queue">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading rescue queue...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-medium">Request</th>
                    <th className="px-3 py-3 font-medium">Urgency</th>
                    <th className="px-3 py-3 font-medium">Skills</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Created</th>
                    <th className="px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr className="border-b border-slate-100" key={request.id}>
                      <td className="px-3 py-4">
                        <div className="font-medium text-slate-950">{request.location}</div>
                        <div className="text-xs text-slate-500">
                          #{request.id} • {truncateText(request.notes || "No notes", 56)}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-slate-600">{request.urgency || "n/a"}</td>
                      <td className="px-3 py-4 text-slate-600">{formatSkills(request.required_skills)}</td>
                      <td className="px-3 py-4">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="px-3 py-4 text-slate-600">{formatDateTime(request.created_at)}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link className="secondary-button px-3 py-2 text-xs" to={`/rescue-requests/${request.id}`}>
                            Detail
                          </Link>
                          <Link className="primary-button px-3 py-2 text-xs" to={`/rescue-requests/${request.id}/matches`}>
                            Optimize
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!requests.length ? (
                    <tr>
                      <td className="px-3 py-10 text-center text-slate-500" colSpan="6">
                        No rescue requests found.
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
