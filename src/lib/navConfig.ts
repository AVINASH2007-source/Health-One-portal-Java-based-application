import {
  LayoutDashboard, Activity, FileText, Pill, LineChart, User,
  Search, Stethoscope, ClipboardPlus, History, CalendarPlus, CalendarCheck,
} from 'lucide-react'

export type Role = 'patient' | 'doctor'

export const roles: { key: Role; label: string }[] = [
  { key: 'patient', label: 'Patient' },
  { key: 'doctor', label: 'Doctor' },
]

export const navByRole: Record<Role, { label: string; path: string; icon: any; owner?: string }[]> = {
  patient: [
    { label: 'Overview', path: '/patient', icon: LayoutDashboard, owner: 'Member 1' },
    { label: 'Medical Timeline', path: '/patient/timeline', icon: Activity, owner: 'Member 1' },
    { label: 'Records', path: '/patient/records', icon: FileText, owner: 'Member 1' },
    { label: 'Medications', path: '/patient/medications', icon: Pill, owner: 'Member 1' },
    { label: 'Health Analytics', path: '/patient/analytics', icon: LineChart, owner: 'Member 1' },
    { label: 'Appointments', path: '/patient/appointments', icon: CalendarPlus, owner: 'Member 1' },
    { label: 'Profile & Emergency QR', path: '/patient/profile', icon: User, owner: 'Member 1' },
  ],
  doctor: [
    { label: 'Patient Search', path: '/doctor', icon: Search, owner: 'Member 2' },
    { label: 'Patient Timeline', path: '/doctor/patient-timeline', icon: Stethoscope, owner: 'Member 2' },
    { label: 'Appointments', path: '/doctor/appointments', icon: CalendarCheck, owner: 'Member 2' },
    { label: 'New Entry', path: '/doctor/new-entry', icon: ClipboardPlus, owner: 'Member 2' },
    { label: 'Emergency Access Log', path: '/doctor/emergency-log', icon: History, owner: 'Member 2' },
  ],
}
