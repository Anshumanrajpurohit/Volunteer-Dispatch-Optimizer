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
    <div className="space-y-6">
      <div>
        <p className="page-eyebrow">Volunteer View</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">My profile</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Review the volunteer record and login identity currently linked to your assignment access.
        </p>
      </div>

      <ErrorAlert message={error} />

      {profile ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Volunteer ID" meta="Linked volunteer record" tone="cyan" value={profile.volunteer?.id || "-"} />
            <StatCard label="Dispatches" meta="Total assignment history" tone="amber" value={profile.volunteer?.total_dispatches ?? 0} />
            <StatCard label="Successful" meta="Accepted or completed responses" tone="emerald" value={profile.volunteer?.successful_responses ?? 0} />
            <StatCard label="Account role" meta="JWT access scope" tone="slate" value={profile.user?.role || "volunteer"} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
            <SectionCard description="Identity and access details from the linked user account." title="Login profile">
              <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-600">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Username</div>
                  <div className="mt-1 text-base font-semibold text-slate-950">{profile.user?.username || "N/A"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</div>
                  <div className="mt-1 text-base text-slate-900">{profile.user?.email || profile.volunteer?.email || "N/A"}</div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Role</div>
                    <div className="mt-1"><StatusBadge status={profile.user?.role || "volunteer"} /></div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Record status</div>
                    <div className="mt-1"><StatusBadge status={profile.volunteer?.active_status ? "active" : "inactive"} /></div>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard description="Operational details taken from the volunteer directory record." title="Volunteer record">
              <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Name</div>
                  <div className="mt-1 text-base font-semibold text-slate-950">{profile.volunteer?.name || "N/A"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Phone</div>
                  <div className="mt-1 text-base text-slate-900">{profile.volunteer?.phone || "N/A"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Coverage location</div>
                  <div className="mt-1 text-base text-slate-900">
                    {profile.volunteer?.latitude ?? "N/A"}, {profile.volunteer?.longitude ?? "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Skills</div>
                  <div className="mt-1 text-base text-slate-900">{formatSkills(profile.volunteer?.skills)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Availability window</div>
                  <div className="mt-1 text-base text-slate-900">
                    {formatTimeValue(profile.volunteer?.availability_start)} - {formatTimeValue(profile.volunteer?.availability_end)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Last updated</div>
                  <div className="mt-1 text-base text-slate-900">{formatDateTime(profile.volunteer?.updated_at)}</div>
                </div>
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
