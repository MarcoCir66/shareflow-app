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
      <aside className="overflow-y-auto bg-ink-800 border-r border-ink-700">
        {left}
      </aside>
      <main className="overflow-y-auto bg-paper">
        {center}
      </main>
      <aside className="overflow-y-auto bg-ink-800 border-l border-ink-700" data-tour="properties-panel">
        {right}
      </aside>
    </div>
  )
}
