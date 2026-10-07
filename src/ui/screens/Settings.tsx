import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { PRESET_IDS, DEFAULT_PRESETS } from '../../domain/presets';
import { getTheme, setTheme, setLastPlan, type ThemePref } from '../../state/theme';
import { pickRestoreFile, runBackup, requestPersistence } from '../actions';
import { openSheet } from '../../state/sheets';
import { deleteWithUndo } from '../../db/actions';
import { NoticeBanner } from '../components/Banners';
import { getLastPlan } from '../../state/theme';

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

/** Settings, data first (design review DR4). */
export function Settings() {
  const lastBackup = useLiveQuery(async () => (await db.meta.get('lastBackupAt'))?.value as number | undefined, []);
  const presets = useLiveQuery(() => db.presets.toArray(), []);
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null | undefined>(undefined);
  const [persisted, setPersisted] = useState<boolean | undefined>(undefined);
  const [theme, setThemeState] = useState<ThemePref>(getTheme());
  const lastPlan = getLastPlan();

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setEstimate({ usage: e.usage ?? 0, quota: e.quota ?? 0 })).catch(() => setEstimate(null)) ?? setEstimate(null);
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(false)) ?? setPersisted(false);
  }, []);

  return (
    <>
      <NoticeBanner showBackup={false} />
      <main className="page">
        <div className="row topbar-plain">
          <a className="btn-plain" href={lastPlan ? `#/p/${lastPlan}` : '#/'}>
            ‹ Back
          </a>
          <span className="spacer" />
          <a className="wordmark" href="#/" style={{ fontSize: 20 }}>
            Trousseau
          </a>
          <span className="spacer" />
          <span style={{ width: 52 }} />
        </div>
        <h1 className="title-1">Settings</h1>

        <section className="section" aria-labelledby="data-h">
          <h2 id="data-h" className="eyebrow">
            Your data
          </h2>
          <button className="btn btn-primary btn-block" onClick={runBackup}>
            Back up now
          </button>
          <span className="meta">{lastBackup ? `Last backup: ${new Date(lastBackup).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Never backed up'}</span>
          <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={pickRestoreFile}>
            Restore from file
          </button>
          {estimate === undefined && <span className="meta">Checking storage</span>}
          {estimate && (
            <div className="stack" style={{ gap: 6 }}>
              <div className="storage-bar" aria-hidden="true">
                <span style={{ width: `${estimate.quota ? Math.min(100, Math.max(1, (estimate.usage / estimate.quota) * 100)) : 1}%` }} />
              </div>
              <span className="meta num">{formatBytes(estimate.usage)} used</span>
            </div>
          )}
          {persisted !== undefined && (
            <p className="meta" style={{ margin: 0 }}>
              {persisted ? (
                'This device will keep your plans.'
              ) : (
                <>
                  Your browser may clear plans you haven't opened in a while. Back up, or add Trousseau to your home screen.{' '}
                  <button
                    className="btn-text"
                    onClick={async () => setPersisted(await requestPersistence())}
                    style={{ minHeight: 0, fontSize: 13 }}
                  >
                    Ask to keep data
                  </button>
                </>
              )}
            </p>
          )}
        </section>

        <section className="section" aria-labelledby="presets-h">
          <h2 id="presets-h" className="eyebrow">
            Slot presets
          </h2>
          <p className="meta" style={{ margin: 0 }}>
            The slots new plans start with. Changes apply to new plans only.
          </p>
          <div className="list-top">
            {PRESET_IDS.map((id) => {
              const p = presets?.find((x) => x.id === id) ?? DEFAULT_PRESETS[id];
              return (
                <a key={id} className="menu-item" href={`#/settings/preset/${id}`}>
                  <span style={{ flex: 1 }}>{p.label}</span>
                  <span className="meta">{p.slots.length} slots</span>
                  <span className="muted" aria-hidden="true">
                    ›
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        <section className="section" aria-labelledby="look-h">
          <h2 id="look-h" className="eyebrow">
            Appearance
          </h2>
          <div className="segmented" role="group" aria-labelledby="look-h">
            {(['system', 'light', 'dark'] as ThemePref[]).map((t) => (
              <button
                key={t}
                aria-pressed={theme === t}
                onClick={() => {
                  setTheme(t);
                  setThemeState(t);
                }}
              >
                {t === 'system' ? 'System' : t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </section>

        <section className="stack" aria-labelledby="danger-h">
          <h2 id="danger-h" className="visually-hidden">
            Delete all data
          </h2>
          <button
            className="btn-text danger"
            style={{ alignSelf: 'flex-start' }}
            onClick={() =>
              openSheet({
                kind: 'confirm',
                title: 'Delete all data?',
                body: 'Every plan, item and photo on this device will be removed. You can undo for a few seconds, and a backup file brings everything back later.',
                confirmLabel: 'Delete everything',
                danger: true,
                onConfirm: async () => {
                  setLastPlan(null);
                  await deleteWithUndo('all', '', 'All data deleted');
                },
              })
            }
          >
            Delete all data
          </button>
          <p className="meta" style={{ margin: 0 }}>
            Trousseau keeps everything on this device. Nothing is sent anywhere unless you share a link or a file.
          </p>
        </section>
      </main>
    </>
  );
}
