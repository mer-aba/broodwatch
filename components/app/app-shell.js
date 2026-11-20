
'use client'

import { useCallback, useEffect, useState } from 'react'
import Dashboard from '../dashboard/dashboard'
import FarmManagement from '../farms/farm-management'
import Onboarding from '../onboarding/wizard'
import Operations from '../operations'
import Phase3Screens, { FloatingAssistant } from '../intelligence'
import { useAuthUser } from '../auth/auth-user-context'
import { createClient } from '@/lib/supabase/client'
import Header from './header'
import Sidebar from './sidebar'

const operationsScreens = [
  'Daily Records',
  'Weight Monitoring',
  'Bird Movements',
  'Mortality & Health',
  'Vaccination & Tasks',
]

const farmScreens = [
  'My Farms',
  'Poultry Houses & Pens',
  'Flocks & Batches',
]

export default function AppShell() {
  const { displayName, initials, isAdmin } = useAuthUser()

  const [active, setActive] = useState('Dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const [farms, setFarms] = useState([])
  const [selectedFarmId, setSelectedFarmId] = useState(null)
  const [farmLoading, setFarmLoading] = useState(true)
  const [farmError, setFarmError] = useState('')

  const selectedFarm =
    farms.find((farm) => farm.id === selectedFarmId) || null

  const loadFarms = useCallback(async () => {
    setFarmLoading(true)
    setFarmError('')

    try {
      const supabase = createClient()

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError

      if (!user) {
        window.location.assign('/auth/login')
        return
      }

      const { data: memberships, error: membershipError } =
        await supabase
          .from('farm_memberships')
          .select('farm_id')
          .eq('user_id', user.id)

      if (membershipError) throw membershipError

      const farmIds = [
        ...new Set((memberships || []).map((item) => item.farm_id)),
      ]

      if (farmIds.length === 0) {
        setFarms([])
        setSelectedFarmId(null)
        return
      }

      const { data: farmData, error: farmDataError } =
        await supabase
          .from('farms')
          .select('*')
          .in('id', farmIds)
          .order('created_at', { ascending: false })

      if (farmDataError) throw farmDataError

      const nextFarms = farmData || []

      setFarms(nextFarms)

      setSelectedFarmId((current) =>
        nextFarms.some((farm) => farm.id === current)
          ? current
          : nextFarms[0]?.id || null
      )
    } catch (error) {
      console.error('Failed to load farms:', error)
      setFarmError(error.message || 'Unable to load your farms.')
    } finally {
      setFarmLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFarms()
  }, [loadFarms])

  function navigate(screen) {
    setActive(screen)
    setMobileOpen(false)
  }

  function renderContent() {
    if (farmLoading) {
      return (
        <div className="wizard-card">
          <h2>Loading your farm...</h2>
          <p>Retrieving your BroodWatch records from Supabase.</p>
        </div>
      )
    }

    if (farmError) {
      return (
        <div className="wizard-card">
          <h2>Unable to load farm information</h2>
          <p role="alert">{farmError}</p>
          <button
            type="button"
            className="button-primary"
            onClick={loadFarms}
          >
            Try again
          </button>
        </div>
      )
    }

    if (farms.length === 0) {
      return (
        <div className="wizard-card">
          <h2>No farm found</h2>
          <p>
            You haven't completed farm setup yet.
            Create your first farm to continue.
          </p>
          <button
            type="button"
            className="button-primary"
            onClick={() => window.location.assign('/onboarding')}
          >
            Set up your farm
          </button>
        </div>
      )
    }

    const farmProps = {
      farm: selectedFarm,
      farmId: selectedFarmId,
      farms,
      onFarmChange: setSelectedFarmId,
      onFarmRefresh: loadFarms,
    }

    if (active === 'Dashboard') {
      return (
        <Dashboard
          onNavigate={navigate}
          userName={displayName}
          {...farmProps}
        />
      )
    }

    if (farmScreens.includes(active)) {
      return (
        <FarmManagement
          section={active}
          onNavigate={navigate}
          {...farmProps}
        />
      )
    }

    if (active === 'Farm Settings') {
      return (
        <FarmManagement
          section="My Farms"
          onNavigate={navigate}
          {...farmProps}
        />
      )
    }

    if (operationsScreens.includes(active)) {
      return (
        <Operations
          section={active}
          {...farmProps}
        />
      )
    }

    if (active === 'Evaluation Laboratory' && !isAdmin) {
      return (
        <Dashboard
          onNavigate={navigate}
          userName={displayName}
          {...farmProps}
        />
      )
    }

    return (
      <Phase3Screens
        section={active}
        {...farmProps}
      />
    )
  }

  return (
    <div className="app-frame">
      <Sidebar
        active={active}
        onNavigate={navigate}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        displayName={displayName}
        initials={initials}
        isAdmin={isAdmin}
      />

      <div className="app-main">
        <Header
          onMenu={() => setMobileOpen(true)}
          active={active}
          initials={initials}
        />

        <main className="app-content">
          {renderContent()}
        </main>
      </div>

      <FloatingAssistant
        onOpen={() => navigate('BroodWatch Assistant')}
        active={active}
      />
    </div>
  )
}
