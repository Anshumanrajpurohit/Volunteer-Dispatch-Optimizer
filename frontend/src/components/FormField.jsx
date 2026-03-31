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
      <label className={`checkbox-field ${className}`.trim()}>
        <input {...props} checked={checked} type="checkbox" />
        <span className={`checkbox-copy ${labelClassName}`.trim()}>{label}</span>
      </label>
    );
  }

  const fieldClassName = `${inputClassName}`.trim();

  return (
    <label className={`form-field ${className}`.trim()}>
      <span className={`form-label ${labelClassName}`.trim()}>{label}</span>
      {type === "textarea" || as === "textarea" ? (
        <textarea {...props} className={fieldClassName} rows={rows} />
      ) : null}
      {type === "select" ? (
        <select {...props} className={fieldClassName}>
          {options.map((option) => (
            <option key={`${option.value}-${option.label}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      {type !== "textarea" && type !== "select" && as !== "textarea" ? (
        <input {...props} className={fieldClassName} type={type} />
      ) : null}
      {hint ? <p className={`field-hint ${hintClassName}`.trim()}>{hint}</p> : null}
    </label>
  );
}
