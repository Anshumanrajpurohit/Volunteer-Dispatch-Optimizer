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
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        className="secondary-button gap-2 px-4 py-2.5"
        disabled={disabled || loading}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{loading ? "Working..." : label}</span>
        <span aria-hidden="true" className="text-xs text-slate-400">
          ▾
        </span>
      </button>
      {open ? (
        <div className={`absolute ${menuPositionClass} z-20 mt-2 w-72 rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]`}>
          {options.map((option) => (
            <button
              className="flex w-full flex-col items-start rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
              key={option.value}
              onClick={() => handleOptionClick(option.value)}
              type="button"
            >
              <span className="text-sm font-medium text-slate-950">{option.label}</span>
              <span className="mt-1 text-xs text-slate-500">{option.description}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
