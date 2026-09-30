/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

interface Props { checkName?: string; message?: string; lastSeen?: string; link?: string }

const PlatformHealthAlert: React.FC<Props> = ({
  checkName = 'A health check', message = 'Something needs a look.', lastSeen = 'Never',
  link = 'https://uwaziapp.uwazi.ai/app/admin',
}) => (
  <Html>
    <Head />
    <Preview>{`UWAZI health alert: ${checkName}`}</Preview>
    <Body style={{ background: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#111' }}>
      <Container style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
        <Section>
          <Heading style={{ fontSize: 22, margin: '0 0 8px' }}>{checkName} needs a look</Heading>
          <Text>{message}</Text>
          <Text>Last time it worked: {lastSeen}</Text>
          <Text>We send this alert at most once a day for each check.</Text>
          <Text>Next step: open the Super Admin Dashboard and look at Platform health.</Text>
          <Link href={link} style={{ background: '#9bd34b', color: '#080808', padding: '10px 16px', borderRadius: 8, fontWeight: 600 }}>
            Open Platform health
          </Link>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PlatformHealthAlert,
  subject: (d: Props) => `UWAZI health alert: ${d.checkName ?? 'a check failed'}`,
  displayName: 'Platform health alert',
  previewData: { checkName: 'Nightly backup', message: 'The nightly backup has not run in the last 30 hours.', lastSeen: 'Sep 28, 3:00 AM Central' },
} satisfies TemplateEntry
