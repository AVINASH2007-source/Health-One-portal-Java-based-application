import { motion } from 'framer-motion'
import { Bell, Search, ShieldAlert, LogOut } from 'lucide-react'
import { Role } from '../../lib/navConfig'
import { getRoleTheme } from '../../lib/roleTheme'
import { useAuth } from '../../lib/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ role }: { role: Role }) {
  const navigate = useNavigate()
  const { name, logout } = useAuth()
  const theme = getRoleTheme(role)

  return (
    <header className="glass sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-edge px-6 py-3">
      <div className="flex flex-1 items-center gap-2 rounded-xl border border-edge bg-panel2/60 px-3 py-2 text-mist">
        <Search size={16} />
        <input
          placeholder="Search patients, records, reports…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
        />
      </div>

      <div
        className="hidden items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium sm:flex"
        style={{ borderColor: `${theme.accent}33`, backgroundColor: `${theme.accent}0D`, color: theme.accent }}
      >
        <theme.icon size={15} />
        {theme.label} portal
      </div>

      {role === 'patient' && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/emergency/demo-patient-01')}
          className="flex items-center gap-1.5 rounded-xl border border-emergency/30 bg-emergency-soft px-3 py-2 text-sm text-emergency"
        >
          <ShieldAlert size={15} /> Emergency
        </motion.button>
      )}

      <motion.button whileTap={{ scale: 0.9 }} className="relative grid h-9 w-9 place-items-center rounded-xl border border-edge text-mist hover:text-ink">
        <Bell size={16} />
        <motion.span
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-vital"
        />
      </motion.button>

      <div className="flex items-center gap-2">
        <div
          className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold text-white"
          style={{ background: `linear-gradient(135deg, ${theme.accent}, #22D3EE)` }}
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        <button
          onClick={() => { logout(); navigate('/') }}
          className="grid h-9 w-9 place-items-center rounded-xl border border-edge text-mist hover:text-ink"
          title="Log out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}
