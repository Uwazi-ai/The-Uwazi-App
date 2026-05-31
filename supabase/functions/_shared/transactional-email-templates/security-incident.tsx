/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface Props {
  action?: 'logged' | 'contained' | 'resolved'
  title?: string
  severity?: string
  status?: string
  description?: string
  detectedAt?: string
  resolvedAt?: string
  actor?: string
}

const ACTION_LABEL: Record<string, string> = {
  logged: 'New Incident Logged',
  contained: 'Incident Contained',
  resolved: 'Incident Resolved',
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#DC2626',
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#3B82F6',
}

export const SecurityIncidentEmail: React.FC<Props> = ({
  action = 'logged',
  title = 'Untitled incident',
  severity = 'medium',
  status = 'open',
  description,
  detectedAt,
  resolvedAt,
  actor,
}) => {
  const label = ACTION_LABEL[action] ?? 'Security Incident Update'
  const sevColor = SEVERITY_COLOR[severity] ?? '#6B7280'
  return (
    <Html>
      <Head />
      <Preview>{`[UWAZI Security] ${label}: ${title}`}</Preview>
      <Body style={{ background: '#0a0a0a', fontFamily: 'Inter, Arial, sans-serif', color: '#e5e5e5' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
          <Section style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 24 }}>
            <Text style={{ fontSize: 12, letterSpacing: 2, color: '#9bd34b', margin: 0, textTransform: 'uppercase' }}>
              UWAZI Security Command Center
            </Text>
            <Heading style={{ color: '#fff', fontSize: 22, margin: '12px 0 4px' }}>{label}</Heading>
            <Text style={{ color: '#fff', fontSize: 18, margin: '8px 0 16px', fontWeight: 600 }}>{title}</Text>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 0', color: '#9ca3af', width: 110 }}>Severity</td>
                  <td style={{ padding: '6px 0', color: sevColor, fontWeight: 600, textTransform: 'uppercase' }}>{severity}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#9ca3af' }}>Status</td>
                  <td style={{ padding: '6px 0', color: '#fff', textTransform: 'capitalize' }}>{status}</td>
                </tr>
                {detectedAt && (
                  <tr>
                    <td style={{ padding: '6px 0', color: '#9ca3af' }}>Detected</td>
                    <td style={{ padding: '6px 0', color: '#fff' }}>{new Date(detectedAt).toLocaleString()}</td>
                  </tr>
                )}
                {resolvedAt && (
                  <tr>
                    <td style={{ padding: '6px 0', color: '#9ca3af' }}>Resolved</td>
                    <td style={{ padding: '6px 0', color: '#fff' }}>{new Date(resolvedAt).toLocaleString()}</td>
                  </tr>
                )}
                {actor && (
                  <tr>
                    <td style={{ padding: '6px 0', color: '#9ca3af' }}>By</td>
                    <td style={{ padding: '6px 0', color: '#fff' }}>{actor}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {description && (
              <Section style={{ marginTop: 16, padding: 12, background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 8 }}>
                <Text style={{ color: '#d4d4d4', fontSize: 13, whiteSpace: 'pre-wrap', margin: 0 }}>{description}</Text>
              </Section>
            )}

            <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 24 }}>
              View and manage incidents in the Security Command Center at /app/admin/security.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  displayName: 'Security Incident Notification',
  component: SecurityIncidentEmail,
  to: 'Myke@uwazi.ai',
  subject: (data: Props) =>
    `[UWAZI Security] ${ACTION_LABEL[data.action ?? 'logged'] ?? 'Incident Update'}: ${data.title ?? 'Untitled'}`,
  previewData: {
    action: 'logged',
    title: 'Suspicious admin login from new IP',
    severity: 'high',
    status: 'open',
    description: 'Multiple failed login attempts followed by a successful login from an unrecognized IP.',
    detectedAt: new Date().toISOString(),
    actor: 'admin@uwazi.ai',
  },
} satisfies TemplateEntry
