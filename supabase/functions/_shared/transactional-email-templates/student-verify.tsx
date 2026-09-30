/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

interface Props { link?: string }

const StudentVerifyEmail: React.FC<Props> = ({ link = 'https://uwaziapp.uwazi.ai/app/upgrade' }) => (
  <Html>
    <Head />
    <Preview>Confirm your school email for UWAZI Plus Student</Preview>
    <Body style={{ background: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#111' }}>
      <Container style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
        <Section>
          <Heading style={{ fontSize: 22, margin: '0 0 8px' }}>Confirm you are a student</Heading>
          <Text>Tap the button to confirm this school email. Then you can get UWAZI Plus for $7.99 a month.</Text>
          <Text>This link works for 24 hours.</Text>
          <Link href={link} style={{ background: '#9bd34b', color: '#080808', padding: '10px 16px', borderRadius: 8, fontWeight: 600 }}>
            Confirm my school email
          </Link>
          <Text style={{ color: '#666', fontSize: 12, marginTop: 24 }}>If you did not ask for this, you can ignore this email.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: StudentVerifyEmail,
  subject: 'Confirm your school email for UWAZI Plus',
  displayName: 'Student email check',
  previewData: { link: 'https://uwaziapp.uwazi.ai/app/student/confirm?token=example' },
} satisfies TemplateEntry
