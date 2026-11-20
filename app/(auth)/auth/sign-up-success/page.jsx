import { AuthNotice } from '@/components/auth/auth-notices'

export const metadata = { title: 'Check your email' }
export default function SignUpSuccessPage() {
  return <AuthNotice type="signup" />
}
