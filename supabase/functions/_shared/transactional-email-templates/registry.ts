/// <reference types="npm:@types/react@18.3.1" />
import type * as React from 'npm:react@18.3.1'
import { template as securityIncident } from './security-incident.tsx'
import { template as cityOnboarding } from './city-onboarding.tsx'
import { template as platformHealthAlert } from './platform-health-alert.tsx'

export interface TemplateEntry {
  displayName?: string
  component: React.ComponentType<any>
  // Fixed recipient — when set, overrides the recipientEmail in the request body
  to?: string
  subject: string | ((data: any) => string)
  previewData?: Record<string, any>
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'security-incident': securityIncident,
  'city-onboarding': cityOnboarding,
  'platform-health-alert': platformHealthAlert,
}
