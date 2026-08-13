import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const url = rawUrl && rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co'
const anonKey = rawAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.placeholder'

if (!rawUrl || !rawAnonKey) {
  console.warn(
    'Health-One: Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env. Using fallback client to prevent white screen.'
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
