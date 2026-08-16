import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  Globe,
  Sparkles,
  Volume2,
  FileText,
  AlertCircle,
  ShieldCheck,
  LayoutGrid,
} from 'lucide-react'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../lib/AuthContext'
import {
  getPatientPreferences,
  savePatientPreferences,
} from '../../lib/api/patientLanguage'

type LanguageOption = {
  code: string
  name: string
  nativeName: string
  region: string
  samplePreview: {
    welcome: string
    records: string
    emergency: string
  }
}

const LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    region: 'Global (Default)',
    samplePreview: {
      welcome: 'Welcome to Health-One',
      records: 'Medical Records',
      emergency: 'Emergency Card',
    },
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    region: 'India',
    samplePreview: {
      welcome: 'हेल्थ-वन में आपका स्वागत है',
      records: 'चिकित्सा रिकॉर्ड',
      emergency: 'आपातकालीन कार्ड',
    },
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    region: 'India / Singapore',
    samplePreview: {
      welcome: 'ஹெல்த்-ஒன் உங்களை வரவேற்கிறது',
      records: 'மருத்துவப் பதிவுகள்',
      emergency: 'அவசர அட்டை',
    },
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    region: 'India',
    samplePreview: {
      welcome: 'హెల్త్-వన్ లోనికి స్వాగతం',
      records: 'వైద్య రికార్డులు',
      emergency: 'ఎమర్జెన్సీ కార్డ్',
    },
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    region: 'India',
    samplePreview: {
      welcome: 'ಹೆಲ್ತ್-ಒನ್‌ಗೆ ಸಸ್ವಾಗತ',
      records: 'ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳು',
      emergency: 'ತುರ್ತು ಕಾರ್ಡ್',
    },
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    region: 'India',
    samplePreview: {
      welcome: 'ഹെൽത്ത്-വണ്ണിലേക്ക് സ്വാഗതം',
      records: 'മെഡിക്കൽ റെക്കോർഡുകൾ',
      emergency: 'എമർജൻസി കാർഡ്',
    },
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    region: 'India / Bangladesh',
    samplePreview: {
      welcome: 'হেলথ-ওয়ানে স্বাগতম',
      records: 'মেডিকেল রেকর্ড',
      emergency: 'জরুরি কার্ড',
    },
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    region: 'Latin America / Spain',
    samplePreview: {
      welcome: 'Bienvenido a Health-One',
      records: 'Historial Médico',
      emergency: 'Tarjeta de Emergencia',
    },
  },
]

