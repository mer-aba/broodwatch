import Onboarding from '@/components/onboarding/wizard'

export const metadata = { title: 'Set up your farm' }
export default function OnboardingPage() {
  return (
    <main className="app-content">
      <Onboarding />
    </main>
  )
}
