import { dismissToast, useUi } from '../../state/store';

export function ToastHost() {
  const toast = useUi((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="toast no-print" role="status" aria-live="polite" key={toast.id}>
      <span>{toast.message}</span>
      {toast.undo && (
        <button
          onClick={async () => {
            const undo = toast.undo!;
            dismissToast();
            await undo();
          }}
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
}