export default function Language() {
  const { session } = useAuth()
  const patientId = session?.user?.id || ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [selectedLang, setSelectedLang] = useState<string>('en')
  const [voiceAssistance, setVoiceAssistance] = useState<boolean>(true)
  const [autoTranslateDocs, setAutoTranslateDocs] = useState<boolean>(true)

  useEffect(() => {
    if (!patientId) return

    let active = true
    const loadPreferences = async () => {
      setLoading(true)
      setError(null)
      try {
        const prefs = await getPatientPreferences(patientId)
        if (active) {
          setSelectedLang(prefs.language || 'en')
          setVoiceAssistance(prefs.voice_assistance)
          setAutoTranslateDocs(prefs.auto_translate_docs)
          setLoading(false)
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load language preferences:', err)
          setError(err instanceof Error ? err.message : 'Unable to load language preferences.')
          setLoading(false)
        }
      }
    }

    loadPreferences()

    return () => {
      active = false
    }
  }, [patientId])

  const handleSelectLanguage = async (code: string) => {
    setSelectedLang(code)
    if (!patientId) return

    setSaving(true)
    setError(null)
    try {
      await savePatientPreferences(patientId, {
        language: code,
        voice_assistance: voiceAssistance,
        auto_translate_docs: autoTranslateDocs,
      })
      setSavedSuccess('Language preference updated and saved to your profile!')
      setTimeout(() => setSavedSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preference.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleVoice = async () => {
    const nextVal = !voiceAssistance
    setVoiceAssistance(nextVal)
    if (!patientId) return

    setSaving(true)
    try {
      await savePatientPreferences(patientId, {
        language: selectedLang,
        voice_assistance: nextVal,
        auto_translate_docs: autoTranslateDocs,
      })
      setSavedSuccess('Voice assistant preference saved.')
      setTimeout(() => setSavedSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preference.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAutoTranslate = async () => {
    const nextVal = !autoTranslateDocs
    setAutoTranslateDocs(nextVal)
    if (!patientId) return

    setSaving(true)
    try {
      await savePatientPreferences(patientId, {
        language: selectedLang,
        voice_assistance: voiceAssistance,
        auto_translate_docs: nextVal,
      })
      setSavedSuccess('Auto-translation preference saved.')
      setTimeout(() => setSavedSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preference.')
    } finally {
      setSaving(false)
    }
  }

  const activeLangOption = LANGUAGES.find((l) => l.code === selectedLang) || LANGUAGES[0]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-display text-2xl font-semibold text-ink">Language & Regional Settings</h1>
        <p className="text-sm text-mist">
          Choose your preferred interface language, AI translation preferences, and voice response mode.
        </p>
      </motion.div>

      {/* Notifications */}
      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-vital/30 bg-vital-soft p-3.5 text-xs font-medium text-ink"
        >
          <Check size={16} className="text-vital shrink-0" />
          <span>{savedSuccess}</span>
        </motion.div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-emergency/30 bg-emergency-soft/30 p-4 text-xs text-emergency">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      ) : (
        <>
          {/* Main Language Selector */}
          <Card className="p-6" hover={false}>
            <div className="mb-4 flex items-center justify-between border-b border-edge pb-3">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-vital" />
                <h2 className="text-sm font-semibold text-ink">Select Interface Display Language</h2>
              </div>
              {saving && <span className="text-xs text-vital animate-pulse font-medium">Saving...</span>}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {LANGUAGES.map((lang, i) => {
                const isSelected = selectedLang === lang.code

                return (
                  <motion.button
                    key={lang.code}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleSelectLanguage(lang.code)}
                    disabled={saving}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-vital bg-vital-soft/50 ring-2 ring-vital/30 shadow-sm'
                        : 'border-edge bg-panel2 hover:bg-edge/40'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold text-ink">{lang.nativeName}</p>
                      <p className="text-xs text-mist mt-0.5">
                        {lang.name} — <span className="text-[11px]">{lang.region}</span>
                      </p>
                    </div>

                    <div
                      className={`grid h-6 w-6 place-items-center rounded-full border transition-all ${
                        isSelected ? 'border-vital bg-vital text-void' : 'border-edge bg-panel'
                      }`}
                    >
                      {isSelected && <Check size={14} />}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </Card>

          {/* Live Translation Preview Box */}
          <Card className="p-6" glow="ai" hover={false}>
            <div className="mb-3 flex items-center gap-2 border-b border-edge/60 pb-3">
              <Sparkles size={18} className="text-ai" />
              <h3 className="text-sm font-semibold text-ink">
                Live Preview — {activeLangOption.name} ({activeLangOption.nativeName})
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-xl border border-edge bg-panel2 p-3">
                <p className="text-[11px] text-mist mb-1">Header Greeting</p>
                <p className="font-semibold text-ink">{activeLangOption.samplePreview.welcome}</p>
              </div>

              <div className="rounded-xl border border-edge bg-panel2 p-3">
                <p className="text-[11px] text-mist mb-1">Records Navigation</p>
                <p className="font-semibold text-ink">{activeLangOption.samplePreview.records}</p>
              </div>

              <div className="rounded-xl border border-edge bg-panel2 p-3">
                <p className="text-[11px] text-mist mb-1">Emergency Card</p>
                <p className="font-semibold text-ink">{activeLangOption.samplePreview.emergency}</p>
              </div>
            </div>
          </Card>

          {/* Multilingual AI Preferences & Toggles */}
          <Card className="p-6" hover={false}>
            <div className="mb-4 flex items-center gap-2 border-b border-edge pb-3">
              <LayoutGrid size={18} className="text-vital" />
              <h3 className="text-sm font-semibold text-ink">Multilingual AI & Voice Preferences</h3>
            </div>

            <div className="space-y-4 text-xs">
              {/* Toggle 1: Auto Translate Docs */}
              <div className="flex items-center justify-between rounded-2xl border border-edge bg-panel2 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-vital-soft text-vital shrink-0">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-ink">Gemini AI Document Auto-Translation</p>
                    <p className="text-[11px] text-mist mt-0.5">
                      Automatically translate summaries of uploaded medical documents into {activeLangOption.name}.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleToggleAutoTranslate}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoTranslateDocs ? 'bg-vital' : 'bg-edge'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-void shadow ring-0 transition duration-200 ease-in-out ${
                      autoTranslateDocs ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Multilingual Voice Assistant */}
              <div className="flex items-center justify-between rounded-2xl border border-edge bg-panel2 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-ai-soft text-ai shrink-0">
                    <Volume2 size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-ink">Multilingual AI Voice Assistant</p>
                    <p className="text-[11px] text-mist mt-0.5">
                      Enable Gemini AI voice response and health summary narration in {activeLangOption.nativeName}.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleToggleVoice}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    voiceAssistance ? 'bg-ai' : 'bg-edge'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-void shadow ring-0 transition duration-200 ease-in-out ${
                      voiceAssistance ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-panel2 p-4 border border-edge text-xs text-mist">
              <ShieldCheck size={16} className="text-vital shrink-0" />
              <span>
                Preferences are encrypted and stored in your private Health-One profile.
              </span>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
