export default function RankedTable({ title, rows, columns }) {
  return (
    <div className="bg-white rounded-xl border border-ink-700 p-4">
      <h3 className="text-sm font-semibold text-ink-950 mb-3">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink-400">
            {columns.map(col => <th key={col.key} className="pb-2 font-medium">{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-ink-700">
              {columns.map(col => (
                <td key={col.key} className="py-1.5 text-ink-950">{row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
