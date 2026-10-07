import { deleteRoot, restore } from './repo';
import type { RootKind } from './undo';
import { showToast } from '../state/store';

/** Deletes with the 6 s undo toast (PRD: every destructive action has undo). */
export async function deleteWithUndo(kind: RootKind, id: string, message: string) {
  const snap = await deleteRoot(kind, id);
  showToast(message, async () => {
    await restore(snap);
  });
  return snap;
}
