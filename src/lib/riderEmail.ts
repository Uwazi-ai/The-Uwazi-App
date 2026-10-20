import { z } from 'zod';
export const riderEmailSchema = z.string().trim().toLowerCase().max(254).refine(v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email address.');
export const RIGHTS_LEGAL_NOTE = 'This is voting rights information, not legal advice.';