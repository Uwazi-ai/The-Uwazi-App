/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

// State only. Never include an address or email in this alert.
interface Props { state?: string; link?: string }

const BallotHelpAlert: React.FC<Props> = ({ state = 'a state', link = 'https://uwaziapp.uwazi.ai/app/admin/ballot-help' }) => (
  <Html>
    <Head />
    <Preview>{`New ballot help request: ${state}`}</Preview>
    <Body style={{ background: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#111' }}>
      <Container style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
        <Section>
          <Heading style={{ fontSize: 22, margin: '0 0 8px' }}>Someone needs help finding their ballot</Heading>
          <Text>State: {state}</Text>
          <Text>Open the queue to see the request and reply.</Text>
          <Link href={link} style={{ background: '#9bd34b', color: '#080808', padding: '10px 16px', borderRadius: 8, fontWeight: 600 }}>
            Open ballot help queue
          </Link>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BallotHelpAlert,
  to: 'myke@uwazi.ai',
  subject: (d: Props) => `UWAZI ballot help: ${d.state ?? 'new request'}`,
  displayName: 'Ballot help request',
  previewData: { state: 'TX' },
} satisfies TemplateEntry
