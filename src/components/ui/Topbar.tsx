import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Search,
  ShieldAlert,
  LogOut,
  Menu,
  User,
  Mail,
  CheckCircle2,
  Clock,
  ExternalLink,
  Droplet,
  Calendar,
  ShieldCheck,
  Check,
  ChevronDown,
  X,
  FileText,
  Pill,
  Activity,
  LineChart,
} from 'lucide-react'
import { Role } from '../../lib/navConfig'
import { getRoleTheme } from '../../lib/roleTheme'
import { useAuth } from '../../lib/AuthContext'
import { useNavigate } from 'react-router-dom'

interface NotificationItem {
  id: string
  title: string
  message: string
  time: string
  type: 'appointment' | 'ocr' | 'emergency' | 'medication'
  read: boolean
  link?: string
}

interface SearchResultItem {
  id: string
  title: string
  subtitle: string
  category: 'records' | 'medications' | 'appointments' | 'timeline' | 'analytics' | 'emergency'
  path: string
  icon: any
}

const SEARCH_DATABASE: SearchResultItem[] = [
  {
    id: 's1',
    title: 'Metformin 500 mg',
    subtitle: 'Active Prescription · Twice Daily with meals',
    category: 'medications',
    path: '/patient/medications',
    icon: Pill,
  },
  {
    id: 's2',
    title: 'Telmisartan 40 mg',
    subtitle: 'Active Medication · Once Daily Morning',
    category: 'medications',
    path: '/patient/medications',
    icon: Pill,
  },
  {
    id: 's3',
    title: 'Cardiology Consultation & ECG Review',
    subtitle: 'Doctor Visit · Dr. R. Kumar (Apollo Hospitals)',
    category: 'timeline',
    path: '/patient/timeline',
    icon: Activity,
  },
  {
    id: 's4',
    title: 'Complete Blood Count (CBC) Lab Report',
    subtitle: 'Uploaded Document · Tesseract OCR Parsed',
    category: 'records',
    path: '/patient/records',
    icon: FileText,
  },
  {
    id: 's5',
    title: 'Appointment Request — Dr. R. Kumar',
    subtitle: 'Confirmed Visit · Aug 18 at 10:30 AM',
    category: 'appointments',
    path: '/patient/appointments',
    icon: Calendar,
  },
  {
    id: 's6',
    title: 'Emergency Medical Card (PULSEX-AVS-001)',
    subtitle: 'Blood Group O+ · Severe Penicillin Allergy',
    category: 'emergency',
    path: '/patient/emergency-card',
    icon: ShieldAlert,
  },
  {
    id: 's7',
    title: 'Blood Pressure & Heart Rate Trends',
    subtitle: 'Health Analytics · 128/82 mmHg Average',
    category: 'analytics',
    path: '/patient/analytics',
    icon: LineChart,
  },
  {
    id: 's8',
    title: 'Appendectomy Surgical Record',
    subtitle: 'Surgical History · Dr. S. Ramesh',
    category: 'records',
    path: '/patient/records',
    icon: FileText,
  },
]

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Appointment Request Confirmed',
    message: 'Dr. R. Kumar confirmed your Cardiology consultation for Aug 18 at 10:30 AM.',
    time: '2 min ago',
    type: 'appointment',
    read: false,
    link: '/patient/appointments',
  },
  {
    id: 'n2',
    title: 'Tesseract OCR Document Parsed',
    message: 'Extracted Blood Pressure (128/82 mmHg), Pulse (78 bpm), and 2 prescriptions from uploaded file.',
    time: '18 min ago',
    type: 'ocr',
    read: false,
    link: '/patient/records',
  },
  {
    id: 'n3',
    title: 'Emergency Access Audit',
    message: 'Emergency Card access was logged by ER Paramedic dispatch.',
    time: '1 hr ago',
    type: 'emergency',
    read: false,
    link: '/patient/emergency-card',
  },
  {
    id: 'n4',
    title: 'Medication Schedule Reminder',
    message: 'Metformin 500 mg dose scheduled for 08:00 PM tonight.',
    time: '3 hrs ago',
    type: 'medication',
    read: true,
    link: '/patient/medications',
  },
]

