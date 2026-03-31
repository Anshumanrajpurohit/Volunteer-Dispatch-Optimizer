const toneMap = {
  amber: "amber",
  red: "red",
  teal: "teal",
  blue: "blue",
  cyan: "amber",
  emerald: "teal",
  slate: "blue",
};

function buildGhostText(label) {
  return String(label || "SC")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function StatCard({ label, value, meta, tone = "blue" }) {
  const cardTone = toneMap[tone] || toneMap.blue;

  return (
    <article className="stat-card" data-tone={cardTone}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {meta ? <p className="stat-meta">{meta}</p> : null}
      <span aria-hidden="true" className="stat-ghost">
        {buildGhostText(label)}
      </span>
    </article>
  );
}
