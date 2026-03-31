export function LoadingState({ label = "Loading...", fullScreen = false }) {
  return (
    <div className={fullScreen ? "login-shell" : "loading-wrap"}>
      <div className="loading-state">
        <span className="pulse-dot" />
        <span>{label}</span>
      </div>
    </div>
  );
}
