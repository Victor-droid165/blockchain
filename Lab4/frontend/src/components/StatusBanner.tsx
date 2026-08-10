export function StatusBanner({ status, error }: { status?: string; error?: string }) {
  if (!status && !error) return null;

  return (
    <div className={`status-banner ${error ? "error" : "success"}`}>
      {error ?? status}
    </div>
  );
}
