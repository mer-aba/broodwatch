import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthUserProvider } from '@/components/auth/auth-user-context'

export default async function ProtectedApplicationLayout({ children }) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) redirect('/auth/login?next=%2Fdashboard')
  const user = data.user
  const displayName =
    user.user_metadata?.full_name?.trim() ||
    user.email?.split('@')[0]?.replace(/[._-]+/g, ' ') ||
    'Farmer'
  const isAdmin = user.app_metadata?.role === 'admin'
  return (
    <AuthUserProvider displayName={displayName} isAdmin={isAdmin}>
      {children}
    </AuthUserProvider>
  )
}
