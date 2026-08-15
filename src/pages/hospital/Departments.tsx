import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Plus, Edit2, Trash2, Check, X, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

type Department = {
  id: string
  name: string
  created_at: string
}

export default function Departments() {
  const { user } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchDepartments = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, created_at')
        .eq('hospital_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching departments:', error.message)
        setMessage({ type: 'error', text: `Failed to load departments: ${error.message}` })
      } else {
        setDepartments(data || [])
      }
    } catch (err: any) {
      console.error('Failed to fetch departments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDepartments()
  }, [user])

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const cleanName = newName.trim()
    if (!cleanName) return

    if (!user) {
      setMessage({ type: 'error', text: 'You must be signed in as a hospital to manage departments.' })
      return
    }

    setAdding(true)
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert({
          hospital_id: user.id,
          name: cleanName,
        })
        .select('id, name, created_at')
        .single()

      if (error) {
        setMessage({ type: 'error', text: `Failed to create department: ${error.message}` })
      } else {
        setMessage({ type: 'success', text: `Department "${cleanName}" added successfully.` })
        setNewName('')
        if (data) {
          setDepartments((prev) => [data, ...prev])
        } else {
          await fetchDepartments()
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'An error occurred while adding the department.' })
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (dept: Department) => {
    setEditingId(dept.id)
    setEditingName(dept.name)
    setConfirmDeleteId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleSaveEdit = async (deptId: string) => {
    const cleanName = editingName.trim()
    if (!cleanName) return

    setSavingEdit(true)
    setMessage(null)
    try {
      const { error } = await supabase
        .from('departments')
        .update({ name: cleanName })
        .eq('id', deptId)

      if (error) {
        setMessage({ type: 'error', text: `Failed to update department: ${error.message}` })
      } else {
        setDepartments((prev) =>
          prev.map((d) => (d.id === deptId ? { ...d, name: cleanName } : d))
        )
        setMessage({ type: 'success', text: 'Department updated successfully.' })
        setEditingId(null)
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'An error occurred while updating the department.' })
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (deptId: string, deptName: string) => {
    setDeletingId(deptId)
    setMessage(null)
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', deptId)

      if (error) {
        setMessage({ type: 'error', text: `Failed to delete department: ${error.message}` })
      } else {
        setDepartments((prev) => prev.filter((d) => d.id !== deptId))
        setMessage({ type: 'success', text: `Department "${deptName}" deleted.` })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'An error occurred while deleting the department.' })
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Hospital Departments</h1>
          <p className="text-sm text-mist">Manage clinical divisions, specialty departments, and ward configurations.</p>
        </div>
        <button
          onClick={fetchDepartments}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-edge bg-panel px-3.5 py-2 text-xs font-medium text-ink hover:bg-panel2 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Add Department Card */}
      <Card className="p-6" hover={false}>
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-vital/10 text-vital">
            <Building2 size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">Add New Department</h2>
            <p className="text-xs text-mist">Create a new clinical division for staff and patient assignments.</p>
          </div>
        </div>

        <form onSubmit={handleAddDepartment} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">Department Name</label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mist pointer-events-none" size={16} />
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Cardiology, Radiology, Pediatrics, Emergency"
                className="w-full rounded-xl border border-edge bg-panel2 pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-mist/60 focus:border-vital focus:outline-none focus:ring-1 focus:ring-vital"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-vital px-4 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-vital/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Adding Department...
              </>
            ) : (
              <>
                <Plus size={14} />
                Add Department
              </>
            )}
          </button>
        </form>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 flex items-start gap-2.5 rounded-xl p-3 text-xs font-medium max-w-xl ${
              message.type === 'success'
                ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
                : 'border border-red-500/20 bg-red-500/10 text-red-600'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </motion.div>
        )}
      </Card>

      {/* Departments Grid */}
      <Card className="p-6" hover={false}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Active Departments ({departments.length})</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : departments.length === 0 ? (
          <div className="my-4 rounded-xl border border-dashed border-edge bg-panel2/50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-vital/10 text-vital mb-3">
              <Building2 size={24} />
            </div>
            <p className="text-sm font-medium text-ink">No departments yet</p>
            <p className="mt-1 text-xs text-mist">Add your first department using the form above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {departments.map((dept, idx) => {
                const isEditing = editingId === dept.id
                const isConfirmingDelete = confirmDeleteId === dept.id
                const isDeleting = deletingId === dept.id

                return (
                  <motion.div
                    key={dept.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ delay: idx * 0.04 }}
                    className="relative flex flex-col justify-between rounded-xl border border-edge bg-panel2 p-4 hover:border-edge/80 transition-all"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <label className="text-xs font-medium text-mist">Edit Department Name</label>
                        <input
                          type="text"
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full rounded-lg border border-vital bg-panel px-3 py-1.5 text-sm text-ink focus:outline-none"
                        />
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleSaveEdit(dept.id)}
                            disabled={savingEdit || !editingName.trim()}
                            className="inline-flex items-center gap-1 rounded-lg bg-vital px-2.5 py-1 text-xs font-medium text-white hover:bg-vital/90 transition-colors disabled:opacity-50"
                          >
                            <Check size={13} />
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={savingEdit}
                            className="inline-flex items-center gap-1 rounded-lg border border-edge bg-panel px-2.5 py-1 text-xs font-medium text-mist hover:text-ink transition-colors"
                          >
                            <X size={13} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vital/10 text-vital">
                              <Building2 size={20} />
                            </div>
                            <div>
                              <h3 className="font-medium text-ink text-sm">{dept.name}</h3>
                              <p className="text-[11px] text-mist">
                                Added {new Date(dept.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {!isConfirmingDelete && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEdit(dept)}
                                title="Edit Department"
                                className="rounded-lg p-1.5 text-mist hover:bg-panel hover:text-ink transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(dept.id)}
                                title="Delete Department"
                                className="rounded-lg p-1.5 text-mist hover:bg-red-500/10 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Delete Confirmation Box */}
                        {isConfirmingDelete && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-600"
                          >
                            <p className="font-medium mb-2">Delete this department?</p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDelete(dept.id, dept.name)}
                                disabled={isDeleting}
                                className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                              >
                                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-md border border-edge bg-panel px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-panel2 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </div>
  )
}
