const STATUS_STYLES = {
  urgent: { label: 'Urgent', dot: 'bg-red-500', badge: 'bg-red-100 text-red-800' },
  low: { label: 'Low', dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-800' },
  enough: { label: 'Enough', dot: 'bg-green-500', badge: 'bg-green-100 text-green-800' },
} as const

export function StatusBadge({ status }: { status: keyof typeof STATUS_STYLES }) {
  const style = STATUS_STYLES[status]
  return (
    <span
      className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${style.badge}`}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
}
