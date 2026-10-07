import { useEffect } from 'react';
import { parseRoute, useRoutePath, navigate } from './router';
import { Home } from './screens/Home';
import { Setup } from './screens/Setup';
import { PlanScreen } from './screens/PlanScreen';
import { Inbox } from './screens/Inbox';
import { Settings } from './screens/Settings';
import { PresetEditor } from './screens/PresetEditor';
import { Lists } from './screens/Lists';
import { Print } from './screens/Print';
import { SheetHost } from './SheetHost';
import { ToastHost } from './components/Toast';
import { captureFile, captureText } from './actions';
import { db } from '../db/schema';
import { ensurePresets } from '../db/repo';
import { getLastPlan } from '../state/theme';
import { showToast } from '../state/store';

function planIdOf(route: ReturnType<typeof parseRoute>): string | undefined {
  return 'planId' in route ? route.planId : undefined;
}

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
}

export function App() {
  const path = useRoutePath();
  const route = parseRoute(path);
  const planId = planIdOf(route);

  // Paste anywhere to capture (PRD), but never when pasting into a field.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!planId || isEditable(e.target) || isEditable(document.activeElement)) return;
      const dt = e.clipboardData;
      if (!dt) return;
      const file = [...dt.files].find((f) => f.type.startsWith('image/'));
      if (file) {
        e.preventDefault();
        void captureFile(planId, file, undefined, file.name).catch(() => undefined);
        return;
      }
      const text = dt.getData('text/plain');
      if (text.trim()) {
        e.preventDefault();
        void captureText(planId, text).catch(() => undefined);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [planId]);

  return (
    <>
      <Screen route={route} />
      <SheetHost />
      <ToastHost />
    </>
  );
}

function Screen({ route }: { route: ReturnType<typeof parseRoute> }) {
  switch (route.name) {
    case 'home':
      return <Home />;
    case 'setup':
      return <Setup key={route.template} templateId={route.template} />;
    case 'plan':
      return <PlanScreen planId={route.planId} />;
    case 'function':
      return <PlanScreen planId={route.planId} fnId={route.fnId} />;
    case 'inbox':
      return <Inbox planId={route.planId} />;
    case 'lists':
      return <Lists planId={route.planId} />;
    case 'print':
      return <Print planId={route.planId} />;
    case 'settings':
      return <Settings />;
    case 'preset':
      return <PresetEditor presetId={route.presetId} />;
    default:
      return (
        <main className="page">
          <h1 className="title-1">Page not found</h1>
          <a className="btn btn-primary" href="#/">
            Go to home
          </a>
        </main>
      );
  }
}

/** Runs once at start: seed presets, handle the Android share target, reopen the last plan. */
export async function boot() {
  await ensurePresets().catch(() => undefined);
  const params = new URLSearchParams(location.search);
  const shared = [params.get('share_url'), params.get('share_text'), params.get('share_title')].filter(Boolean).join(' ');
  if (shared) {
    history.replaceState(null, '', location.pathname + location.hash);
    const last = getLastPlan();
    const plan = (last && (await db.plans.get(last))) || (await db.plans.orderBy('updatedAt').last());
    if (plan) {
      navigate(`/p/${plan.id}`, { replace: true });
      await captureText(plan.id, shared).catch(() => undefined);
    } else {
      showToast('Start a plan first, then share links into it');
    }
    return;
  }
  const hash = location.hash.replace(/^#\/?/, '');
  if (!hash) {
    const last = getLastPlan();
    if (last && (await db.plans.get(last))) navigate(`/p/${last}`, { replace: true });
  }
}
