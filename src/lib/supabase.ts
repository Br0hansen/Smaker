import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
/** VITE_SMAKER_LOCAL=1 gir demomodus med eksempeldata i nettleseren (for utvikling og tester). */
const forceLocal = import.meta.env.VITE_SMAKER_LOCAL === '1'

export const supabase: SupabaseClient | null =
  url && key && !forceLocal
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // Egen nøkkel: prosjektet deles med andre apper
          storageKey: 'smaker-auth',
        },
      })
    : null

export const MEDIA_BUCKET = 'smaker-media'
