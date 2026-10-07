import { Sheet } from '../components/Sheet';
import { CommitInput } from '../components/CommitInput';
import { usePlanData } from '../hooks';
import { updatePlan } from '../../db/repo';

export function PlanDetailsSheet({ planId }: { planId: string }) {
  const data = usePlanData(planId);
  if (!data) return null;
  const p = data.plan;
  return (
    <Sheet title="Plan details">
      <label className="field">
        <span className="eyebrow">Title</span>
        <CommitInput className="input" value={p.title} onCommit={(v) => updatePlan(p.id, { title: v.trim() || p.title })} />
      </label>
      <label className="field">
        <span className="eyebrow">Whose plan</span>
        <CommitInput className="input" value={p.owner} onCommit={(v) => updatePlan(p.id, { owner: v.trim() })} />
      </label>
      <label className="field">
        <span className="eyebrow">Place</span>
        <CommitInput className="input" value={p.place} onCommit={(v) => updatePlan(p.id, { place: v.trim() })} placeholder="Udaipur" />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
        <label className="field">
          <span className="eyebrow">From</span>
          <CommitInput className="input" type="date" value={p.startDate} onCommit={(v) => updatePlan(p.id, { startDate: v })} />
        </label>
        <label className="field">
          <span className="eyebrow">To</span>
          <CommitInput className="input" type="date" value={p.endDate} onCommit={(v) => updatePlan(p.id, { endDate: v })} />
        </label>
      </div>
      <label className="field">
        <span className="eyebrow">Notes</span>
        <textarea className="textarea" defaultValue={p.notes} onBlur={(e) => e.target.value !== p.notes && updatePlan(p.id, { notes: e.target.value })} />
      </label>
    </Sheet>
  );
}
