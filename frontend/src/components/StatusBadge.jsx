function normalizeStatusValue(status) {
  return String(status || "unknown")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

const statusVariants = {
  open: "open",
  pending: "open",
  dispatched: "dispatched",
  on_the_way: "on-way",
  accepted: "accepted",
  active: "active",
  available: "active",
  completed: "active",
  resolved: "active",
  assigned: "assigned",
  inactive: "assigned",
  unknown: "assigned",
  contacted: "contacted",
  outside_window: "contacted",
  declined: "contacted",
  cancelled: "contacted",
};

function formatStatusLabel(status) {
  const normalized = normalizeStatusValue(status);
  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeSkills(skills) {
  if (Array.isArray(skills)) {
    return skills.filter(Boolean);
  }

  if (typeof skills === "string") {
    return skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  return [];
}

export function getStatusVariant(status) {
  return statusVariants[normalizeStatusValue(status)] || "assigned";
}

export function getRequestCardClass(status) {
  return `request-card ${getStatusVariant(status)}`;
}

export function getStatusDotClass(status) {
  return `status-dot ${getStatusVariant(status).replace("on-way", "on-the-way")}`;
}

export function StatusBadge({ status, className = "" }) {
  const variant = getStatusVariant(status);

  return <span className={`badge ${variant} ${className}`.trim()}>{formatStatusLabel(status)}</span>;
}

export function UrgencyChip({ value, className = "" }) {
  return <span className={`urgency-chip ${className}`.trim()}>{`URG ${value ?? "N/A"}`}</span>;
}

export function SkillTags({ skills, className = "", emptyLabel = "No skills" }) {
  const values = normalizeSkills(skills);
  const items = values.length ? values : [emptyLabel];

  return (
    <div className={`skill-tags ${className}`.trim()}>
      {items.map((skill) => (
        <span className="skill-tag" key={skill}>
          {skill}
        </span>
      ))}
    </div>
  );
}
