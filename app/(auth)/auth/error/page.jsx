import { AuthNotice } from '@/components/auth/auth-notices'

export const metadata = { title: 'Authentication error' }
export default async function AuthErrorPage({ searchParams }) {
  const params = await searchParams
  const reason = params?.reason
  return <AuthNotice type="error" reason={reason === 'callback' ? 'callback' : ''} />
}
