import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type Partner = Database['public']['Tables']['partners']['Row']

export function usePartners() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadPartners() {
      try {
        const { data, error } = await supabase
          .from('partners')
          .select('*')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })

        if (!error && data && isMounted) {
          setPartners(data)
        }
      } catch {
        // Ne rien inventer : liste vide si non disponible
        if (isMounted) setPartners([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadPartners()
    return () => {
      isMounted = false
    }
  }, [])

  return { partners, loading }
}

