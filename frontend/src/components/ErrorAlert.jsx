export function ErrorAlert({ message, className = "" }) {
  if (!message) {
    return null;
  }

  return (
    <div className={`error-alert ${className}`.trim()} role="alert">
      {message}
    </div>
  );
}
