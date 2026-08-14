export function StatusBanner({ status, error }: { status?: string; error?: string }) {
  if (!status && !error) return null;

  const variant = error ? "error" : "success";

  return (
    <div className={`status-banner ${variant}`} role="status">
      <span className="status-banner-icon" aria-hidden="true">
        {error ? "!" : "\u2713"}
      </span>
      <span className="status-banner-text">{error ?? status}</span>
    </div>
  );
}
