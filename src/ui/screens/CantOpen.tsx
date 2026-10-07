const REASONS: Record<string, string> = {
  empty: 'The link has no plan in it.',
  truncated: 'The link was cut short or damaged.',
  'too-large': 'The plan in the link is too large to open.',
  version: 'It was made with a newer version of Trousseau.',
  invalid: 'The plan data in the link is damaged.',
};

/** Plain-language error for links (design review DR9). Nothing is written. */
export function CantOpen({ reason, detail, home }: { reason: string; detail?: string; home: string }) {
  return (
    <main className="page" style={{ paddingTop: 48 }}>
      <h1 className="title-1">This plan can't be opened</h1>
      <p style={{ margin: 0, fontSize: 16 }}>The link may have been cut short when it was sent. Ask the sender to share it again, or to send the outfit images instead.</p>
      <a className="btn btn-primary btn-block" href={home}>
        Start your own plan
      </a>
      <details>
        <summary className="meta">Details</summary>
        <p className="meta">{REASONS[reason] ?? reason}{detail ? ` (${detail})` : ''}</p>
      </details>
    </main>
  );
}
