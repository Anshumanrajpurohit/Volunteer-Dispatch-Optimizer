import { useEffect, useRef, useState } from "react";

const DEFAULT_OPTIONS = [
  {
    value: "this_page",
    label: "This page",
    description: "Use only the current page or section context.",
  },
  {
    value: "full_rescue",
    label: "Full rescue",
    description: "Use the broader rescue context for a stronger assist.",
  },
];

export function AIActionButton({
  label = "AI Assist",
  options = DEFAULT_OPTIONS,
  onSelect,
  disabled = false,
  loading = false,
  align = "right",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function handleOptionClick(value) {
    setOpen(false);
    onSelect?.(value);
  }

  const menuPositionClass = align === "left" ? "left-0" : "right-0";

  return (
    <div className={`relative ${className}`.trim()} ref={containerRef}>
      <button
        className="btn-outline"
        disabled={disabled || loading}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="btn-prefix">AI</span>
        <span>{loading ? "Working..." : label}</span>
        <span aria-hidden="true" className="btn-suffix">
          v
        </span>
      </button>
      {open ? (
        <div className={`absolute ${menuPositionClass} z-20 mt-2 w-72 panel`}>
          <div className="panel-body p-0">
            {options.map((option) => (
              <button
                className="flex w-full flex-col items-start gap-1 border-b border-[var(--border)] px-4 py-3 text-left transition hover:bg-[var(--surface)] last:border-b-0"
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                type="button"
              >
                <span className="text-sm font-semibold text-[var(--text)]">{option.label}</span>
                <span className="text-xs text-[var(--text2)]">{option.description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
