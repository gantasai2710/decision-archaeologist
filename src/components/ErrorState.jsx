import { Link } from 'react-router-dom'

export default function ErrorState({ title = 'Something went wrong', message = 'Please try again.', onRetry }) {
  return (
    <div className="card mx-auto max-w-xl p-8 text-center" role="alert">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-ink-soft">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-primary mt-5">Try again</button>}
    </div>
  )
}

export function EmptyState({ title, message, to, action }) {
  return (
    <div className="card mx-auto max-w-xl border-dashed p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {message && <p className="mt-2 text-sm text-ink-soft">{message}</p>}
      {to && <Link to={to} className="btn-primary mt-5">{action}</Link>}
    </div>
  )
}
