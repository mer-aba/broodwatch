'use client'

import { useCallback, useEffect, useState } from 'react'
import Dashboard from '../dashboard/dashboard'
import FarmManagement from '../farms/farm-management'
import Operations from '../operations'
import Phase3Screens, { FloatingAssistant } from '../intelligence'
import { useAuthUser } from '../auth/auth-user-context'
import { createClient } from '@/lib/supabase/client'
import Header from './header'
import Sidebar, { visibleGroups } from './sidebar'

const OPERATIONS_SCREENS = ['Daily Records', 'Weight Monitoring', 'Bird Movements', 'Mortality & Health', 'Vaccination & Tasks']
const FARM_SCREENS = ['My Farms', 'Poultry Houses & Pens', 'Flocks & Batches']

const INITIAL_ACTIVE = 'Dashboard'
const NO_FARM_KEY = 'no-farm'
const SIDEBAR_STORAGE_KEY = 'bw-sidebar-collapsed'
const MOBILE_BREAKPOINT = '(max-width: 760px)'

function isNavigable(screen, isAdmin) {
  return (
    screen === 'Dashboard' ||
    screen === 'BroodWatch Assistant' ||
    visibleGroups(isAdmin).some(g => g.items.includes(screen))
  )
}

async function loadFarmAccess() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!user) return { redirect: '/auth/login' }

  const { data: memberships, error: membershipError } = await supabase
    .from('farm_memberships')
    .select('farm_id')
    .eq('user_id', user.id)
  if (membershipError) throw membershipError

  const ids = [...new Set((memberships || []).map(m => m.farm_id))]
  if (!ids.length) return { farms: [] }

  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: false })
  if (error) throw error

  return { farms: data || [] }
}

function useFarms() {
  const [farms, setFarms] = useState([])
  const [selectedFarmId, setSelectedFarmId] = useState(null)
  const [farmLoading, setFarmLoading] = useState(true)
  const [farmError, setFarmError] = useState('')

  const loadFarms = useCallback(async () => {
    setFarmLoading(true)
    setFarmError('')

    try {
      const result = await loadFarmAccess()

      if (result.redirect) {
        window.location.assign(result.redirect)
        return
      }

      const next = result.farms || []
      setFarms(next)
      setSelectedFarmId(current => (next.some(f => f.id === current) ? current : next[0]?.id || null))
    } catch (error) {
      console.error('Failed to load farms:', error)
      setFarmError(error.message || 'Unable to load your farms.')
    } finally {
      setFarmLoading(false)
    }
  }, [])

  useEffect(() => { loadFarms() }, [loadFarms])

  return { farms, selectedFarmId, setSelectedFarmId, farmLoading, farmError, loadFarms }
}

function useLayoutMode() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true')
    } catch {}

    const media = window.matchMedia(MOBILE_BREAKPOINT)
    const sync = () => {
      setMobile(media.matches)
      if (!media.matches) setMobileOpen(false)
    }

    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  function toggleCollapse(value) {
    setCollapsed(value)
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value))
    } catch {}
  }

  return { collapsed, setCollapsed: toggleCollapse, mobileOpen, setMobileOpen, mobile }
}

function useNavigation(isAdmin, setMobileOpen) {
  const [active, setActive] = useState(INITIAL_ACTIVE)

  const navigate = useCallback(
    screen => {
      if (isNavigable(screen, isAdmin)) {
        setActive(screen)
        setMobileOpen(false)
      }
    },
    [isAdmin, setMobileOpen]
  )

  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') setMobileOpen(false)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        navigate('BroodWatch Assistant')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, setMobileOpen])

  return { active, navigate }
}

function LoadingScreen() {
  return (
    <div className="wizard-card">
      <h2>Loading your farm...</h2>
      <p>Retrieving your BroodWatch records from Supabase.</p>
    </div>
  )
}

function FarmErrorScreen({ error, onRetry }) {
  return (
    <div className="wizard-card">
      <h2>Unable to load farm information</h2>
      <p role="alert">{error}</p>
      <button className="button-primary" onClick={onRetry}>Try again</button>
    </div>
  )
}

function NoFarmScreen() {
  return (
    <div className="wizard-card">
      <h2>No farm found</h2>
      <p>Create your first farm to continue.</p>
      <button className="button-primary" onClick={() => window.location.assign('/onboarding')}>
        Set up your farm
      </button>
    </div>
  )
}

function renderScreen({ active, isAdmin, navigate, displayName, farmProps }) {
  if (active === 'Dashboard' || (active === 'Evaluation Laboratory' && !isAdmin)) {
    return <Dashboard onNavigate={navigate} userName={displayName} {...farmProps} />
  }

  if (FARM_SCREENS.includes(active) || active === 'Farm Settings') {
    return (
      <FarmManagement
        section={active === 'Farm Settings' ? 'My Farms' : active}
        onNavigate={navigate}
        {...farmProps}
      />
    )
  }

  if (OPERATIONS_SCREENS.includes(active)) {
    return <Operations section={active} {...farmProps} />
  }

  return <Phase3Screens section={active} {...farmProps} />
}

export default function AppShell() {
  const { displayName, initials, isAdmin } = useAuthUser()
  const { farms, selectedFarmId, setSelectedFarmId, farmLoading, farmError, loadFarms } = useFarms()
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen, mobile } = useLayoutMode()
  const { active, navigate } = useNavigation(isAdmin, setMobileOpen)

  const selectedFarm = farms.find(f => f.id === selectedFarmId) || null

  const farmProps = {
    farm: selectedFarm,
    farmId: selectedFarmId,
    farms,
    onFarmChange: setSelectedFarmId,
    onFarmRefresh: loadFarms,
  }

  function renderContent() {
    if (farmLoading) return <LoadingScreen />
    if (farmError) return <FarmErrorScreen error={farmError} onRetry={loadFarms} />
    if (!farms.length) return <NoFarmScreen />

    return renderScreen({ active, isAdmin, navigate, displayName, farmProps })
  }

  const contentKey = selectedFarmId || NO_FARM_KEY

  return (
    <div className={`app-frame ${collapsed && !mobile ? 'collapsed' : ''}`}>
      <Sidebar
        active={active}
        onNavigate={navigate}
        collapsed={collapsed && !mobile}
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
          mobileOpen={mobileOpen}
          active={active}
          initials={initials}
          farms={farms}
          farmId={selectedFarmId}
          onFarmChange={setSelectedFarmId}
          onNavigate={navigate}
          isAdmin={isAdmin}
        />

        <main className="app-content" key={contentKey}>
          {renderContent()}
        </main>
      </div>

      <FloatingAssistant
        key={contentKey}
        onOpen={() => navigate('BroodWatch Assistant')}
        active={active}
        {...farmProps}
      />
    </div>
  )
}