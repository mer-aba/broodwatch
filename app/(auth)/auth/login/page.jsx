import AuthForm from '@/components/auth/auth-forms'

export const metadata = { title: 'Login' }
export default function LoginPage() {
  return <AuthForm mode="login" />
}
