import { MarketingLayout } from '@/components/marketing/marketing-site'

export const metadata = {
  title: { default: 'BroodWatch — Smarter Flock Monitoring', template: '%s | BroodWatch' },
  description:
    'Poultry farm management, flock monitoring and practical guidance in one farmer-friendly workspace.',
}
export default function PublicMarketingLayout({ children }) {
  return <MarketingLayout>{children}</MarketingLayout>
}
