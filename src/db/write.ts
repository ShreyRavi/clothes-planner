import { allTables, db } from './schema';
import { clearSaveError, reportSaveError } from '../state/store';

// Every mutation goes through write(): one awaited transaction, so screens
// (which read via live queries) only ever show committed data. A failed write
// shows the save-failed banner with a retry (eng review D12).
export async function write<T>(fn: () => Promise<T>, opts: { countsAsEdit?: boolean } = {}): Promise<T> {
  const run = async () => {
    const result = await db.transaction('rw', allTables(), async () => {
      const r = await fn();
      if (opts.countsAsEdit !== false) {
        const row = await db.meta.get('editsSinceBackup');
        const n = typeof row?.value === 'number' ? row.value : 0;
        await db.meta.put({ key: 'editsSinceBackup', value: n + 1 });
        const first = await db.meta.get('firstEditSinceBackup');
        if (!first) await db.meta.put({ key: 'firstEditSinceBackup', value: Date.now() });
      }
      return r;
    });
    clearSaveError();
    return result;
  };
  try {
    return await run();
  } catch (error) {
    reportSaveError(error, run);
    throw error;
  }
}
