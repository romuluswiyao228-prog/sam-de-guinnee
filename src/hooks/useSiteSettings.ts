import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface OpeningHours {
  weekdays: string
  weekend: string
  exhibitors: string
  total_evacuation: string
}

export interface SiteSettings {
  slogan: string
  event_dates_display: string
  venue_display: string
  contact_phones: string[]
  contact_email: string
  headquarters_address: string
  opening_hours: OpeningHours
  exhibitor_registration_fee_gnf: number
  exhibitor_deposit_gnf: number
  vat_rate: number
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  slogan: '« La Guinée roule vers l’avenir. »',
  event_dates_display: 'Du vendredi 19 au dimanche 28 mars 2027',
  venue_display: 'Palais du Peuple de Conakry & Esplanade du « Stade Général Lansana Conté »',
  contact_phones: ['(00224) 610 86 14 09', '(00224) 655 79 78 77'],
  contact_email: 'samdeguinee@gmail.com',
  headquarters_address: 'Lambagny / Commune de Lambagny, Conakry, Guinée',
  opening_hours: {
    weekdays: '09:00 - 20:00',
    weekend: '10:00 - 21:00',
    exhibitors: '08:00 - 22:00',
    total_evacuation: '23:00',
  },
  exhibitor_registration_fee_gnf: 2000000,
  exhibitor_deposit_gnf: 3000000,
  vat_rate: 0.18,
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadSettings() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('public_site_settings')
          .select('key, value')

        if (fetchErr) throw fetchErr

        const rows = data as Array<{ key: string; value: unknown }> | null

        if (rows && isMounted) {
          const map: Record<string, unknown> = {}
          rows.forEach((row) => {
            map[row.key] = row.value
          })

          setSettings({
            slogan: typeof map.slogan === 'string' ? map.slogan : DEFAULT_SITE_SETTINGS.slogan,
            event_dates_display:
              typeof map.event_dates_display === 'string'
                ? map.event_dates_display
                : DEFAULT_SITE_SETTINGS.event_dates_display,
            venue_display:
              typeof map.venue_display === 'string'
                ? map.venue_display
                : DEFAULT_SITE_SETTINGS.venue_display,
            contact_phones: Array.isArray(map.contact_phones)
              ? (map.contact_phones as string[])
              : DEFAULT_SITE_SETTINGS.contact_phones,
            contact_email:
              typeof map.contact_email === 'string'
                ? map.contact_email
                : DEFAULT_SITE_SETTINGS.contact_email,
            headquarters_address:
              typeof map.headquarters_address === 'string'
                ? map.headquarters_address
                : DEFAULT_SITE_SETTINGS.headquarters_address,
            opening_hours:
              typeof map.opening_hours === 'object' && map.opening_hours !== null
                ? (map.opening_hours as OpeningHours)
                : DEFAULT_SITE_SETTINGS.opening_hours,
            exhibitor_registration_fee_gnf:
              typeof map.exhibitor_registration_fee_gnf === 'number'
                ? map.exhibitor_registration_fee_gnf
                : DEFAULT_SITE_SETTINGS.exhibitor_registration_fee_gnf,
            exhibitor_deposit_gnf:
              typeof map.exhibitor_deposit_gnf === 'number'
                ? map.exhibitor_deposit_gnf
                : DEFAULT_SITE_SETTINGS.exhibitor_deposit_gnf,
            vat_rate:
              typeof map.vat_rate === 'number'
                ? map.vat_rate
                : DEFAULT_SITE_SETTINGS.vat_rate,
          })
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Erreur lors du chargement des paramètres'))
          // Conserver les valeurs de repli par défaut en cas d'erreur
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadSettings()
    return () => {
      isMounted = false
    }
  }, [])

  return { settings, loading, error }
}

