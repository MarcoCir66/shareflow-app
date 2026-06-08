export default function WorkspaceShell({ left, center, right }) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: '260px 1fr 320px',
        height: 'calc(100vh - 3.5rem)',
        marginTop: '3.5rem',
      }}
    >
      <aside className="overflow-y-auto bg-slate border-r border-slate-mid">
        {left}
      </aside>
      <main className="overflow-y-auto bg-surface">
        {center}
      </main>
      <aside className="overflow-y-auto bg-slate border-l border-slate-mid">
        {right}
      </aside>
    </div>
  )
}
