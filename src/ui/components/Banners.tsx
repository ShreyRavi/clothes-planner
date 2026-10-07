import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { useUi, clearSaveError } from '../../state/store';
import { runBackup } from '../actions';

export const NUDGE_EDITS = 20;
export const NUDGE_DAYS = 7;

/** Pure rule for the backup nudge (ST-4, design doc). */
export function shouldNudge(edits: number, firstEditAt: number | undefined, now = Date.now()) {
  if (edits >= NUDGE_EDITS) return true;
  if (edits > 0 && firstEditAt && now - firstEditAt >= NUDGE_DAYS * 86_400_000) return true;
  return false;
}

/** At most one banner, by priority: save failed, then back up (design review DR7). */
export function NoticeBanner({ showBackup }: { showBackup: boolean }) {
  const saveError = useUi((s) => s.saveError);
  const nudge = useLiveQuery(async () => {
    const [edits, first] = await Promise.all([db.meta.get('editsSinceBackup'), db.meta.get('firstEditSinceBackup')]);
    return shouldNudge(Number(edits?.value ?? 0), first?.value as number | undefined);
  }, []);

  if (saveError) {
    return (
      <div className="banner banner-alert no-print" role="alert">
        <p>{saveError.message}</p>
        <button className="btn" onClick={() => runBackup()}>
          Back up now
        </button>
        <button
          className="btn"
          onClick={async () => {
            if (saveError.retry) await saveError.retry().catch(() => undefined);
            else clearSaveError();
          }}
        >
          Try again
        </button>
      </div>
    );
  }
  if (showBackup && nudge) {
    return (
      <div className="banner banner-soft no-print" role="status">
        <p>Back up this plan</p>
        <button className="btn" onClick={() => runBackup()}>
          Back up
        </button>
        <button
          className="btn btn-icon"
          aria-label="Dismiss backup reminder"
          onClick={async () => {
            // Dismissing re-arms the reminder: the next threshold counts from now.
            await db.meta.bulkPut([
              { key: 'editsSinceBackup', value: 0 },
              { key: 'firstEditSinceBackup', value: Date.now() },
            ]);
          }}
        >
          ✕
        </button>
      </div>
    );
  }
  return null;
}
