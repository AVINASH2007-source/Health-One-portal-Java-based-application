import {
  LayoutDashboard, Activity, FileText, Pill, ShieldAlert, LineChart,
  Search, Stethoscope, Sparkles, ClipboardPlus, History, Building2,
  UserCog, ScrollText, Languages, CalendarCheck,
} from 'lucide-react'

export type Role = 'patient' | 'doctor' | 'hospital'

export const roles: { key: Role; label: string }[] = [
  { key: 'patient', label: 'Patient' },
  { key: 'doctor', label: 'Doctor' },
  { key: 'hospital', label: 'Hospital' },
]

// Scoped to features that are realistically buildable for this project —
// no ABHA/FHIR interop, insurance claims, blockchain, real wearable sync,
// or biometric identity verification. See /areas/health-one.md for the
// full reasoning behind what was cut.
export const navByRole: Record<Role, { label: string; path: string; icon: any; owner?: string }[]> = {
  patient: [
    { label: 'Overview', path: '/patient', icon: LayoutDashboard, owner: 'Member 1' },
    { label: 'Medical Timeline', path: '/patient/timeline', icon: Activity, owner: 'Member 1' },
    { label: 'Records', path: '/patient/records', icon: FileText, owner: 'Member 1' },
    { label: 'Medications', path: '/patient/medications', icon: Pill, owner: 'Member 1' },
    { label: 'Emergency Card', path: '/patient/emergency-card', icon: ShieldAlert, owner: 'Member 1' },
    { label: 'Health Analytics', path: '/patient/analytics', icon: LineChart, owner: 'Member 1' },
    { label: 'Language', path: '/patient/language', icon: Languages, owner: 'Member 1' },
  ],
  doctor: [
    { label: 'Patient Search', path: '/doctor', icon: Search, owner: 'Member 2' },
    { label: 'Patient Timeline', path: '/doctor/patient-timeline', icon: Stethoscope, owner: 'Member 2' },
    { label: 'Appointments', path: '/doctor/appointments', icon: CalendarCheck, owner: 'Member 2' },
    { label: 'New Entry', path: '/doctor/new-entry', icon: ClipboardPlus, owner: 'Member 2' },
    { label: 'Emergency Access Log', path: '/doctor/emergency-log', icon: History, owner: 'Member 2' },
  ],
  hospital: [
    { label: 'Overview', path: '/hospital', icon: LayoutDashboard, owner: 'Member 3' },
    { label: 'Doctor Management', path: '/hospital/doctors', icon: UserCog, owner: 'Member 3' },
    { label: 'Departments', path: '/hospital/departments', icon: Building2, owner: 'Member 3' },
    { label: 'Audit Logs', path: '/hospital/audit-logs', icon: ScrollText, owner: 'Member 3' },
  ],
}
