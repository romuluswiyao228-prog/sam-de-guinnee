import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CountdownTimer } from './CountdownTimer'

describe('CountdownTimer', () => {
  it('affiche le décompte (jours, heures, minutes, secondes) pour une date future', () => {
    // Date future : dans 10 jours
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000)

    render(<CountdownTimer targetDate={futureDate} />)

    // Vérifie le rôle timer accessible
    const timer = screen.getByRole('timer')
    expect(timer).toBeInTheDocument()
    expect(timer).toHaveAttribute('aria-label')

    // Vérifie la présence des 4 unités
    expect(screen.getByTestId('countdown-jours')).toHaveTextContent('10')
    expect(screen.getByText('Jours')).toBeInTheDocument()
    expect(screen.getByText('Heures')).toBeInTheDocument()
    expect(screen.getByText('Minutes')).toBeInTheDocument()
    expect(screen.getByText('Secondes')).toBeInTheDocument()
  })

  it('affiche l\'état d\'ouverture pour une date passée', () => {
    // Date passée
    const pastDate = new Date(Date.now() - 10000)
    const onExpire = vi.fn()

    render(<CountdownTimer targetDate={pastDate} onExpire={onExpire} />)

    // Vérifie le statut ouvert
    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status).toHaveTextContent(/Le salon SAM Guinée 2027 est ouvert !/i)

    // Le callback onExpire doit avoir été appelé
    expect(onExpire).toHaveBeenCalled()

    // Le timer régulier ne doit plus être affiché
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
  })

  it('gère correctement une chaîne ISO comme date cible', () => {
    // Date dans le futur lointain (ex: 2099)
    const targetISO = '2099-01-01T00:00:00Z'

    render(<CountdownTimer targetDate={targetISO} />)

    expect(screen.getByRole('timer')).toBeInTheDocument()
    const daysEl = screen.getByTestId('countdown-jours')
    expect(Number(daysEl.textContent)).toBeGreaterThan(100)
  })
})

