import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet } from '../components/Sheet';
import { usePlans } from '../hooks';
import { db } from '../../db/schema';
import { duplicatePlan } from '../../db/repo';
import { deleteWithUndo } from '../../db/actions';
import { closeSheet, openSheet } from '../../state/sheets';
import { runBackup } from '../actions';
import { navigate } from '../router';
import { setLastPlan } from '../../state/theme';

/** Plan switcher menu: plans, then Inbox, Settings, Back up (design review DR1). */
export function MenuSheet({ planId }: { planId?: string }) {
  const plans = usePlans();
  const inboxCount = useLiveQuery(async () => {
    if (!planId) return 0;
    const [items, placements] = await Promise.all([db.items.where('planId').equals(planId).toArray(), db.placements.where('planId').equals(planId).toArray()]);
    const placed = new Set(placements.map((p) => p.itemId));
    return items.filter((i) => !placed.has(i.id)).length;
  }, [planId]);
  const go = (path: string) => {
    closeSheet();
    navigate(path);
  };
  return (
    <Sheet title="Menu" popover>
      <nav className="menu-list" aria-label="Plans">
        <span className="eyebrow" style={{ padding: '4px 4px 8px' }}>
          Plans on this device
        </span>
        {plans?.map((p) => (
          <button key={p.id} className="menu-item" aria-current={p.id === planId ? 'true' : undefined} onClick={() => go(`/p/${p.id}`)}>
            <span className="serif" style={{ fontSize: 18 }}>
              {p.title}
            </span>
            {p.id === planId && <span className="meta">Open</span>}
          </button>
        ))}
        <button className="menu-item" onClick={() => go('/new')}>
          + New plan
        </button>
      </nav>
      <nav className="menu-list" aria-label="Plan">
        {planId && (
          <>
            <button className="menu-item" onClick={() => go(`/p/${planId}/inbox`)}>
              Inbox{inboxCount ? ` (${inboxCount})` : ''}
            </button>
            <button className="menu-item" onClick={() => go(`/p/${planId}/lists`)}>
              Shopping and packing
            </button>
            <button className="menu-item" onClick={() => openSheet({ kind: 'planDetails', planId })}>
              Plan details
            </button>
            <button
              className="menu-item"
              onClick={async () => {
                const id = await duplicatePlan(planId);
                go(`/p/${id}`);
              }}
            >
              Duplicate this plan
            </button>
          </>
        )}
        <button className="menu-item" onClick={() => go('/settings')}>
          Settings
        </button>
        <button
          className="menu-item"
          onClick={() => {
            closeSheet();
            void runBackup();
          }}
        >
          Back up now
        </button>
        {planId && (
          <button
            className="menu-item"
            style={{ color: 'var(--accent)' }}
            onClick={async () => {
              closeSheet();
              navigate('/', { replace: true });
              setLastPlan(null);
              await deleteWithUndo('plan', planId, 'Plan deleted');
            }}
          >
            Delete this plan
          </button>
        )}
      </nav>
    </Sheet>
  );
}
