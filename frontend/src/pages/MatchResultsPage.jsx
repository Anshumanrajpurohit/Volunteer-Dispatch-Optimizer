import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  assignVolunteer,
  generateRescueMessageDraft,
  getRescueRequest,
  getRescueRequestMatches,
} from "../api/endpoints";
import { AIActionButton } from "../components/AIActionButton";
import { ErrorAlert } from "../components/ErrorAlert";
import { FormField } from "../components/FormField";
import { LoadingState } from "../components/LoadingState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAIAssist } from "../hooks/useAIAssist";
import { formatSkills } from "../utils/format";

function getAiFieldProps(aiFilledFields, fieldName) {
  if (!aiFilledFields.includes(fieldName)) {
    return {};
  }

  return {
    hint: "AI-filled suggestion applied.",
    inputClassName: "border-amber-300 bg-amber-50/70 focus:border-amber-400 focus:ring-amber-100",
    labelClassName: "text-amber-900",
    hintClassName: "text-amber-700",
  };
}

function serializeRescue(rescue) {
  if (!rescue) {
    return null;
  }

  return {
    id: rescue.id,
    location: rescue.location,
    latitude: rescue.latitude,
    longitude: rescue.longitude,
    animal_type: rescue.animal_type,
    urgency: rescue.urgency,
    required_skills: rescue.required_skills || [],
    notes: rescue.notes,
    status: rescue.status,
  };
}

function serializeMatch(match) {
  if (!match) {
    return null;
  }

  return {
    volunteer_id: match.volunteer_id,
    volunteer_name: match.volunteer_name,
    phone: match.phone,
    email: match.email,
    final_score: match.final_score,
    distance_km: match.distance_km,
    distance_score: match.distance_score,
    skill_score: match.skill_score,
    availability_score: match.availability_score,
    response_rate_score: match.response_rate_score,
    matched_skills: match.matched_skills,
    current_availability_status: match.current_availability_status,
    successful_responses: match.successful_responses,
    total_dispatches: match.total_dispatches,
  };
}

