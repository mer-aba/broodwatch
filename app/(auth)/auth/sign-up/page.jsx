import AuthForm from '@/components/auth/auth-forms'

export const metadata = { title: 'Create account' }
export default function SignUpPage() {
  return <AuthForm mode="signup" />
}