export default function Topbar({
  role,
  onOpenMobileMenu,
}: {
  role: Role
  onOpenMobileMenu?: () => void
}) {
  const navigate = useNavigate()
  const { session, name, logout } = useAuth()
  const theme = getRoleTheme(role)

  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Popover States
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)

  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Filter search results dynamically based on input query
  const searchResults = searchQuery.trim()
    ? SEARCH_DATABASE.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)))
    setShowNotifications(false)
    if (item.link) {
      navigate(item.link)
    }
  }

  const handleSelectSearchResult = (result: SearchResultItem) => {
    setSearchQuery('')
    setIsSearchOpen(false)
    navigate(result.path)
  }

  const userEmail = session?.user?.email || 'patient@healthone.com'
  const patientCode = 'PULSEX-AVS-001'

  return (
    <header className="glass sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-edge px-3 py-3 sm:px-6">
      {/* Mobile Hamburger Button */}
      <button
        onClick={onOpenMobileMenu}
        className="grid h-9 w-9 place-items-center rounded-xl border border-edge text-mist hover:text-ink md:hidden shrink-0 cursor-pointer"
        title="Open Navigation Menu"
      >
        <Menu size={18} />
      </button>

      {/* Global Interactive Search Bar */}
      <div className="relative flex-1 min-w-0" ref={searchRef}>
        <div className="flex items-center gap-2 rounded-xl border border-edge bg-panel2/60 px-3 py-2 text-mist focus-within:border-vital focus-within:ring-1 focus-within:ring-vital/30 transition-all">
          <Search size={16} className="shrink-0 text-vital" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsSearchOpen(true)
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search medications, lab reports, doctor visits, appointments..."
            className="w-full bg-transparent text-xs sm:text-sm text-ink placeholder:text-mist focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setIsSearchOpen(false)
              }}
              className="text-mist hover:text-ink shrink-0 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Live Search Results Overlay Box */}
        <AnimatePresence>
          {isSearchOpen && searchQuery.trim() !== '' && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-12 z-50 rounded-2xl border border-edge bg-panel p-3 shadow-2xl space-y-2 max-h-80 overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-edge/60 pb-2 px-1">
                <span className="text-[11px] font-semibold text-mist uppercase tracking-wider">
                  Search Results ({searchResults.length})
                </span>
                <span className="text-[10px] text-mist">Press Esc to close</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-mist">
                  No matching records or medical files found for "{searchQuery}".
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => handleSelectSearchResult(res)}
                      className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-panel2 border border-transparent hover:border-edge transition-all cursor-pointer group"
                    >
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-vital-soft text-vital group-hover:scale-105 transition-transform">
                        <res.icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink group-hover:text-vital transition-colors truncate">
                          {res.title}
                        </p>
                        <p className="text-[11px] text-mist truncate">{res.subtitle}</p>
                      </div>
                      <span className="rounded-full bg-panel2 border border-edge/60 px-2 py-0.5 text-[10px] font-semibold text-mist capitalize shrink-0">
                        {res.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Portal Badge (Desktop) */}
      <div
        className="hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium lg:flex shrink-0"
        style={{ borderColor: `${theme.accent}33`, backgroundColor: `${theme.accent}0D`, color: theme.accent }}
      >
        <theme.icon size={15} />
        {theme.label} portal
      </div>

      {/* Emergency Card Link */}
      {role === 'patient' && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/patient/emergency-card')}
          className="flex items-center gap-1.5 rounded-xl border border-emergency/30 bg-emergency-soft px-2.5 py-2 sm:px-3 text-xs font-semibold text-emergency shrink-0 cursor-pointer"
        >
          <ShieldAlert size={15} />
          <span className="hidden sm:inline">Emergency</span>
        </motion.button>
      )}

      {/* 🔔 Interactive Notification Bell & Popover */}
      <div className="relative shrink-0" ref={notifRef}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setShowNotifications((v) => !v)
            setShowProfileMenu(false)
          }}
          className={`relative grid h-9 w-9 place-items-center rounded-xl border transition-colors cursor-pointer ${
            showNotifications ? 'border-vital bg-vital-soft text-vital' : 'border-edge text-mist hover:text-ink'
          }`}
          title="Notifications"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <motion.span
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-vital text-[10px] font-bold text-void shadow-glow"
            >
              {unreadCount}
            </motion.span>
          )}
        </motion.button>

        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-edge bg-panel p-4 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-edge pb-2.5">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-vital" />
                  <h3 className="text-xs font-semibold text-ink">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-vital-soft px-2 py-0.5 text-[10px] font-bold text-vital">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] text-vital hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Check size={12} /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`group flex items-start gap-2.5 rounded-xl border p-2.5 transition-all cursor-pointer ${
                      item.read
                        ? 'border-edge/50 bg-panel2/30 opacity-75 hover:opacity-100'
                        : 'border-vital/30 bg-vital-soft/20 shadow-sm'
                    }`}
                  >
                    <div
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs mt-0.5 ${
                        item.type === 'appointment'
                          ? 'bg-vital-soft text-vital'
                          : item.type === 'ocr'
                          ? 'bg-ai-soft text-ai'
                          : item.type === 'emergency'
                          ? 'bg-emergency-soft text-emergency'
                          : 'bg-panel2 text-mist'
                      }`}
                    >
                      {item.type === 'appointment' && <Calendar size={14} />}
                      {item.type === 'ocr' && <CheckCircle2 size={14} />}
                      {item.type === 'emergency' && <ShieldAlert size={14} />}
                      {item.type === 'medication' && <Clock size={14} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-ink truncate">{item.title}</p>
                        <span className="text-[10px] text-mist shrink-0">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-mist mt-0.5 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 👤 Aligned Profile Avatar & Dropdown Menu */}
      <div className="relative shrink-0" ref={profileRef}>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowProfileMenu((v) => !v)
            setShowNotifications(false)
          }}
          className={`flex items-center gap-1.5 rounded-full border-2 p-0.5 transition-all cursor-pointer ${
            showProfileMenu ? 'border-vital bg-vital-soft' : 'border-vital/40 hover:border-vital'
          }`}
          title="Profile Menu"
        >
          <div
            className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${theme.accent}, #22D3EE)` }}
          >
            {name.slice(0, 1).toUpperCase()}
          </div>
          <ChevronDown size={14} className={`text-mist transition-transform duration-200 ${showProfileMenu ? 'rotate-180 text-vital' : ''}`} />
        </motion.button>

        {/* Anchored Profile Dropdown Menu */}
        <AnimatePresence>
          {showProfileMenu && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-50 w-72 sm:w-80 rounded-2xl border border-edge bg-panel p-4 shadow-2xl space-y-3"
            >
              {/* Profile Card Banner */}
              <div className="flex items-center gap-3 border-b border-edge pb-3">
                <div
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-md"
                  style={{ background: `linear-gradient(135deg, ${theme.accent}, #22D3EE)` }}
                >
                  {name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm font-bold text-ink truncate">{name}</h3>
                  <span className="inline-block mt-0.5 rounded-full bg-vital-soft px-2 py-0.5 text-[10px] font-bold text-vital capitalize">
                    {role} Portal
                  </span>
                </div>
              </div>

              {/* Information List */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-panel2 p-2.5 border border-edge/60">
                  <div className="flex items-center gap-2 text-mist">
                    <Mail size={14} className="text-vital shrink-0" />
                    <span>Email ID</span>
                  </div>
                  <span className="font-mono text-ink font-medium truncate max-w-[140px] text-right" title={userEmail}>
                    {userEmail}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-panel2 p-2.5 border border-edge/60">
                  <div className="flex items-center gap-2 text-mist">
                    <User size={14} className="text-vital shrink-0" />
                    <span>Role</span>
                  </div>
                  <span className="font-semibold text-ink capitalize">{role}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-panel2 p-2.5 border border-edge/60">
                  <div className="flex items-center gap-2 text-mist">
                    <ShieldCheck size={14} className="text-vital shrink-0" />
                    <span>Emergency Code</span>
                  </div>
                  <span className="font-mono text-vital font-bold">{patientCode}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-panel2 p-2.5 border border-edge/60">
                  <div className="flex items-center gap-2 text-mist">
                    <Droplet size={14} className="text-emergency shrink-0" />
                    <span>Blood Group</span>
                  </div>
                  <span className="font-bold text-ink">O+</span>
                </div>
              </div>

              {/* Action Links & Logout Option */}
              <div className="space-y-1.5 border-t border-edge pt-3 text-xs">
                {role === 'patient' && (
                  <>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false)
                        navigate('/patient/emergency-card')
                      }}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-ink hover:bg-panel2 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <ShieldAlert size={15} className="text-emergency" /> Emergency Medical Card
                      </span>
                      <ExternalLink size={13} className="text-mist" />
                    </button>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false)
                        navigate('/patient/appointments')
                      }}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-ink hover:bg-panel2 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Calendar size={15} className="text-vital" /> My Appointments
                      </span>
                      <ExternalLink size={13} className="text-mist" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    setShowProfileMenu(false)
                    logout()
                    navigate('/')
                  }}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-emergency hover:bg-emergency-soft/50 font-semibold transition-colors cursor-pointer mt-1 border border-emergency/20"
                >
                  <span className="flex items-center gap-2">
                    <LogOut size={15} /> Log Out of Account
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
