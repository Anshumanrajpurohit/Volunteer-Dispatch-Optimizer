const toneMap = {
  open: "bg-cyan-100 text-cyan-700",
  active: "bg-emerald-100 text-emerald-700",
  available: "bg-emerald-100 text-emerald-700",
  accepted: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  resolved: "bg-emerald-100 text-emerald-700",
  contacted: "bg-amber-100 text-amber-700",
  pending: "bg-amber-100 text-amber-700",
  dispatched: "bg-indigo-100 text-indigo-700",
  on_the_way: "bg-indigo-100 text-indigo-700",
  inactive: "bg-slate-200 text-slate-700",
  unknown: "bg-slate-100 text-slate-700",
  outside_window: "bg-rose-100 text-rose-700",
  declined: "bg-rose-100 text-rose-700",
  cancelled: "bg-rose-100 text-rose-700",
};

function formatStatus(status) {
  if (!status) {
    return "Unknown";
  }

  return String(status)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function StatusBadge({ status }) {
  const normalized = String(status || "unknown").toLowerCase();
  const classes = toneMap[normalized] || "bg-slate-100 text-slate-700";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{formatStatus(normalized)}</span>;
}
