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
import { SkillTags, StatusBadge, UrgencyChip } from "../components/StatusBadge";
import { useAIAssist } from "../hooks/useAIAssist";

function getAiFieldProps(aiFilledFields, fieldName) {
  if (!aiFilledFields.includes(fieldName)) {
    return {};
  }

  return {
    hint: "AI-filled suggestion applied.",
    inputClassName: "ai-filled-field",
    labelClassName: "ai-filled-label",
    hintClassName: "ai-filled-hint",
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
    <div className="page-shell page-active">
      <div className="page-header">
        <div>
          <div className="page-kicker">Optimizer</div>
          <h1 className="page-title">Volunteer recommendations</h1>
          <p className="page-description">
            Ranked shortlist for rescue #{rescue.id}. Scores combine distance, skill match, availability, and response rate using the live optimizer weights.
          </p>
        </div>
        <div className="page-toolbar">
          <AIActionButton
            label="AI Assist"
            loading={recommendAssist.loading || smartDispatchAssist.loading}
            onSelect={handlePageAssist}
          />
          <Link className="btn-outline" to={`/rescue-requests/${rescue.id}`}>
            Rescue Detail
          </Link>
          <Link className="btn-outline" to="/rescue-requests">
            Back to Queue
          </Link>
        </div>
      </div>

      <SectionCard description="Current rescue context used for ranking." title={`Rescue #${rescue.id}`} titleTag="optimizer input">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="mini-metric">
            <div className="mini-metric-label">Location</div>
            <div className="mini-metric-value">{rescue.location}</div>
          </div>
          <div className="mini-metric">
            <div className="mini-metric-label">Animal</div>
            <div className="mini-metric-value">{rescue.animal_type || "Not specified"}</div>
          </div>
          <div className="mini-metric">
            <div className="mini-metric-label">Urgency</div>
            <div className="mt-2">
              <UrgencyChip value={rescue.urgency || "N/A"} />
            </div>
          </div>
          <div className="mini-metric">
            <div className="mini-metric-label">Status</div>
            <div className="mt-2">
              <StatusBadge status={rescue.status} />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <SkillTags skills={rescue.required_skills} />
        </div>
        <div className="mini-metric-text">{rescue.notes || "No notes provided."}</div>
      </SectionCard>

      {aiNotice ? <div className="notice notice-success">{aiNotice}</div> : null}
      <ErrorAlert message={error || recommendAssist.error || messageAssist.error || smartDispatchAssist.error} />

      <div className="grid gap-6 xl:grid-cols-[1.45fr,0.95fr]">
        <SectionCard description="Top matches are sorted by final optimizer score." title="Ranked shortlist" titleTag="ranked">
          <div className="space-y-4">
            {matches.map((match, index) => {
              const isRecommended = match.volunteer_id === recommendedVolunteerId;
              const isSelected = match.volunteer_id === selectedVolunteerId;
              const isAiSelected = match.volunteer_id === aiSelectedVolunteerId;
              const cardClassName = [
                "selection-card",
                isAiSelected ? "ai" : "",
                isRecommended && !isAiSelected ? "highlight" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <article className={cardClassName} key={match.volunteer_id}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flag-list">
                        <span className="flag-pill">Rank {index + 1}</span>
                        {isRecommended ? <span className="flag-pill recommended">Recommended</span> : null}
                        {isAiSelected ? <span className="flag-pill ai">AI Prepared</span> : null}
                        {isSelected ? <span className="flag-pill selected">Selected</span> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className="text-lg font-semibold text-[var(--text)]">{match.volunteer_name}</span>
                        <StatusBadge status={match.current_availability_status} />
                      </div>
                      <p className="mt-2 muted-copy">{match.phone || "No phone"} / {match.email || "No email"}</p>
                      <div className="mt-3">
                        <SkillTags skills={match.matched_skills} emptyLabel="No matched skills" />
                      </div>
                      <p className="mt-3 subdued-copy">
                        Successful responses: {match.successful_responses}/{match.total_dispatches}
                      </p>
                      {isRecommended && recommendationReason ? (
                        <div className="notice notice-ai mt-3">{recommendationReason}</div>
                      ) : null}
                    </div>
                    <div className="mini-metric min-w-[132px]">
                      <div className="mini-metric-label">Final score</div>
                      <div className="mt-2 text-3xl font-extrabold text-[var(--amber)]">{match.final_score}</div>
                    </div>
                  </div>
                  <div className="score-grid mt-5">
                    <ScoreCell label="Distance" value={`${match.distance_km} km`} subvalue={`${match.distance_score}`} />
                    <ScoreCell label="Skill" value={`${match.skill_score}`} subvalue={`${match.matched_skills.length} skills`} />
                    <ScoreCell label="Availability" value={`${match.availability_score}`} subvalue={match.current_availability_status} />
                    <ScoreCell label="Response" value={`${match.response_rate_score}`} subvalue={`${match.successful_responses}/${match.total_dispatches}`} />
                    <button
                      className="btn-primary h-full"
                      disabled={draftLoading || smartDispatchAssist.loading}
                      onClick={() => handleGenerateDraft(match)}
                      type="button"
                    >
                      {selectedVolunteerId === match.volunteer_id ? "Draft Ready" : "Use Recommendation"}
                    </button>
                  </div>
                </article>
              );
            })}
            {!matches.length ? <div className="empty-state">No active volunteers are currently eligible for this rescue request.</div> : null}
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
                className="btn-outline"
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
          titleTag="confirm"
        >
          {selectedVolunteer ? (
            <form className="space-y-4" onSubmit={handleSubmitDispatch}>
              <div className={`selection-card ${aiSelectedVolunteerId === selectedVolunteer.volunteer_id ? "ai" : ""}`}>
                <div className="font-semibold text-[var(--text)]">Selected volunteer</div>
                <div className="mt-1 text-base font-semibold text-[var(--text)]">{selectedVolunteer.volunteer_name}</div>
                <div className="mt-2 muted-copy">{selectedVolunteer.phone || "No phone"} / {selectedVolunteer.email || "No email"}</div>
                <div className="flag-list mt-3">
                  <StatusBadge status={selectedVolunteer.current_availability_status} />
                  <span className="flag-pill">Score {selectedVolunteer.final_score}</span>
                  {selectedVolunteer.volunteer_id === recommendedVolunteerId ? <span className="flag-pill recommended">Recommended Pick</span> : null}
                  {aiSelectedVolunteerId === selectedVolunteer.volunteer_id ? <span className="flag-pill ai">AI-selected context</span> : null}
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
              <button className="btn-primary btn-full" disabled={submitting} type="submit">
                {submitting ? "Confirming dispatch..." : "Confirm Optimized Dispatch"}
              </button>
            </form>
          ) : (
            <div className="space-y-4 empty-state">
              <p>Choose a ranked volunteer to generate a draft and complete the optimizer-driven assignment.</p>
              <button
                className="btn-outline"
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
    <div className="score-cell">
      <div className="score-label">{label}</div>
      <div className="score-value">{value}</div>
      <div className="score-subvalue">{subvalue}</div>
    </div>
  );
}
