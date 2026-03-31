import { useEffect, useState } from "react";

import { getVolunteerMe } from "../api/endpoints";
import { ErrorAlert } from "../components/ErrorAlert";
import { LoadingState } from "../components/LoadingState";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateTime, formatSkills, formatTimeValue } from "../utils/format";

export function VolunteerProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const data = await getVolunteerMe();
        if (!cancelled) {
          setProfile(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.userMessage || "Unable to load volunteer profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <LoadingState label="Loading volunteer profile..." />;
  }

  return (
    <div className="page-shell page-active">
      <div className="page-header">
        <div>
          <div className="page-kicker">Volunteer View</div>
          <h1 className="page-title">My profile</h1>
          <p className="page-description">
            Review the volunteer record and login identity currently linked to your assignment access.
          </p>
        </div>
      </div>

      <ErrorAlert message={error} />

      {profile ? (
        <>
          <div className="stat-grid">
            <StatCard label="Volunteer ID" meta="Linked volunteer record" tone="amber" value={profile.volunteer?.id || "-"} />
            <StatCard label="Dispatches" meta="Total assignment history" tone="red" value={profile.volunteer?.total_dispatches ?? 0} />
            <StatCard label="Successful" meta="Accepted or completed responses" tone="teal" value={profile.volunteer?.successful_responses ?? 0} />
            <StatCard label="Account Role" meta="JWT access scope" tone="blue" value={profile.user?.role || "volunteer"} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard description="Identity and access details from the linked user account." title="Login profile" titleTag="auth">
              <div className="info-card">
                <div className="info-row">
                  <span className="info-label">Username</span>
                  <span className="info-value">{profile.user?.username || "N/A"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Email</span>
                  <span className="info-value">{profile.user?.email || profile.volunteer?.email || "N/A"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Role</span>
                  <span className="info-value"><StatusBadge status={profile.user?.role || "volunteer"} /></span>
                </div>
                <div className="info-row">
                  <span className="info-label">Record status</span>
                  <span className="info-value"><StatusBadge status={profile.volunteer?.active_status ? "active" : "inactive"} /></span>
                </div>
              </div>
            </SectionCard>

            <SectionCard description="Operational details taken from the volunteer directory record." title="Volunteer record" titleTag="field record">
              <div className="info-card">
                <div className="info-row">
                  <span className="info-label">Name</span>
                  <span className="info-value">{profile.volunteer?.name || "N/A"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{profile.volunteer?.phone || "N/A"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Coverage location</span>
                  <span className="info-value">{profile.volunteer?.latitude ?? "N/A"}, {profile.volunteer?.longitude ?? "N/A"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Skills</span>
                  <span className="info-value">{formatSkills(profile.volunteer?.skills)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Availability window</span>
                  <span className="info-value">{formatTimeValue(profile.volunteer?.availability_start)} - {formatTimeValue(profile.volunteer?.availability_end)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Last updated</span>
                  <span className="info-value">{formatDateTime(profile.volunteer?.updated_at)}</span>
                </div>
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
