import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight, HeartPulse } from 'lucide-react'
import { Role, navByRole } from '../../lib/navConfig'
import VitalLine from './VitalLine'

export default function Sidebar({
  role,
  collapsed,
  onToggle,
}: {
  role: Role
  collapsed: boolean
  onToggle: () => void
}) {
  const items = navByRole[role]

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 264 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="glass sticky top-0 flex h-screen flex-col border-r border-edge px-3 py-4"
    >
      <div className="mb-4 flex items-center gap-2 px-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-vital-soft">
          <HeartPulse size={18} className="text-vital" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <p className="font-display text-sm font-semibold leading-none">Health-One</p>
            <p className="text-[11px] text-mist">Lifetime Health Record</p>
          </motion.div>
        )}
      </div>

      {!collapsed && <VitalLine height={24} className="mb-3 px-2 opacity-70" />}

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {items.map((item, i) => (
          <NavLink key={item.path} to={item.path} end={item.path.split('/').length <= 2}>
            {({ isActive }) => (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ x: 3 }}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-vital-soft text-vital' : 'text-mist hover:bg-panel2 hover:text-ink'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-xl border border-vital/30 shadow-[0_2px_10px_-4px_rgba(20,184,166,0.35)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon size={17} className="relative shrink-0" />
                {!collapsed && <span className="relative truncate">{item.label}</span>}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-edge py-2 text-mist hover:text-ink"
      >
        {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
      </button>
    </motion.aside>
  )
}
