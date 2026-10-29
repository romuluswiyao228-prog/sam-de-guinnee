import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type SponsorPack = Database['public']['Tables']['sponsor_packs']['Row']

export const DEFAULT_SPONSOR_PACKS: SponsorPack[] = [
  {
    id: 'pack-diamond',
    code: 'diamond',
    label: 'Diamond',
    role_label: 'Partenaire Majeur',
    price_gnf: 300000000,
    benefits: {
      stand: '1 stand clé en main de 3 m² avec emplacement privilégié',
      mention: 'SPONSOR OFFICIEL',
      logo: 'Tous les supports de communication',
      pub_catalogue: 'Double page',
      database_visitors: true,
      gala_dinner: '1 table personnalisée (4 personnes)',
      vip_access: 4,
      press_release: true,
      badges: 10,
      common_perks: [
        'Droits d’inscription inclus',
        'Lien vers le site internet du partenaire',
        'Brochure du partenaire insérée dans le sac remis aux participants',
      ],
    },
    sort_order: 1,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'pack-platinum',
    code: 'platinum',
    label: 'Platinum',
    role_label: 'Partenaire Officiel',
    price_gnf: 200000000,
    benefits: {
      stand: '1 stand clé en main de 3 m² avec emplacement privilégié',
      mention: 'SPONSOR OFFICIEL',
      logo: 'Tous les supports de communication',
      pub_catalogue: '1 page',
      database_visitors: true,
      gala_dinner: '3 places',
      vip_access: 3,
      press_release: true,
      badges: 6,
      common_perks: [
        'Droits d’inscription inclus',
        'Lien vers le site internet du partenaire',
        'Brochure du partenaire insérée dans le sac remis aux participants',
      ],
    },
    sort_order: 2,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'pack-gold',
    code: 'gold',
    label: 'Gold',
    role_label: 'Partenaire Premium',
    price_gnf: 100000000,
    benefits: {
      stand: '1 stand clé en main de 3 m² avec emplacement privilégié',
      mention: 'SPONSOR',
      logo: 'Catalogue et site internet du salon',
      pub_catalogue: '½ page',
      database_visitors: false,
      gala_dinner: '2 places',
      vip_access: 2,
      press_release: false,
      badges: 4,
      common_perks: [
        'Droits d’inscription inclus',
        'Lien vers le site internet du partenaire',
        'Brochure du partenaire insérée dans le sac remis aux participants',
      ],
    },
    sort_order: 3,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
]

export function useSponsorPacks() {
  const [packs, setPacks] = useState<SponsorPack[]>(DEFAULT_SPONSOR_PACKS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadPacks() {
      try {
        const { data, error } = await supabase
          .from('sponsor_packs')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        if (!error && data && data.length > 0 && isMounted) {
          setPacks(data)
        }
      } catch {
        // En cas d'erreur de connexion, les packs de repli du contexte officiel sont conservés
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadPacks()
    return () => {
      isMounted = false
    }
  }, [])

  return { packs, loading }
}

