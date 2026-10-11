/** Red message shown above the buttons of a window after a failed save. Renders nothing without a message. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-3 flex items-start gap-[9px] rounded-lg border border-[rgba(201,68,59,0.3)] bg-[rgba(201,68,59,0.09)] px-3 py-[9px] text-[12.5px] text-error"
    >
      <span aria-hidden="true">⚠</span>
      <span>{message}</span>
    </div>
  );
}
