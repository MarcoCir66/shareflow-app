import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ShareFlow crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-paper">
          <p className="text-ink-950 font-semibold">Si è verificato un errore imprevisto.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-flow-600 text-white rounded-lg">
            Ricarica la pagina
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
