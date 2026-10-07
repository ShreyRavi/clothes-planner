import { TEMPLATES } from '../../domain/templates';
import { DEFAULT_PRESETS } from '../../domain/presets';
import { usePlans } from '../hooks';
import { deleteWithUndo } from '../../db/actions';
import { pickRestoreFile } from '../actions';
import { setLastPlan } from '../../state/theme';

export function Home() {
  const plans = usePlans();
  return (
    <main className="page" style={{ gap: 36 }}>
      <div className="row topbar-plain">
        <span className="wordmark" style={{ fontSize: 24 }}>
          Trousseau
        </span>
        <span className="spacer" />
        <a className="btn-text" href="#/settings">
          Settings
        </a>
      </div>
      <div className="stack" style={{ gap: 14, paddingTop: 12 }}>
        <h1 className="title-display">Every outfit, for every function, in one place.</h1>
        <p className="muted" style={{ margin: 0, fontSize: 16, maxWidth: 440 }}>
          No account needed. Plans save on this device and share as images or a single link.
        </p>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <a className="btn btn-primary btn-block" href="#/new">
          Start a plan
        </a>
        <button className="btn-text" style={{ alignSelf: 'center' }} onClick={pickRestoreFile}>
          Restore from a backup
        </button>
      </div>
      <section className="stack" aria-labelledby="tpl-h">
        <h2 id="tpl-h" className="eyebrow">
          Or start from a template
        </h2>
        <div className="list-top">
          {TEMPLATES.map((t) => (
            <a key={t.id} className="menu-item" href={`#/new?t=${t.id}`} style={{ minHeight: 64 }}>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span className="serif" style={{ fontSize: 20 }}>
                  {t.name}
                </span>
                <span className="meta">{t.description}</span>
              </span>
              <span className="muted" aria-hidden="true" style={{ fontSize: 20 }}>
                ›
              </span>
            </a>
          ))}
        </div>
      </section>
      {!!plans?.length && (
        <section className="stack" aria-labelledby="plans-h">
          <h2 id="plans-h" className="eyebrow">
            Your plans on this device
          </h2>
          {plans.map((p) => (
            <div key={p.id} style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              <a href={`#/p/${p.id}`} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, padding: '14px 16px', color: 'var(--ink)', textDecoration: 'none' }}>
                <span className="serif" style={{ fontSize: 20 }}>
                  {p.title}
                </span>
                <span className="meta">
                  {[p.owner && `${p.owner}'s plan`, DEFAULT_PRESETS[p.preset].label, p.sharedOn && `Shared on ${p.sharedOn}`].filter(Boolean).join(' · ')}
                </span>
              </a>
              <button
                className="btn-plain muted"
                style={{ width: 72, borderLeft: '1px solid var(--line)', fontSize: 13 }}
                aria-label={`Delete ${p.title}`}
                onClick={async () => {
                  await deleteWithUndo('plan', p.id, 'Plan deleted');
                  setLastPlan(null);
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
