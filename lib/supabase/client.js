
import { createBrowserClient } from '@supabase/ssr'

let browserClient

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase Auth is not configured in this environment.'
    )
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }

  return browserClient
}
