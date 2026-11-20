
'use client'

import { BirdMovements } from './bird-movements'
import { DailyRecords } from './daily-records'
import { HealthRegister } from './health-register'
import { Inventory } from './inventory'
import { VaccinationPlanner } from './vaccination-planner'
import { WeightMonitoring } from './weight-monitoring'

const screens = {
  'Daily Records': DailyRecords,
  'Weight Monitoring': WeightMonitoring,
  'Bird Movements': BirdMovements,
  'Mortality & Health': HealthRegister,
  'Vaccination & Tasks': VaccinationPlanner,
}

export default function Operations({
  section,
  farm,
  farmId,
  farms = [],
  onFarmChange,
  onFarmRefresh,
}) {
  const Screen = screens[section] || DailyRecords

  return (
    <Screen
      farm={farm}
      farmId={farmId}
      farms={farms}
      onFarmChange={onFarmChange}
      onFarmRefresh={onFarmRefresh}
    />
  )
}
