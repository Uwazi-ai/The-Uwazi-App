/// <reference types="npm:@types/react@18.3.1" />
import type * as React from 'npm:react@18.3.1'
import { template as securityIncident } from './security-incident.tsx'
import { template as cityOnboarding } from './city-onboarding.tsx'
import { template as platformHealthAlert } from './platform-health-alert.tsx'
import { template as studentVerify } from './student-verify.tsx'
import { template as rideCoordinatorAlert } from './ride-coordinator-alert.tsx'
import { confirmation, reminder, rights } from './rider-email.tsx'

export interface TemplateEntry {
  displayName?: string
  component: React.ComponentType<any>
  // Fixed recipient — when set, overrides the recipientEmail in the request body
  to?: string
  subject: string | ((data: any) => string)
  previewData?: Record<string, any>
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'rider-confirmation': confirmation,
  'rider-reminder': reminder,
  'rider-rights': rights,
  'ride-coordinator-alert': rideCoordinatorAlert,
  'security-incident': securityIncident,
  'city-onboarding': cityOnboarding,
  'platform-health-alert': platformHealthAlert,
  'student-verify': studentVerify,
}
