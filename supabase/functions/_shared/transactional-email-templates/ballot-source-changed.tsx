/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

interface Props { sourceName?: string; link?: string }

const BallotSourceChanged: React.FC<Props> = ({
  sourceName = 'An official ballot source', link = 'https://uwaziapp.uwazi.ai/app/admin/ballot-crawler',
}) => (
  <Html>
    <Head />
    <Preview>{`Official ballot source changed: ${sourceName}`}</Preview>
    <Body style={{ background: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#111' }}>
      <Container style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
        <Section>
          <Heading style={{ fontSize: 22, margin: '0 0 8px' }}>An official ballot source changed</Heading>
          <Text>Source: {sourceName}</Text>
          <Text>The page content is different from the last check. Nothing in the app was changed.</Text>
          <Text>Please open the ballot crawler review and look at the new findings.</Text>
          <Link href={link} style={{ background: '#9bd34b', color: '#080808', padding: '10px 16px', borderRadius: 8, fontWeight: 600 }}>
            Open ballot review
          </Link>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BallotSourceChanged,
  to: 'myke@uwazi.ai',
  subject: (d: Props) => `UWAZI ballot source changed: ${d.sourceName ?? 'official source'}`,
  displayName: 'Ballot source changed',
  previewData: { sourceName: 'KCEB sample ballot, Nov 3, 2026' },
} satisfies TemplateEntry
