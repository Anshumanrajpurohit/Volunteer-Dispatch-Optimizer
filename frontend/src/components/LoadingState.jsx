export function LoadingState({ label = "Loading...", fullScreen = false }) {
  return (
    <div className={fullScreen ? "flex min-h-screen items-center justify-center px-6" : "flex items-center justify-center px-6 py-12"}>
      <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-5 py-3 text-sm text-slate-600 shadow-sm backdrop-blur">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-600" />
        <span>{label}</span>
      </div>
    </div>
  );
}