export function MatchResultsPage() {
  const { rescueId } = useParams();
  const navigate = useNavigate();
  const [rescue, setRescue] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState(null);
  const [message, setMessage] = useState("");
  const [dispatchStatus, setDispatchStatus] = useState("contacted");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [draftLoading, setDraftLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [recommendationReason, setRecommendationReason] = useState("");
  const [aiNotice, setAiNotice] = useState("");
  const [aiFilledFields, setAiFilledFields] = useState([]);
  const [aiSelectedVolunteerId, setAiSelectedVolunteerId] = useState(null);
  const recommendAssist = useAIAssist(`/ai/recommend-volunteer/${rescueId}`);
  const messageAssist = useAIAssist(selectedVolunteerId ? `/ai/message-assist/${rescueId}/${selectedVolunteerId}` : `/ai/message-assist/${rescueId}/0`);
  const smartDispatchAssist = useAIAssist(`/ai/smart-dispatch/${rescueId}`);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [rescueData, matchData] = await Promise.all([
          getRescueRequest(rescueId),
          getRescueRequestMatches(rescueId),
        ]);

        if (!cancelled) {
          setRescue(rescueData);
          setMatches(matchData.ranked_volunteers);
          setRecommendationReason("");
          setAiNotice("");
          setAiFilledFields([]);
          setAiSelectedVolunteerId(null);
          recommendAssist.reset();
          messageAssist.reset();
          smartDispatchAssist.reset();
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.userMessage || "Unable to load ranked matches.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [rescueId]);

  const selectedVolunteer = useMemo(
    () => matches.find((item) => item.volunteer_id === selectedVolunteerId) || null,
    [matches, selectedVolunteerId],
  );
  const recommendedVolunteerId = matches[0]?.volunteer_id || null;

  function updateAiFilledFields(fieldNames) {
    setAiFilledFields((current) => Array.from(new Set([...current, ...fieldNames])));
  }

  function clearAiField(fieldName) {
    setAiFilledFields((current) => current.filter((item) => item !== fieldName));
  }

  function buildAssistPayload(scope) {
    return {
      scope,
      current_data: {
        selected_volunteer_id: selectedVolunteerId,
        message: message.trim() || null,
        dispatch_status: dispatchStatus,
        notes: notes.trim() || null,
      },
      context: {
        rescue_request: serializeRescue(rescue),
        volunteers: matches.map(serializeMatch),
        matches: matches.map(serializeMatch),
        selected_volunteer: serializeMatch(selectedVolunteer),
      },
    };
  }

  function applyDispatchAssistResponse(response) {
    const responseFields = response.fields || {};
    const appliedFields = [];
    const nextVolunteerId = response.recommended_volunteer_id || response.volunteer_id || null;

    if (nextVolunteerId) {
      setSelectedVolunteerId(nextVolunteerId);
      setAiSelectedVolunteerId(nextVolunteerId);
    }

    const nextMessage = response.message || response.generated_message || responseFields.message;
    if (typeof nextMessage === "string" && nextMessage.trim()) {
      setMessage(nextMessage);
      appliedFields.push("message");
    }

    const nextStatus = response.suggested_status || responseFields.dispatch_status;
    if (typeof nextStatus === "string" && nextStatus.trim()) {
      setDispatchStatus(nextStatus);
      appliedFields.push("dispatch_status");
    }

    const nextNotes = response.fields?.notes || response.suggested_notes;
    if (typeof nextNotes === "string" && nextNotes.trim()) {
      setNotes(nextNotes);
      appliedFields.push("notes");
    }

    updateAiFilledFields(appliedFields);
  }

  async function handlePageAssist(scope) {
    if (scope === "full_rescue") {
      await handleSmartDispatch(scope);
      return;
    }

    setError("");
    setAiNotice("");
    recommendAssist.reset();

    try {
      const response = await recommendAssist.runAssist(buildAssistPayload(scope));
      const nextVolunteerId = response.recommended_volunteer_id || recommendedVolunteerId;
      if (nextVolunteerId) {
        setSelectedVolunteerId(nextVolunteerId);
        setAiSelectedVolunteerId(nextVolunteerId);
      }
      setRecommendationReason(response.explanation || response.recommendation_reason || "");
      setAiNotice(response.message || "AI reviewed the ranked shortlist and explained the current recommendation.");
    } catch (requestError) {
      setError(requestError.userMessage || recommendAssist.error || "Unable to load AI recommendation guidance.");
    }
  }

  async function handleGenerateDraft(match) {
    setDraftLoading(true);
    setError("");
    setAiNotice("");

    try {
      const response = await generateRescueMessageDraft(rescueId, match.volunteer_id);
      setSelectedVolunteerId(match.volunteer_id);
      setMessage(response.message);
      setDispatchStatus("contacted");
      setNotes("");
      setAiFilledFields([]);
      setAiSelectedVolunteerId(null);
    } catch (requestError) {
      setError(requestError.userMessage || "Unable to generate dispatch message draft.");
    } finally {
      setDraftLoading(false);
    }
  }

  async function handleGenerateAiMessage(scope) {
    if (!selectedVolunteerId) {
      setError("Choose a volunteer first, then generate an AI message.");
      return;
    }

    setError("");
    setAiNotice("");
    messageAssist.reset();

    try {
      const response = await messageAssist.runAssist({
        ...buildAssistPayload(scope),
        current_message: message.trim() || null,
      });
      applyDispatchAssistResponse(response);
      setAiNotice(response.explanation || "AI updated the dispatch message. Review it before confirming.");
    } catch (requestError) {
      setError(requestError.userMessage || messageAssist.error || "Unable to generate AI dispatch message.");
    }
  }

  async function handleSmartDispatch(scope = "full_rescue") {
    setError("");
    setAiNotice("");
    smartDispatchAssist.reset();

    try {
      const response = await smartDispatchAssist.runAssist(buildAssistPayload(scope));
      if (!response.volunteer_id && !response.recommended_volunteer_id) {
        setError(response.explanation || response.rationale || "No AI dispatch preparation is available for this rescue.");
        return;
      }

      applyDispatchAssistResponse(response);
      setRecommendationReason(response.explanation || response.rationale || recommendationReason);
      setAiNotice("Smart Dispatch prepared the assignment. Review and confirm manually.");
    } catch (requestError) {
      setError(requestError.userMessage || smartDispatchAssist.error || "Unable to prepare smart dispatch.");
    }
  }

  async function handleSubmitDispatch(event) {
    event.preventDefault();
    if (!selectedVolunteerId) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await assignVolunteer(rescueId, {
        volunteer_id: selectedVolunteerId,
        dispatch_status: dispatchStatus,
        message_snapshot: message,
        notes: notes.trim() || null,
      });
      navigate(`/rescue-requests/${rescueId}`);
    } catch (requestError) {
      setError(requestError.userMessage || "Unable to assign volunteer.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading ranked volunteer matches..." />;
  }

  if (error && !rescue) {
    return <SectionCard title="Match results"><ErrorAlert message={error} /></SectionCard>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="page-eyebrow">Optimizer</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Volunteer recommendations</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Ranked shortlist for rescue #{rescue.id}. Scores combine distance, skill match, availability,
            and response rate using the live optimizer weights.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AIActionButton
            label="AI Assist"
            loading={recommendAssist.loading || smartDispatchAssist.loading}
            onSelect={handlePageAssist}
          />
          <Link className="secondary-button" to={`/rescue-requests/${rescue.id}`}>
            Rescue detail
          </Link>
          <Link className="secondary-button" to="/rescue-requests">
            Back to queue
          </Link>
        </div>
      </div>

      <SectionCard description="Current rescue context used for ranking." title={`Rescue #${rescue.id}`}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Location</div>
            <div className="mt-2 font-semibold text-slate-950">{rescue.location}</div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Animal</div>
            <div className="mt-2 font-semibold text-slate-950">{rescue.animal_type || "Not specified"}</div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Urgency</div>
            <div className="mt-2 font-semibold text-slate-950">{rescue.urgency || "n/a"}</div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</div>
            <div className="mt-2"><StatusBadge status={rescue.status} /></div>
          </div>
        </div>
        <div className="mt-4 text-sm text-slate-600">Required skills: {formatSkills(rescue.required_skills)}</div>
        <div className="mt-2 text-sm text-slate-600">Notes: {rescue.notes || "No notes provided."}</div>
      </SectionCard>

      {aiNotice ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {aiNotice}
        </div>
      ) : null}
      <ErrorAlert message={error || recommendAssist.error || messageAssist.error || smartDispatchAssist.error} />

      <div className="grid gap-6 xl:grid-cols-[1.45fr,0.95fr]">
        <SectionCard description="Top matches are sorted by final optimizer score." title="Ranked shortlist">
          <div className="space-y-4">
            {matches.map((match, index) => {
              const isRecommended = match.volunteer_id === recommendedVolunteerId;
              const isSelected = match.volunteer_id === selectedVolunteerId;
              const isAiSelected = match.volunteer_id === aiSelectedVolunteerId;

              return (
                <article
                  className={`rounded-3xl border p-5 ${
                    isAiSelected
                      ? "border-cyan-300 bg-cyan-50/70 shadow-[0_18px_50px_rgba(8,145,178,0.10)]"
                      : isRecommended
                        ? "border-amber-300 bg-amber-50/60 shadow-[0_18px_50px_rgba(245,158,11,0.08)]"
                        : "border-slate-200 bg-white"
                  }`}
                  key={match.volunteer_id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
                          Rank {index + 1}
                        </span>
                        {isRecommended ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                            Recommended
                          </span>
                        ) : null}
                        {isAiSelected ? (
                          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
                            AI prepared
                          </span>
                        ) : null}
                        {isSelected ? (
                          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                            Selected
                          </span>
                        ) : null}
                        <span className="text-lg font-semibold text-slate-950">{match.volunteer_name}</span>
                        <StatusBadge status={match.current_availability_status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{match.phone || "No phone"} • {match.email || "No email"}</p>
                      <p className="mt-1 text-sm text-slate-600">Matched skills: {formatSkills(match.matched_skills)}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Successful responses: {match.successful_responses}/{match.total_dispatches}
                      </p>
                      {isRecommended && recommendationReason ? (
                        <div className="mt-3 rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-sm text-amber-900">
                          {recommendationReason}
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-3xl bg-slate-950 px-5 py-4 text-white">
                      <div className="text-xs uppercase tracking-[0.2em] text-white/65">Final score</div>
                      <div className="mt-2 text-3xl font-semibold">{match.final_score}</div>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <ScoreCell label="Distance" value={`${match.distance_km} km`} subvalue={`${match.distance_score}`} />
                    <ScoreCell label="Skill" value={`${match.skill_score}`} subvalue={`${match.matched_skills.length} skills`} />
                    <ScoreCell label="Availability" value={`${match.availability_score}`} subvalue={match.current_availability_status} />
                    <ScoreCell label="Response" value={`${match.response_rate_score}`} subvalue={`${match.successful_responses}/${match.total_dispatches}`} />
                    <button
                      className="primary-button h-full"
                      disabled={draftLoading || smartDispatchAssist.loading}
                      onClick={() => handleGenerateDraft(match)}
                      type="button"
                    >
                      {selectedVolunteerId === match.volunteer_id ? "Draft ready" : "Use recommendation"}
                    </button>
                  </div>
                </article>
              );
            })}
            {!matches.length ? (
              <div className="rounded-3xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500">
                No active volunteers are currently eligible for this rescue request.
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          actions={
            <>
              <AIActionButton
                disabled={!selectedVolunteer || messageAssist.loading || smartDispatchAssist.loading}
                label="Generate AI Message"
                loading={messageAssist.loading}
                onSelect={handleGenerateAiMessage}
              />
              <button
                className="secondary-button"
                disabled={!matches.length || smartDispatchAssist.loading}
                onClick={() => handleSmartDispatch("full_rescue")}
                type="button"
              >
                {smartDispatchAssist.loading ? "Preparing..." : "Smart Dispatch"}
              </button>
            </>
          }
          description="Generate, review, and confirm the dispatch for a selected recommendation."
          title="Dispatch panel"
        >
          {selectedVolunteer ? (
            <form className="space-y-4" onSubmit={handleSubmitDispatch}>
              <div className={`rounded-3xl border p-4 text-sm text-slate-700 ${aiSelectedVolunteerId === selectedVolunteer.volunteer_id ? "border-cyan-300 bg-cyan-50/70" : "border-slate-200 bg-slate-50/70"}`}>
                <div className="font-medium text-slate-950">Selected volunteer</div>
                <div className="mt-1">{selectedVolunteer.volunteer_name}</div>
                <div className="mt-1 text-slate-500">{selectedVolunteer.phone || "No phone"} • {selectedVolunteer.email || "No email"}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge status={selectedVolunteer.current_availability_status} />
                  <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                    Score {selectedVolunteer.final_score}
                  </span>
                  {selectedVolunteer.volunteer_id === recommendedVolunteerId ? (
                    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                      Recommended pick
                    </span>
                  ) : null}
                  {aiSelectedVolunteerId === selectedVolunteer.volunteer_id ? (
                    <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800">
                      AI-selected context
                    </span>
                  ) : null}
                </div>
              </div>
              <FormField
                {...getAiFieldProps(aiFilledFields, "message")}
                label="Editable message draft"
                name="message"
                onChange={(event) => {
                  clearAiField("message");
                  setMessage(event.target.value);
                }}
                required
                rows={8}
                type="textarea"
                value={message}
              />
              <FormField
                {...getAiFieldProps(aiFilledFields, "dispatch_status")}
                label="Dispatch status"
                name="dispatch_status"
                onChange={(event) => {
                  clearAiField("dispatch_status");
                  setDispatchStatus(event.target.value);
                }}
                options={[
                  { label: "contacted", value: "contacted" },
                  { label: "accepted", value: "accepted" },
                  { label: "completed", value: "completed" },
                  { label: "declined", value: "declined" },
                ]}
                type="select"
                value={dispatchStatus}
              />
              <FormField
                {...getAiFieldProps(aiFilledFields, "notes")}
                label="Dispatch notes"
                name="notes"
                onChange={(event) => {
                  clearAiField("notes");
                  setNotes(event.target.value);
                }}
                rows={4}
                type="textarea"
                value={notes}
              />
              <button className="primary-button w-full" disabled={submitting} type="submit">
                {submitting ? "Confirming dispatch..." : "Confirm optimized dispatch"}
              </button>
            </form>
          ) : (
            <div className="space-y-4 rounded-3xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500">
              <p>Choose a ranked volunteer to generate a draft and complete the optimizer-driven assignment.</p>
              <button
                className="secondary-button"
                disabled={!matches.length || smartDispatchAssist.loading}
                onClick={() => handleSmartDispatch("full_rescue")}
                type="button"
              >
                {smartDispatchAssist.loading ? "Preparing..." : "Smart Dispatch"}
              </button>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function ScoreCell({ label, value, subvalue }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
      <div className="text-sm text-slate-500">{subvalue}</div>
    </div>
  );
}
