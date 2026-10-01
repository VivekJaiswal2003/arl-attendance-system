export function EmptyState({ title = "No records available", message = "Data will appear here once the system is configured." }: { title?: string; message?: string }) {
  return <div className="empty-state"><strong>{title}</strong><span>{message}</span></div>;
}
