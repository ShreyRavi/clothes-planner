import { STATUSES, type Status } from '../../domain/types';

export function statusTone(s: Status): string {
  if (s === 'Idea') return '';
  if (s === 'Ready' || s === 'Packed') return 'done';
  return 'pending';
}

export function nextStatus(s: Status): Status {
  return STATUSES[(STATUSES.indexOf(s) + 1) % STATUSES.length];
}

/** Tap cycles Idea to Packed. Accent dot = action pending, ink dot = done (handoff). */
export function StatusChip({ status, onCycle }: { status: Status; onCycle: () => void }) {
  return (
    <button className="status-chip" onClick={onCycle} aria-label={`Status: ${status}. Tap to change to ${nextStatus(status)}`}>
      <span className="pill">
        <span className={`status-dot ${statusTone(status)}`} />
        {status}
      </span>
    </button>
  );
}
