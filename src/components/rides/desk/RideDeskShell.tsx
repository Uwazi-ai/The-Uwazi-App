import { Outlet } from 'react-router-dom';
import { RidesAppShell } from '@/components/rides/RidesAppShell';

// Every desk subroute shares app navigation without altering rider shells.
export function RideDeskShell() {
  return <RidesAppShell><Outlet /></RidesAppShell>;
}