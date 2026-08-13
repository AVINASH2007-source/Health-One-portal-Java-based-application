import { HeartPulse, Stethoscope, Building2 } from 'lucide-react'
import { Role } from './navConfig'

export type RoleTheme = {
  key: Role
  label: string
  short: string
  tagline: string
  description: string
  icon: any
  accent: string      // hex
  idLabel: string
}

export const roleThemes: RoleTheme[] = [
  {
    key: 'patient',
    label: 'Patient',
    short: 'Patient',
    tagline: 'Your lifetime health record, always with you.',
    description: 'View your timeline, medications, and emergency card, and control who can see your records.',
    icon: HeartPulse,
    accent: '#22D3EE',
    idLabel: 'Email or patient ID',
  },
  {
    key: 'doctor',
    label: 'Doctor',
    short: 'Doctor',
    tagline: 'Complete patient history, one search away.',
    description: 'Look up patients, review AI-generated summaries, and add visit notes in seconds.',
    icon: Stethoscope,
    accent: '#3B82F6',
    idLabel: 'Email or medical license ID',
  },
  {
    key: 'hospital',
    label: 'Hospital',
    short: 'Hospital',
    tagline: "Run your hospital's digital records with confidence.",
    description: 'Track admissions, departments, doctors, and audit every access to patient data.',
    icon: Building2,
    accent: '#38BDF8',
    idLabel: 'Work email',
  },
]

export const getRoleTheme = (key: string | undefined) =>
  roleThemes.find((r) => r.key === key) ?? roleThemes[0]
