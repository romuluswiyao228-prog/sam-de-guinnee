import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type Activity = Database['public']['Tables']['activities']['Row']

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadActivities() {
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .eq('is_published', true)
          .order('starts_at', { ascending: true })

        if (!error && data && isMounted) {
          setActivities(data)
        }
      } catch {
        // En cas d'erreur réseau, ne rien inventer : liste vide
        if (isMounted) setActivities([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadActivities()
    return () => {
      isMounted = false
    }
  }, [])

  return { activities, loading }
}

