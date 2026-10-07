import { useEffect, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { closeSheet } from '../../state/sheets';
import { showToast } from '../../state/store';
import { navigate } from '../router';
import { db } from '../../db/schema';
import type { Snapshot } from '../../db/undo';

type State = { step: 'checking' } | { step: 'error'; detail: string } | { step: 'ready'; snapshot: Snapshot; titles: string[]; existing: number };

/** ST-3: restore never overwrites silently; the person picks replace or keep both. */
export function RestoreSheet({ file }: { file: File }) {
  const [state, setState] = useState<State>({ step: 'checking' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { parseBackup } = await import('../../backup/backup');
        const { snapshot, planTitles } = await parseBackup(file);
        setState({ step: 'ready', snapshot, titles: planTitles, existing: await db.plans.count() });
      } catch (e) {
        setState({ step: 'error', detail: e instanceof Error ? e.message : 'Unknown problem' });
      }
    })();
  }, [file]);

  const apply = async (mode: 'replace' | 'keep') => {
    if (state.step !== 'ready') return;
    setBusy(true);
    try {
      const { applyBackup } = await import('../../backup/backup');
      const undo = await applyBackup(state.snapshot, mode);
      closeSheet();
      const latest = await db.plans.orderBy('updatedAt').last();
      navigate(latest ? `/p/${latest.id}` : '/');
      showToast(`Restored ${state.titles.length === 1 ? state.titles[0] : `${state.titles.length} plans`}`, undo);
    } catch {
      setBusy(false);
    }
  };

  if (state.step === 'checking') {
    return (
      <Sheet title="Restore from a backup">
        <p className="muted">Checking file</p>
      </Sheet>
    );
  }
  if (state.step === 'error') {
    // Same plain-language treatment as the can't-open screen (design review DR9).
    return (
      <Sheet title="This plan can't be opened">
        <p style={{ margin: 0 }}>This file isn't a Trousseau backup, or it's damaged.</p>
        <details>
          <summary className="meta">Details</summary>
          <p className="meta">{state.detail}</p>
        </details>
        <button className="btn btn-primary btn-block" onClick={closeSheet}>
          Choose another file
        </button>
      </Sheet>
    );
  }
  return (
    <Sheet title="Restore from a backup">
      <p style={{ margin: 0 }}>
        This backup has {state.titles.length} plan{state.titles.length === 1 ? '' : 's'}: {state.titles.join(', ')}.
      </p>
      {state.existing > 0 ? (
        <>
          <button className="btn btn-primary btn-block" disabled={busy} onClick={() => apply('keep')}>
            Keep both
          </button>
          <button className="btn btn-block" disabled={busy} onClick={() => apply('replace')}>
            Replace what's on this device
          </button>
          <p className="meta" style={{ margin: 0 }}>
            Replace removes the {state.existing} plan{state.existing === 1 ? '' : 's'} on this device. You can undo for a few seconds.
          </p>
        </>
      ) : (
        <button className="btn btn-primary btn-block" disabled={busy} onClick={() => apply('keep')}>
          Restore
        </button>
      )}
    </Sheet>
  );
}
