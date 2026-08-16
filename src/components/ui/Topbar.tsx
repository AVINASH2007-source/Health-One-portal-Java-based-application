import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Search,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  Mail,
  Key,
  CheckCircle2,
  FileText,
  Clock,
  Check,
} from 'lucide-react'
import { Role } from '../../lib/navConfig'
import { getRoleTheme } from '../../lib/roleTheme'
import { useAuth } from '../../lib/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type NotificationItem = {
  id: string
  title: string
  description: string
  time: string
  type: 'appointment' | 'emergency' | 'ocr' | 'system'
  link?: string
}

export default function Topbar({
  role,
  onMenuToggle,
}: {
  role: Role
  onMenuToggle?: () => void
}) {
  const navigate = useNavigate()
  const { user, profile, name, logout } = useAuth()
  const theme = getRoleTheme(role)

  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Fetch real notifications from Supabase
  useEffect(() => {
    let active = true

    const fetchNotifications = async () => {
      if (!user?.id) return

      try {
        const notifList: NotificationItem[] = []

        if (role === 'doctor') {
          // 1. Doctor: Check pending appointment requests
          const { data: appts } = await supabase
            .from('appointments')
            .select('id, time, reason, created_at, profiles:patient_id (name)')
            .eq('doctor_id', user.id)
            .eq('status', 'pending')

          if (appts && appts.length > 0) {
            appts.forEach((a: any) => {
              notifList.push({
                id: a.id,
                title: `New Appointment Request`,
                description: `${a.profiles?.name || 'Patient'} requested: "${a.reason}"`,
                time: new Date(a.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'appointment',
                link: '/doctor/appointments',
              })
            })
          }

          // 2. Doctor: Check emergency access logs
          const { data: emLogs } = await supabase
            .from('emergency_access_log')
            .select('id, access_reason, created_at, profiles:patient_id (name)')
            .order('created_at', { ascending: false })
            .limit(3)

          if (emLogs && emLogs.length > 0) {
            emLogs.forEach((l: any) => {
              notifList.push({
                id: l.id,
                title: `Emergency Access Logged`,
                description: `Reason: ${l.access_reason} (${l.profiles?.name || 'Patient'})`,
                time: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'emergency',
                link: '/doctor/emergency-log',
              })
            })
          }
        } else if (role === 'patient') {
          // Patient default notifications
          notifList.push(
            {
              id: 'n1',
              title: 'Appointment Request Confirmed',
              description: 'Dr. R. Kumar confirmed your Cardiology consultation.',
              time: '2 min ago',
              type: 'appointment',
              link: '/patient/appointments',
            },
            {
              id: 'n2',
              title: 'Tesseract OCR Document Parsed',
              description: 'Extracted Blood Pressure (128/82 mmHg), Pulse (78 bpm).',
              time: '18 min ago',
              type: 'ocr',
              link: '/patient/records',
            },
            {
              id: 'n3',
              title: 'Emergency Access Audit',
              description: 'Emergency Card access was logged by ER Paramedic dispatch.',
              time: '1 hr ago',
              type: 'emergency',
              link: '/patient/emergency-card',
            }
          )
        }

        if (active) {
          setNotifications(notifList)
          setUnreadCount(notifList.length)
        }
      } catch (err) {
        console.error('Error fetching notifications:', err)
      }
    }

    fetchNotifications()
    return () => { active = false }
  }, [user?.id, role])

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{
    patients: { id: string; name: string; email: string }[]
    records: { id: string; title: string; patient_id: string; record_type: string }[]
  }>({ patients: [], records: [] })
  const [searching, setSearching] = useState(false)

  // Real-time Global Search Effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ patients: [], records: [] })
      setSearching(false)
      return
    }

    let active = true
    const doSearch = async () => {
      setSearching(true)
      try {
        const query = searchQuery.trim()

        const [{ data: pData }, { data: rData }] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, name, email')
            .eq('role', 'patient')
            .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(5),
          supabase
            .from('records')
            .select('id, title, patient_id, record_type')
            .ilike('title', `%${query}%`)
            .limit(5),
        ])

        if (active) {
          setSearchResults({
            patients: pData || [],
            records: rData || [],
          })
        }
      } catch (err) {
        console.error('Global search error:', err)
      } finally {
        if (active) setSearching(false)
      }
    }

    const timer = setTimeout(doSearch, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [searchQuery])

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = (link?: string) => {
    setShowNotifications(false)
    if (link) navigate(link)
  }

  const userEmail = profile?.email || user?.email || 'user@healthone.com'
  const displayName = name ? (role === 'doctor' && !name.startsWith('Dr.') ? `Dr. ${name}` : name) : 'Healthcare User'

  return (
    <header className="glass sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-edge px-3 sm:px-6 py-3">
      {/* Mobile Hamburger Menu Button */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-edge text-mist hover:text-ink md:hidden cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Global Live Search Bar */}
      <div className="relative flex-1 min-w-0" ref={searchRef}>
        <div className="flex items-center gap-2 rounded-xl border border-edge bg-panel2/60 px-3 py-2 text-mist focus-within:border-vital/50 focus-within:bg-panel2 transition-all">
          <Search size={16} className="shrink-0 text-vital" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patients, medical records, reports…"
            className="w-full bg-transparent text-xs sm:text-sm text-ink placeholder:text-mist focus:outline-none"
          />
          {searching && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-vital border-t-transparent shrink-0" />}
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-mist hover:text-ink shrink-0">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Global Live Search Overlay Dropdown */}
        <AnimatePresence>
          {searchQuery.trim() !== '' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="absolute left-0 right-0 top-12 z-50 max-h-96 overflow-y-auto rounded-2xl border border-edge bg-panel p-3 shadow-2xl backdrop-blur-xl space-y-3"
            >
              {searchResults.patients.length === 0 && searchResults.records.length === 0 && !searching ? (
                <div className="py-6 text-center text-xs text-mist space-y-1">
                  <p className="font-semibold text-ink">No matching results found for "{searchQuery}"</p>
                  <p>Try searching by patient name, email, or record title.</p>
                </div>
              ) : (
                <>
                  {searchResults.patients.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-mist px-1">
                        Patients ({searchResults.patients.length})
                      </p>
                      {searchResults.patients.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSearchQuery('')
                            if (role === 'doctor') {
                              navigate(`/doctor/patient-timeline?patientId=${p.id}`)
                            } else {
                              navigate(`/patient/timeline`)
                            }
                          }}
                          className="flex items-center justify-between rounded-xl border border-edge/60 bg-panel2/60 p-2.5 hover:border-vital/40 hover:bg-panel2 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-7 w-7 place-items-center rounded-full bg-vital-soft text-vital text-xs font-bold">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-ink">{p.name}</p>
                              <p className="text-[10px] text-mist">{p.email}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-vital flex items-center gap-1">
                            View <ChevronRight size={12} />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.records.length > 0 && (
                    <div className="space-y-1.5 border-t border-edge/60 pt-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-mist px-1">
                        Medical Records ({searchResults.records.length})
                      </p>
                      {searchResults.records.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => {
                            setSearchQuery('')
                            if (role === 'doctor') {
                              navigate(`/doctor/patient-timeline?patientId=${r.patient_id}`)
                            } else {
                              navigate(`/patient/records`)
                            }
                          }}
                          className="flex items-center justify-between rounded-xl border border-edge/60 bg-panel2/60 p-2.5 hover:border-vital/40 hover:bg-panel2 cursor-pointer transition-colors"
                        >
                          <div>
                            <p className="text-xs font-semibold text-ink">{r.title}</p>
                            <span className="text-[10px] text-mist uppercase tracking-wide">{r.record_type}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-vital flex items-center gap-1">
                            View <ChevronRight size={12} />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Role Portal Badge */}
      <div
        className="hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium lg:flex shrink-0"
        style={{ borderColor: `${theme.accent}33`, backgroundColor: `${theme.accent}0D`, color: theme.accent }}
      >
        <theme.icon size={15} />
        {theme.label} portal
      </div>

      {/* Patient Emergency Shortcut */}
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

      {/* Interactive Notification Bell */}
      <div className="relative shrink-0" ref={notifRef}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            setShowNotifications(!showNotifications)
            setShowProfile(false)
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
              transition={{ repeat: Infinity, duration: 1.8 }}
              className="absolute -right-1 -top-1 grid h-4 min-w-[16px] px-1 place-items-center rounded-full bg-vital text-[10px] font-bold text-void shadow-glow"
            >
              {unreadCount}
            </motion.span>
          )}
        </motion.button>

        {/* Notifications Dropdown Popover */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-edge bg-panel p-4 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-edge pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-vital" />
                  <span className="font-display text-sm font-semibold text-ink">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-vital-soft px-2 py-0.5 text-[10px] font-semibold text-vital">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => setUnreadCount(0)}
                    className="text-[11px] text-mist hover:text-ink transition-colors cursor-pointer"
                  >
                    Clear badge
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-mist space-y-1">
                  <Bell size={24} className="mx-auto text-mist/40 mb-2" />
                  <p className="font-semibold text-ink">No new notifications</p>
                  <p>All appointment requests and logs are up to date.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item.link)}
                      className="flex items-start gap-3 rounded-xl border border-edge/60 bg-panel2/60 p-3 hover:border-vital/40 hover:bg-panel2 cursor-pointer transition-all"
                    >
                      <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                        item.type === 'appointment'
                          ? 'bg-vital-soft text-vital'
                          : item.type === 'emergency'
                          ? 'bg-emergency-soft text-emergency'
                          : item.type === 'ocr'
                          ? 'bg-ai-soft text-ai'
                          : 'bg-panel2 text-mist'
                      }`}>
                        {item.type === 'appointment' ? <Calendar size={15} /> : item.type === 'emergency' ? <AlertTriangle size={15} /> : <FileText size={15} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-ink truncate">{item.title}</p>
                          <span className="text-[10px] text-mist shrink-0">{item.time}</span>
                        </div>
                        <p className="text-[11px] text-mist leading-relaxed mt-0.5 line-clamp-2">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Interactive Profile Popover Avatar */}
      <div className="relative shrink-0" ref={profileRef}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            setShowProfile(!showProfile)
            setShowNotifications(false)
          }}
          className="flex items-center gap-2 rounded-xl border border-edge p-1 hover:border-vital/40 transition-colors cursor-pointer"
          title="Account Profile"
        >
          <div
            className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${theme.accent}, #22D3EE)` }}
          >
            {name ? name.slice(0, 1).toUpperCase() : 'U'}
          </div>
        </motion.button>

        {/* Profile Card Popover */}
        <AnimatePresence>
          {showProfile && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-edge bg-panel p-4 shadow-2xl backdrop-blur-xl space-y-4"
            >
              {/* Profile Card Header */}
              <div className="flex items-center gap-3 border-b border-edge/60 pb-3">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-base font-bold text-white shadow-md"
                  style={{ background: `linear-gradient(135deg, ${theme.accent}, #22D3EE)` }}
                >
                  {name ? name.slice(0, 1).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm font-bold text-ink truncate">{displayName}</h3>
                  <p className="text-xs text-mist flex items-center gap-1 truncate mt-0.5">
                    <Mail size={12} className="shrink-0 text-vital" /> {userEmail}
                  </p>
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-vital-soft px-2.5 py-0.5 text-[10px] font-semibold text-vital">
                    <ShieldCheck size={11} /> {role.toUpperCase()} VERIFIED
                  </span>
                </div>
              </div>

              {/* Account Info Details */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between rounded-xl border border-edge/60 bg-panel2/60 p-2.5">
                  <span className="text-mist">Portal Role:</span>
                  <span className="font-semibold text-ink capitalize">{role} Portal</span>
                </div>

                {user?.id && (
                  <div className="flex items-center justify-between rounded-xl border border-edge/60 bg-panel2/60 p-2.5">
                    <span className="text-mist flex items-center gap-1">
                      <Key size={12} /> Account ID:
                    </span>
                    <span className="font-mono text-[11px] text-ink font-semibold">
                      {user.id.slice(0, 8)}…{user.id.slice(-4)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 border-t border-edge/60 pt-3">
                {role === 'doctor' && (
                  <button
                    onClick={() => {
                      setShowProfile(false)
                      navigate('/doctor/appointments')
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink hover:border-vital/40 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Calendar size={14} className="text-vital" /> Manage Appointments
                    </span>
                    <ChevronRight size={14} className="text-mist" />
                  </button>
                )}

                {role === 'patient' && (
                  <button
                    onClick={() => {
                      setShowProfile(false)
                      navigate('/patient/appointments')
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink hover:border-vital/40 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Calendar size={14} className="text-vital" /> My Appointments
                    </span>
                    <ChevronRight size={14} className="text-mist" />
                  </button>
                )}

                <button
                  onClick={async () => {
                    setShowProfile(false)
                    await logout()
                    navigate('/')
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-emergency/30 bg-emergency-soft py-2 text-xs font-semibold text-emergency hover:bg-emergency/20 transition-all cursor-pointer"
                >
                  <LogOut size={14} /> Log Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Logout Shortcut */}
      <button
        onClick={async () => {
          await logout()
          navigate('/')
        }}
        className="grid h-9 w-9 place-items-center rounded-xl border border-edge text-mist hover:text-ink cursor-pointer shrink-0"
        title="Log out"
      >
        <LogOut size={15} />
      </button>
    </header>
  )
}
