// Dark badge/text pairs are deliberately chosen, not a mechanical
// dark:-prefix of the light pastel tones -- a pale bg-*-100 badge stays
// legible on a white page but reads as washed-out and low-contrast on a
// near-black one. Deep bg-*-950 with light-*-300 text keeps each status
// clearly distinguishable and readable in both modes.
const STATUS_STYLES = {
  urgent: {
    label: 'Urgent',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  },
  low: {
    label: 'Low',
    dot: 'bg-yellow-500',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  },
  enough: {
    label: 'Enough',
    dot: 'bg-green-500',
    badge: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  },
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
