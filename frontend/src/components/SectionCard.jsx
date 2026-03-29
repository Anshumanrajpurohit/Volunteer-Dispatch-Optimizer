export function SectionCard({ title, description, actions, children, className = "" }) {
  return (
    <section className={`panel-surface ${className}`}>
      {(title || description || actions) && (
        <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            {title ? <h2 className="text-lg font-semibold text-slate-950">{title}</h2> : null}
            {description ? <p className="max-w-2xl text-sm text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      )}
      <div className={title || description || actions ? "pt-5" : ""}>{children}</div>
    </section>
  );
}
