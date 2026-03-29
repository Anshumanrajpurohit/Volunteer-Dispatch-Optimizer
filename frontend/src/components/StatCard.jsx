const toneClasses = {
  amber: "from-amber-500/20 to-amber-500/0 text-amber-700",
  cyan: "from-cyan-500/15 to-cyan-500/0 text-cyan-700",
  emerald: "from-emerald-500/15 to-emerald-500/0 text-emerald-700",
  slate: "from-slate-500/15 to-slate-500/0 text-slate-700",
};

export function StatCard({ label, value, meta, tone = "slate" }) {
  return (
    <article className={`rounded-3xl border border-white/60 bg-gradient-to-br ${toneClasses[tone] || toneClasses.slate} p-5 shadow-sm`}>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-slate-950">{value}</p>
      {meta ? <p className="mt-2 text-sm text-slate-600">{meta}</p> : null}
    </article>
  );
}
