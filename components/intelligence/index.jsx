'use client'

import { AnomalyAlerts } from '../monitoring/anomaly-alerts'

import { Devices } from '../administration/devices'

import { EggProduction } from '../business/egg-production'

import { EnvironmentMonitoring } from '../monitoring/environment-monitoring'

import { EvaluationLab } from '../administration/evaluation-lab'

import { ExpensesSales } from '../business/expenses-sales'

import { FeedWater } from '../business/feed-water'

import { KnowledgeLibrary } from '../advisory/knowledge-library'

import { MAAIFRecommendations } from '../monitoring/maaif-recommendations'

import { Reports } from '../business/reports'

import { TrendsAnalytics } from '../monitoring/trends-analytics'

import { UserManagement } from '../administration/user-management'

import { AssistantChat } from '../advisory/assistant-chat'

export { default as FloatingAssistant } from '../advisory/floating-assistant'

const screens = {
  'MAAIF Recommendations': MAAIFRecommendations,
  'Anomaly Alerts': AnomalyAlerts,
  'Live Environment': EnvironmentMonitoring,
  'Trends & Analytics': TrendsAnalytics,
  'Knowledge Library': KnowledgeLibrary,
  'BroodWatch Assistant': AssistantChat,
  'Feed & Water': FeedWater,
  'Egg Production': EggProduction,
  'Expenses & Sales': ExpensesSales,
  Reports,
  Devices,
  'User Management': UserManagement,
  'Evaluation Laboratory': EvaluationLab,
}

export default function Phase3Screens({ section }) {
  const Screen = screens[section] || MAAIFRecommendations
  return <Screen />
}
