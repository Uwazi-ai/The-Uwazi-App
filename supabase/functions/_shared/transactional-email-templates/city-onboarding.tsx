/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

interface SourceLine { label: string; url: string; pulled: string }
interface Props {
  city?: string
  status?: 'proposed' | 'needs_human'
  askedCount?: number
  sources?: SourceLine[]
  boundary?: string
  notOfficial?: string[]
  link?: string
}

const CityOnboardingEmail: React.FC<Props> = ({
  city = 'A new city', status = 'proposed', askedCount = 1, sources = [], boundary, notOfficial = [],
  link = 'https://uwaziapp.uwazi.ai/app/admin/office-health',
}) => (
  <Html>
    <Head />
    <Preview>{`${city} is waiting for your review`}</Preview>
    <Body style={{ background: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#111' }}>
      <Container style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
        <Section>
          <Heading style={{ fontSize: 22, margin: '0 0 8px' }}>{city} is waiting for your review</Heading>
          <Text>{askedCount} {askedCount === 1 ? 'person has' : 'people have'} asked for this city.</Text>
          <Text>
            {status === 'proposed'
              ? 'We found official pages. Nothing is turned on yet.'
              : 'We did not find any official pages. A person needs to look.'}
          </Text>
          {sources.map((s) => (
            <Text key={s.url} style={{ margin: '8px 0' }}>
              <strong>{s.label}</strong><br />
              <Link href={s.url}>{s.url}</Link><br />
              First check: {s.pulled}
            </Text>
          ))}
          {boundary && <Text>District map: {boundary}</Text>}
          {notOfficial.length > 0 && (
            <Text>Found but not official. A person needs to confirm these: {notOfficial.join(', ')}</Text>
          )}
          <Text>Next step: open Office Data Health and review this city.</Text>
          <Link href={link} style={{ background: '#9bd34b', color: '#080808', padding: '10px 16px', borderRadius: 8, fontWeight: 600 }}>
            Review {city}
          </Link>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CityOnboardingEmail,
  subject: (d: Props) => `New city waiting for review: ${d.city ?? 'a city'}`,
  displayName: 'New city waiting for review',
  previewData: { city: 'Independence', askedCount: 1, sources: [{ label: 'City council', url: 'https://www.independencemo.gov', pulled: '5 offices' }] },
} satisfies TemplateEntry
