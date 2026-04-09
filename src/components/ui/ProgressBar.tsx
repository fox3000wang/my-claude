
interface ProgressBarProps {
  current: number
  target: number
  label?: string
}

export function ProgressBar({ current, target, label }: ProgressBarProps) {
  const width = Math.min((current / target) * 100, 100)

  return (
    <div className="progress-container">
      <div className="progress-fill" style={{ width: `${width}%` }} />
      <span className="progress-text">
        {label ? `${label} ` : ''}{current} / {target}
      </span>
    </div>
  )
}
