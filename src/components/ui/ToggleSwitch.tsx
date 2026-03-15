interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export default function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 transition-all-200"
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: checked ? 'var(--accent-peach)' : 'rgba(255,255,255,0.12)',
      }}
    >
      <div
        className="absolute top-1 rounded-full transition-all duration-200"
        style={{
          width: 16,
          height: 16,
          left: checked ? 24 : 4,
          backgroundColor: '#ffffff',
        }}
      />
    </button>
  )
}
