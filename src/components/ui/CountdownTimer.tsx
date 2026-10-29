import { useState, useEffect, useMemo } from 'react'

export interface CountdownTimerProps {
  /** Target date as ISO string or Date object. Default is 2027-03-19T09:00:00Z (09h00 heure de Conakry) */
  targetDate?: string | Date
  onExpire?: () => void
  className?: string
}

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
}

function calculateTimeRemaining(target: Date | number): TimeRemaining {
  const targetMs = typeof target === 'number' ? target : target.getTime()
  const diff = targetMs - Date.now()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true }
  }

  const seconds = Math.floor((diff / 1000) % 60)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  return { days, hours, minutes, seconds, isExpired: false }
}

export function CountdownTimer({
  targetDate = '2027-03-19T09:00:00Z',
  onExpire,
  className = '',
}: CountdownTimerProps) {
  const targetTime = useMemo(() => {
    return (typeof targetDate === 'string' ? new Date(targetDate) : targetDate).getTime()
  }, [targetDate])

  const [prevTargetTime, setPrevTargetTime] = useState(targetTime)
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() => calculateTimeRemaining(targetTime))

  // Ajustement immédiat lors du rendu si la prop targetDate change
  if (prevTargetTime !== targetTime) {
    setPrevTargetTime(targetTime)
    setTimeLeft(calculateTimeRemaining(targetTime))
  }

  useEffect(() => {
    const initial = calculateTimeRemaining(targetTime)
    if (initial.isExpired) {
      onExpire?.()
      return
    }

    const interval = setInterval(() => {
      const updated = calculateTimeRemaining(targetTime)
      setTimeLeft(updated)

      if (updated.isExpired) {
        clearInterval(interval)
        onExpire?.()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [targetTime, onExpire])

  if (timeLeft.isExpired) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-sam-green/15 text-sam-green border border-sam-green/30 font-bold font-['Poppins'] text-lg ${className}`}
      >
        <span className="w-3 h-3 rounded-full bg-sam-green animate-pulse" aria-hidden="true" />
        <span>Le salon SAM Guinée 2027 est ouvert !</span>
      </div>
    )
  }

  const units = [
    { label: 'Jours', value: timeLeft.days },
    { label: 'Heures', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Secondes', value: timeLeft.seconds },
  ]

  return (
    <div
      role="timer"
      aria-label={`Temps restant jusqu'à l'ouverture : ${timeLeft.days} jours, ${timeLeft.hours} heures, ${timeLeft.minutes} minutes, ${timeLeft.seconds} secondes`}
      className={`grid grid-cols-4 gap-2 sm:gap-4 max-w-xl mx-auto ${className}`}
    >
      {units.map((unit) => (
        <div
          key={unit.label}
          className="flex flex-col items-center justify-center p-3 sm:p-5 rounded-2xl bg-white border border-sam-border shadow-sm hover:border-sam-gold/50 transition-colors"
        >
          <span
            data-testid={`countdown-${unit.label.toLowerCase()}`}
            className="text-2xl sm:text-4xl lg:text-5xl font-extrabold font-['Poppins'] text-sam-navy tracking-tight"
          >
            {String(unit.value).padStart(2, '0')}
          </span>
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-sam-gray mt-1">
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  )
}

