import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import PagePlaceholder from './components/ui/PagePlaceholder'
import Landing from './pages/Landing'
import RoleSelect from './pages/RoleSelect'
import Login from './pages/Login'
import EmergencyAccess from './pages/EmergencyAccess'
import { navByRole, Role } from './lib/navConfig'
import { AuthProvider } from './lib/AuthContext'
import ProtectedRoute from './lib/ProtectedRoute'
import VideoBackground from './components/ui/VideoBackground'

// Custom-built showcase pages
import PatientOverview from './pages/patient/Overview'
import PatientTimeline from './pages/patient/Timeline'
import PatientRecords from './pages/patient/Records'
import PatientMedications from './pages/patient/Medications'
import PatientEmergencyCard from './pages/patient/EmergencyCard'
import PatientAnalytics from './pages/patient/Analytics'
import PatientLanguage from './pages/patient/Language'

import DoctorHome from './pages/doctor/DoctorHome'
import DoctorAISummary from './pages/doctor/AISummary'
import HospitalHome from './pages/hospital/HospitalHome'
import DoctorManagement from './pages/hospital/DoctorManagement'
import Departments from './pages/hospital/Departments'

const overrides: Partial<Record<string, JSX.Element>> = {
  '/patient': <PatientOverview />,
  '/patient/timeline': <PatientTimeline />,
  '/patient/records': <PatientRecords />,
  '/patient/medications': <PatientMedications />,
  '/patient/emergency-card': <PatientEmergencyCard />,
  '/patient/analytics': <PatientAnalytics />,
  '/patient/language': <PatientLanguage />,
  '/doctor': <DoctorHome />,
  '/doctor/ai-summary': <DoctorAISummary />,
  '/hospital': <HospitalHome />,
  '/hospital/doctors': <DoctorManagement />,
  '/hospital/departments': <Departments />,
}

function roleRoutes(role: Role) {
  return navByRole[role].map((item) => {
    const isIndex = item.path === `/${role}`
    const element = overrides[item.path] ?? (
      <PagePlaceholder
        title={item.label}
        description={`Placeholder for the ${item.label} module — build this out per the Health-One feature spec.`}
        owner={item.owner}
        icon={item.icon}
        checklist={['Wire up API endpoint', 'Connect to shared DB schema', 'Replace placeholder UI', 'Add loading & empty states']}
      />
    )
    return isIndex ? (
      <Route key={item.path} index element={element} />
    ) : (
      <Route key={item.path} path={item.path.replace(`/${role}/`, '')} element={element} />
    )
  })
}

export default function App() {
  return (
    <AuthProvider>
      <VideoBackground src="/media/hero-bg.mp4" poster="/media/hero-bg-poster.jpg" />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<RoleSelect />} />
        <Route path="/login/:role" element={<Login />} />
        <Route path="/emergency/:patientId" element={<EmergencyAccess />} />

        <Route
          path="/patient"
          element={<ProtectedRoute role="patient"><DashboardLayout role="patient" /></ProtectedRoute>}
        >
          {roleRoutes('patient')}
        </Route>
        <Route
          path="/doctor"
          element={<ProtectedRoute role="doctor"><DashboardLayout role="doctor" /></ProtectedRoute>}
        >
          {roleRoutes('doctor')}
        </Route>
        <Route
          path="/hospital"
          element={<ProtectedRoute role="hospital"><DashboardLayout role="hospital" /></ProtectedRoute>}
        >
          {roleRoutes('hospital')}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
