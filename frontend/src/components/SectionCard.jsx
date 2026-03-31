export function SectionCard({
  title,
  description,
  actions,
  children,
  className = "",
  titleTag = "panel",
}) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(title || description || actions) && (
        <div className="panel-header">
          <div className="panel-header-copy">
            <div className="panel-heading">
              {title ? <h2 className="panel-title">{title}</h2> : null}
              {titleTag ? <span className="panel-title-tag">{titleTag}</span> : null}
            </div>
            {description ? <p className="panel-description">{description}</p> : null}
          </div>
          {actions ? <div className="panel-actions">{actions}</div> : null}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}
