import AuthLayout from '@/components/auth/auth-layout'

export const metadata = {
  title: { default: 'Your BroodWatch account', template: '%s | BroodWatch' },
}
export default function AuthenticationLayout({ children }) {
  return <AuthLayout>{children}</AuthLayout>
}
