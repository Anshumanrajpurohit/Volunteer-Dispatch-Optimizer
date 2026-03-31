import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createRescueRequest, getRescueRequests } from "../api/endpoints";
import { AIActionButton } from "../components/AIActionButton";
import { ErrorAlert } from "../components/ErrorAlert";
import { FormField } from "../components/FormField";
import { SectionCard } from "../components/SectionCard";
import { SkillTags, StatusBadge, UrgencyChip } from "../components/StatusBadge";
import { useAIAssist } from "../hooks/useAIAssist";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, truncateText } from "../utils/format";

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
    inputClassName: "ai-filled-field",
    labelClassName: "ai-filled-label",
    hintClassName: "ai-filled-hint",
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
    <div className="page-shell page-active">
      <div className="page-header">
        <div>
          <div className="page-kicker">Operations</div>
          <h1 className="page-title">Rescue requests</h1>
          <p className="page-description">
            Rescue intake now flows directly into optimization. Create a request, rank eligible volunteers, review the generated dispatch draft, and confirm assignment from recommendations.
          </p>
        </div>
        <div className="page-toolbar">
          <AIActionButton
            disabled={!canManage || rescueAssist.loading}
            label="AI Assist"
            loading={rescueAssist.loading}
            onSelect={handleAssist}
          />
          <button className="btn-outline" onClick={loadRequests} type="button">
            Refresh Queue
          </button>
        </div>
      </div>

      <ErrorAlert message={pageError} />

      <div className="grid gap-6 xl:grid-cols-2">
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
          titleTag="intake"
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
              {assistNotice ? <div className="notice notice-success">{assistNotice}</div> : null}
              <ErrorAlert message={requestError || rescueAssist.error} />
              <div className="flex flex-wrap gap-3">
                <button className="btn-primary btn-full sm:w-auto" disabled={!canManage || requestSaving} type="submit">
                  {requestSaving ? "Creating..." : "Create and Optimize"}
                </button>
                {!canManage ? (
                  <div className="notice notice-ai">Read-only: your role cannot create requests.</div>
                ) : null}
              </div>
            </div>
          </form>
        </SectionCard>

        <SectionCard description="Each rescue request can be reviewed in detail or sent into the optimizer." title="Request queue" titleTag="live table">
          {loading ? (
            <div className="loading-wrap">
              <div className="loading-state">
                <span className="pulse-dot" />
                <span>Loading rescue queue...</span>
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Urgency</th>
                    <th>Skills</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <div className="td-primary">{request.location}</div>
                        <div className="table-meta">#{request.id} / {truncateText(request.notes || "No notes", 56)}</div>
                      </td>
                      <td>
                        <UrgencyChip value={request.urgency || "N/A"} />
                      </td>
                      <td>
                        <SkillTags skills={request.required_skills} />
                      </td>
                      <td>
                        <StatusBadge status={request.status} />
                      </td>
                      <td>{formatDateTime(request.created_at)}</td>
                      <td>
                        <div className="table-actions">
                          <Link className="btn-outline" to={`/rescue-requests/${request.id}`}>
                            Detail
                          </Link>
                          <Link className="btn-primary" to={`/rescue-requests/${request.id}/matches`}>
                            Optimize
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!requests.length ? (
                    <tr>
                      <td className="text-center" colSpan="6">
                        <div className="empty-state">No rescue requests found.</div>
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
