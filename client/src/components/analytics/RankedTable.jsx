export default function RankedTable({ title, rows, columns }) {
  return (
    <div className="bg-surface-card rounded-xl border border-slate-mid p-4">
      <h3 className="text-sm font-semibold text-navy mb-3">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-light">
            {columns.map(col => <th key={col.key} className="pb-2 font-medium">{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-mid">
              {columns.map(col => (
                <td key={col.key} className="py-1.5 text-navy">{row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
