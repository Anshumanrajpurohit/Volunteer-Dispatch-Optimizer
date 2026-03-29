export function FormField({
  as,
  checked,
  hint,
  label,
  options = [],
  rows = 4,
  type = "text",
  className = "",
  inputClassName = "",
  labelClassName = "",
  hintClassName = "",
  ...props
}) {
  if (type === "checkbox") {
    return (
      <label className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 ${className}`}>
        <input
          {...props}
          checked={checked}
          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          type="checkbox"
        />
        <span className={`text-sm font-medium text-slate-900 ${labelClassName}`}>{label}</span>
      </label>
    );
  }

  const sharedClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

  return (
    <label className={`block space-y-2 ${className}`}>
      <span className={`text-sm font-medium text-slate-800 ${labelClassName}`}>{label}</span>
      {type === "textarea" || as === "textarea" ? (
        <textarea {...props} className={`${sharedClassName} ${inputClassName}`.trim()} rows={rows} />
      ) : null}
      {type === "select" ? (
        <select {...props} className={`${sharedClassName} ${inputClassName}`.trim()}>
          {options.map((option) => (
            <option key={`${option.value}-${option.label}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      {type !== "textarea" && type !== "select" && as !== "textarea" ? (
        <input {...props} className={`${sharedClassName} ${inputClassName}`.trim()} type={type} />
      ) : null}
      {hint ? <p className={`text-xs text-slate-500 ${hintClassName}`}>{hint}</p> : null}
    </label>
  );
}
