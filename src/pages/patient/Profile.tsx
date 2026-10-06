import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Mail,
  ShieldCheck,
  Key,
  QrCode,
  Droplet,
  Phone,
  ShieldAlert,
  HeartPulse,
  Pill,
  Download,
  Smartphone,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Copy,
  Printer,
  Calendar,
  Lock,
  Scissors,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../lib/AuthContext'
import {
  getEmergencyProfile,
  regenerateEmergencyToken,
  getRecentEmergencyAccess,
  getStoredLocalToken,
  saveStoredLocalToken,
  EmergencyProfile,
  EmergencyAccessLog,
} from '../../lib/api/patientEmergency'
import { getPatientRecords, Allergy, Disease, Surgery } from '../../lib/api/patientRecords'
import { getActiveMedications, Medication } from '../../lib/api/patientOverview'

export default function PatientProfile() {
  const { user, profile, name } = useAuth()
  const patientId = user?.id || ''

  // Loading & State
  const [loading, setLoading] = useState(true)
  const [emergencyProfile, setEmergencyProfile] = useState<EmergencyProfile | null>(null)
  const [allergies, setAllergies] = useState<Allergy[]>([])
  const [conditions, setConditions] = useState<Disease[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [surgeries, setSurgeries] = useState<Surgery[]>([])
  const [recentScans, setRecentScans] = useState<EmergencyAccessLog[]>([])

  // Emergency Token State
  const [currentToken, setCurrentToken] = useState<string>('')
  const [showQRModal, setShowQRModal] = useState(false)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // Printable card ref
  const printRef = useRef<HTMLDivElement>(null)

  // Construct URL
  const emergencyUrl = currentToken
    ? `${window.location.origin}/emergency/${currentToken}`
    : `${window.location.origin}/emergency/${patientId}`

  useEffect(() => {
    if (!patientId) return
    loadProfileData()
  }, [patientId])

  const loadProfileData = async () => {
    setLoading(true)
    try {
      const [emProf, records, meds, scans] = await Promise.all([
        getEmergencyProfile(patientId),
        getPatientRecords(patientId),
        getActiveMedications(patientId),
        getRecentEmergencyAccess(patientId),
      ])

      setEmergencyProfile(emProf)
      setAllergies(records.allergies || [])
      setConditions((records.diseases || []).filter((d) => d.status !== 'resolved'))
      setSurgeries(records.surgeries || [])
      setMedications(meds || [])
      setRecentScans(scans || [])

      // Check locally cached token or code
      const localToken = getStoredLocalToken(patientId)
      if (localToken) {
        setCurrentToken(localToken)
      } else if (emProf.emergency_code) {
        setCurrentToken(emProf.emergency_code)
      }
    } catch (err) {
      console.warn('Profile data load warning:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateToken = async () => {
    if (!patientId || regenerating) return
    setRegenerating(true)
    setFeedbackMsg(null)

    try {
      const { token } = await regenerateEmergencyToken(patientId)
      setCurrentToken(token)
      saveStoredLocalToken(patientId, token)
      setShowRegenConfirm(false)
      setFeedbackMsg({
        text: 'Emergency QR successfully regenerated! The old token has been revoked.',
        type: 'success',
      })
      // Refresh scan list
      const updatedScans = await getRecentEmergencyAccess(patientId)
      setRecentScans(updatedScans)
    } catch (err) {
      setFeedbackMsg({
        text: err instanceof Error ? err.message : 'Failed to regenerate token.',
        type: 'error',
      })
    } finally {
      setRegenerating(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(emergencyUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handlePrintCard = () => {
    window.print()
  }

  const handleDownloadLockScreen = () => {
    // Generate mobile lock screen image using HTML Canvas
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1920)
    grad.addColorStop(0, '#090D16')
    grad.addColorStop(0.5, '#0F172A')
    grad.addColorStop(1, '#020617')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 1080, 1920)

    // Red emergency top accent
    ctx.fillStyle = '#EF4444'
    ctx.fillRect(0, 0, 1080, 24)

    // Header badge
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'
    ctx.beginPath()
    ctx.roundRect(140, 160, 800, 100, 30)
    ctx.fill()

    ctx.fillStyle = '#EF4444'
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('EMERGENCY MEDICAL IDENTIFICATION', 540, 225)

    // Patient Name
    ctx.fillStyle = '#F8FAFC'
    ctx.font = 'bold 64px system-ui, -apple-system, sans-serif'
    ctx.fillText(name || 'PATIENT', 540, 360)

    // Blood Type Pill
    ctx.fillStyle = '#EF4444'
    ctx.beginPath()
    ctx.roundRect(420, 410, 240, 90, 25)
    ctx.fill()

    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif'
    ctx.fillText(emergencyProfile?.blood_group || 'O+', 540, 474)

    // QR Code Container Box
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.roundRect(240, 560, 600, 600, 36)
    ctx.fill()

    // Draw SVG QR onto Canvas via Image element
    const svgElem = document.getElementById('emergency-modal-qr-svg')
    if (svgElem) {
      const svgXml = new XMLSerializer().serializeToString(svgElem)
      const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgXml)))
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 280, 600, 520, 520)

        // Emergency Contacts Section
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
        ctx.beginPath()
        ctx.roundRect(140, 1220, 800, 280, 30)
        ctx.fill()

        ctx.fillStyle = '#94A3B8'
        ctx.font = '28px system-ui, -apple-system, sans-serif'
        ctx.fillText('EMERGENCY CONTACT', 540, 1280)

        ctx.fillStyle = '#F8FAFC'
        ctx.font = 'bold 44px system-ui, -apple-system, sans-serif'
        ctx.fillText(emergencyProfile?.emergency_contact_name || 'Family Contact', 540, 1345)

        ctx.fillStyle = '#22D3EE'
        ctx.font = 'bold 42px monospace'
        ctx.fillText(emergencyProfile?.emergency_contact_phone || '+1 555-019-2834', 540, 1420)

        // Bottom instruction
        ctx.fillStyle = '#64748B'
        ctx.font = '28px system-ui, -apple-system, sans-serif'
        ctx.fillText('First Responders: Scan QR code with any smartphone camera', 540, 1600)
        ctx.fillText('Health-One Emergency Access Protocol', 540, 1650)

        // Trigger Download
        const a = document.createElement('a')
        a.download = `Emergency_LockScreen_${(name || 'Patient').replace(/\s+/g, '_')}.png`
        a.href = canvas.toDataURL('image/png')
        a.click()
      }
      img.src = svgBase64
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Patient Profile</h1>
          <p className="text-sm text-mist">
            Manage your account credentials and personal Emergency QR response card.
          </p>
        </div>

        {/* Quick Emergency QR Launch Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowQRModal(true)}
          className="flex items-center gap-2 self-start rounded-xl border border-emergency/40 bg-emergency-soft px-4 py-2.5 text-xs font-bold text-emergency shadow-glow-em hover:bg-emergency/20 transition-all cursor-pointer"
        >
          <QrCode size={16} /> Emergency QR Card
        </motion.button>
      </motion.div>

      {/* Feedback Banner */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-center justify-between rounded-xl border p-3.5 text-xs font-semibold ${
              feedbackMsg.type === 'success'
                ? 'border-vital/30 bg-vital-soft text-vital'
                : 'border-emergency/30 bg-emergency-soft text-emergency'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{feedbackMsg.text}</span>
            </div>
            <button onClick={() => setFeedbackMsg(null)} className="cursor-pointer text-mist hover:text-ink">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Profile Card & Avatar */}
        <Card className="flex flex-col items-center p-6 text-center md:col-span-1" hover={false}>
          {/* Avatar button tapping triggers Emergency QR */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowQRModal(true)}
            className="group relative cursor-pointer"
            title="Tap avatar to open Emergency QR Card"
          >
            <div className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-tr from-vital to-ai text-3xl font-extrabold text-void shadow-glow">
              {name ? name.slice(0, 1).toUpperCase() : 'P'}
            </div>
            <div className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-xl border border-edge bg-panel2 text-emergency shadow-md group-hover:scale-110 transition-transform">
              <QrCode size={16} />
            </div>
          </motion.div>

          <h2 className="mt-4 font-display text-lg font-bold text-ink">{name || 'Avinash S'}</h2>
          <p className="text-xs text-mist flex items-center gap-1 mt-0.5">
            <Mail size={12} className="text-vital shrink-0" /> {user?.email || 'patient@healthone.io'}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-vital-soft px-3 py-1 text-xs font-semibold text-vital">
            <ShieldCheck size={14} /> PATIENT VERIFIED
          </div>

          <div className="mt-6 w-full space-y-2 border-t border-edge/60 pt-4 text-xs text-left">
            <div className="flex items-center justify-between rounded-xl bg-panel2 p-2.5">
              <span className="text-mist">Blood Group:</span>
              <span className="font-bold text-emergency flex items-center gap-1">
                <Droplet size={13} /> {emergencyProfile?.blood_group || 'O+'}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-panel2 p-2.5">
              <span className="text-mist">Account ID:</span>
              <span className="font-mono text-[11px] font-semibold text-ink">
                {patientId ? `${patientId.slice(0, 8)}…` : 'P-8821'}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-panel2 p-2.5">
              <span className="text-mist">Role:</span>
              <span className="font-semibold text-ink capitalize">Patient Portal</span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowQRModal(true)}
            className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-vital py-2.5 text-xs font-bold text-void shadow-glow hover:brightness-110 transition-all cursor-pointer"
          >
            <QrCode size={15} /> Show Emergency QR
          </motion.button>
        </Card>

        {/* Life-Critical Summary Card */}
        <div className="space-y-6 md:col-span-2">
          {/* Quick Life-Critical Status */}
          <Card className="p-6" glow="emergency" hover={false}>
            <div className="flex items-center justify-between border-b border-edge/60 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-emergency" />
                <h3 className="font-display text-sm font-bold text-ink">Life-Critical Emergency Profile</h3>
              </div>
              <span className="rounded-full bg-emergency-soft px-2.5 py-0.5 text-[10px] font-semibold text-emergency">
                Active in Public QR
              </span>
            </div>

            {loading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-xl border border-edge bg-panel2 p-3">
                  <div className="flex items-center gap-2 text-mist font-medium">
                    <Droplet size={14} className="text-emergency" /> Blood Group
                  </div>
                  <p className="mt-1 text-base font-bold text-ink">{emergencyProfile?.blood_group || 'O+'}</p>
                </div>

                <div className="rounded-xl border border-edge bg-panel2 p-3">
                  <div className="flex items-center gap-2 text-mist font-medium">
                    <Phone size={14} className="text-vital" /> Emergency Contact
                  </div>
                  <p className="mt-1 text-xs font-bold text-ink truncate">
                    {emergencyProfile?.emergency_contact_name || 'Sarah Johnson (Spouse)'}
                  </p>
                  <a
                    href={`tel:${emergencyProfile?.emergency_contact_phone || '+15550192834'}`}
                    className="font-mono text-[11px] text-vital hover:underline block mt-0.5"
                  >
                    {emergencyProfile?.emergency_contact_phone || '+1 (555) 019-2834'}
                  </a>
                </div>

                <div className="rounded-xl border border-edge bg-panel2 p-3 sm:col-span-2">
                  <div className="flex items-center gap-2 text-mist font-medium">
                    <ShieldAlert size={14} className="text-emergency" /> Known Drug Allergies
                  </div>
                  {allergies.length === 0 ? (
                    <p className="mt-1 text-xs text-mist italic">No allergies listed.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {allergies.map((a) => (
                        <span
                          key={a.id}
                          className="rounded-full bg-emergency-soft border border-emergency/30 px-2.5 py-0.5 text-[11px] font-semibold text-emergency"
                        >
                          {a.allergen} ({a.severity})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-edge bg-panel2 p-3 sm:col-span-2">
                  <div className="flex items-center gap-2 text-mist font-medium">
                    <HeartPulse size={14} className="text-vital" /> Chronic Conditions
                  </div>
                  {conditions.length === 0 ? (
                    <p className="mt-1 text-xs text-mist italic">No chronic conditions listed.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {conditions.map((c) => (
                        <span
                          key={c.id}
                          className="rounded-full bg-vital-soft border border-vital/30 px-2.5 py-0.5 text-[11px] font-semibold text-vital"
                        >
                          {c.condition_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-edge bg-panel2 p-3 sm:col-span-2">
                  <div className="flex items-center gap-2 text-mist font-medium">
                    <Pill size={14} className="text-ai" /> Current Medications
                  </div>
                  {medications.length === 0 ? (
                    <p className="mt-1 text-xs text-mist italic">No active medications listed.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {medications.map((m) => (
                        <span
                          key={m.id}
                          className="rounded-full bg-ai-soft border border-ai/30 px-2.5 py-0.5 text-[11px] font-medium text-ai"
                        >
                          {m.name} {m.dose ? `(${m.dose})` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {surgeries.length > 0 && (
                  <div className="rounded-xl border border-edge bg-panel2 p-3 sm:col-span-2">
                    <div className="flex items-center gap-2 text-mist font-medium">
                      <Scissors size={14} className="text-mist" /> Past Surgeries & Procedures
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {surgeries.map((s) => (
                        <span
                          key={s.id}
                          className="rounded-full bg-panel border border-edge px-2.5 py-0.5 text-[11px] font-medium text-ink"
                        >
                          {s.surgery_type} {s.surgery_date ? `(${s.surgery_date})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Recent Scans Audit Log */}
          <Card className="p-6" hover={false}>
            <div className="flex items-center justify-between border-b border-edge/60 pb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-vital" />
                <h3 className="font-display text-sm font-bold text-ink">Recent Emergency Scans Audit Log</h3>
              </div>
              <span className="rounded-full bg-vital-soft px-2.5 py-0.5 text-[10px] font-semibold text-vital">
                {recentScans.length} Scans Logged
              </span>
            </div>

            {loading ? (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : recentScans.length === 0 ? (
              <div className="py-8 text-center text-xs text-mist flex flex-col items-center gap-1.5">
                <Lock size={22} className="text-mist/60" />
                <p className="font-semibold text-ink">No emergency accesses logged yet</p>
                <p>Every public scan of your emergency token is audited with timestamp and IP.</p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between rounded-xl border border-edge bg-panel2 p-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-emergency-soft text-emergency font-bold text-[10px]">
                        QR
                      </div>
                      <div>
                        <p className="font-semibold text-ink">
                          {scan.access_reason || 'Public Emergency QR Scan'}
                        </p>
                        <p className="text-[11px] text-mist mt-0.5">
                          IP: <span className="font-mono text-ink">{scan.ip_address || '127.0.0.1'}</span>
                          {scan.user_agent ? ` · ${scan.user_agent.slice(0, 32)}…` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-mist shrink-0">
                      {formatDate(scan.created_at || scan.accessed_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Emergency QR Modal */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg rounded-3xl border border-emergency/40 bg-panel p-6 sm:p-8 shadow-2xl space-y-5"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowQRModal(false)}
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-panel2 text-mist hover:text-ink cursor-pointer"
              >
                <X size={16} />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 border-b border-edge/60 pb-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emergency-soft text-emergency shrink-0">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">Emergency Health QR Card</h3>
                  <p className="text-xs text-mist">
                    Encoded with a random signed token (/emergency/{currentToken.slice(0, 8)}…)
                  </p>
                </div>
              </div>

              {/* Scannable Card (Print Ref) */}
              <div
                ref={printRef}
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-emergency/30 bg-panel2/60 p-6 text-center space-y-3"
              >
                {/* Patient Badge */}
                <div className="flex items-center justify-between w-full border-b border-edge/60 pb-2">
                  <span className="font-display text-sm font-bold text-ink">{name || 'Avinash S'}</span>
                  <span className="rounded-full bg-emergency text-white text-xs font-extrabold px-3 py-0.5">
                    {emergencyProfile?.blood_group || 'O+'}
                  </span>
                </div>

                {/* Scannable SVG QR Code */}
                <div className="relative p-3.5 bg-white rounded-2xl shadow-xl">
                  <QRCodeSVG
                    id="emergency-modal-qr-svg"
                    value={emergencyUrl}
                    size={180}
                    level="H"
                    includeMargin={false}
                  />
                  <motion.div
                    className="absolute inset-x-2 h-0.5 bg-emergency shadow-glow-em"
                    animate={{ top: ['10%', '88%', '10%'] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  />
                </div>

                <p className="text-xs font-semibold text-ink">Scannable by Any Smartphone or First Responder</p>
                <p className="text-[11px] text-mist font-mono break-all max-w-sm">
                  {emergencyUrl}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 rounded-xl border border-edge bg-panel px-3 py-1.5 text-xs text-ink hover:bg-edge/40 transition-colors cursor-pointer"
                  >
                    <Copy size={13} /> {copiedLink ? 'Copied URL!' : 'Copy URL'}
                  </button>

                  <a
                    href={emergencyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-vital/30 bg-vital-soft px-3 py-1.5 text-xs font-semibold text-vital hover:bg-vital/20 transition-colors"
                  >
                    <ExternalLink size={13} /> Open Page
                  </a>
                </div>
              </div>

              {/* 4 Required Actions */}
              <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                {/* 1. Download / Print Card */}
                <button
                  onClick={handlePrintCard}
                  className="flex items-center justify-center gap-2 rounded-xl border border-edge bg-panel2 p-2.5 font-semibold text-ink hover:border-vital/40 hover:bg-panel transition-all cursor-pointer"
                >
                  <Printer size={15} className="text-vital" /> Print / PDF Card
                </button>

                {/* 2. Save as Lock Screen Image */}
                <button
                  onClick={handleDownloadLockScreen}
                  className="flex items-center justify-center gap-2 rounded-xl border border-edge bg-panel2 p-2.5 font-semibold text-ink hover:border-vital/40 hover:bg-panel transition-all cursor-pointer"
                >
                  <Smartphone size={15} className="text-ai" /> Save Lock Screen
                </button>

                {/* 3. Regenerate QR (with Confirm) */}
                <button
                  onClick={() => setShowRegenConfirm(true)}
                  disabled={regenerating}
                  className="flex items-center justify-center gap-2 rounded-xl border border-emergency/30 bg-emergency-soft p-2.5 font-semibold text-emergency hover:bg-emergency/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={15} className={regenerating ? 'animate-spin' : ''} /> Regenerate QR
                </button>

                {/* 4. View Recent Scans */}
                <button
                  onClick={() => {
                    setShowQRModal(false)
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-edge bg-panel2 p-2.5 font-semibold text-ink hover:border-vital/40 hover:bg-panel transition-all cursor-pointer"
                >
                  <Clock size={15} className="text-vital" /> View Recent Scans
                </button>
              </div>

              {/* Security Policy Reminder */}
              <p className="text-[11px] text-center text-mist leading-relaxed border-t border-edge/60 pt-3">
                Tokens are stored as SHA-256 hashes in Supabase. Regenerating immediately invalidates previous QR codes.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for QR Regeneration */}
      <AnimatePresence>
        {showRegenConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-emergency/40 bg-panel p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-emergency">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emergency-soft shrink-0">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">Regenerate Emergency QR?</h3>
                  <p className="text-xs text-mist">Previous codes will stop working immediately.</p>
                </div>
              </div>

              <p className="text-xs text-mist leading-relaxed bg-panel2 p-3 rounded-xl border border-edge">
                This will generate a brand new random token, update the SHA-256 hash in the database, and permanently revoke the old token. Any printed physical cards or saved lock screens must be updated.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowRegenConfirm(false)}
                  disabled={regenerating}
                  className="rounded-xl border border-edge bg-panel2 px-4 py-2 text-xs font-medium text-ink hover:bg-edge/40 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleRegenerateToken}
                  disabled={regenerating}
                  className="flex items-center gap-1.5 rounded-xl bg-emergency px-4 py-2 text-xs font-bold text-void shadow-glow-em hover:brightness-110 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
                  {regenerating ? 'Regenerating...' : 'Confirm & Revoke Old QR'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
