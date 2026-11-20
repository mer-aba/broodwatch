import { AuthNotice } from '@/components/auth/auth-notices'

export const metadata = { title: 'Verify your email' }
export default function VerifyEmailPage() {
  return <AuthNotice type="verify" />
}
