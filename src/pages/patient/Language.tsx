import { useState } from 'react'
import { motion } from 'framer-motion'
import { Languages, Check, Globe, Sparkles } from 'lucide-react'
import Card from '../../components/ui/Card'

type LanguageOption = {
  code: string
  name: string
  nativeName: string
  region: string
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'Global (Default)' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'India' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'India / Singapore' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'India' },
  { code: 'kn', name: 'Kannada', nativeName: 'கன்னட / ಕನ್ನಡ', region: 'India' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', region: 'Latin America / Spain' },
]

export default function Language() {
  const [selectedLang, setSelectedLang] = useState<string>('en')
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false)

  const handleSelect = (code: string) => {
    setSelectedLang(code)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-display text-2xl font-semibold text-ink">Language & Regional Settings</h1>
        <p className="text-sm text-mist">
          Choose your preferred interface display language for Health-One.
        </p>
      </motion.div>

      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-vital/30 bg-vital-soft p-3.5 text-xs font-medium text-ink"
        >
          <Check size={16} className="text-vital" />
          <span>Language preference updated! Displaying interface in selected language.</span>
        </motion.div>
      )}

      <Card className="p-6" hover={false}>
        <div className="mb-4 flex items-center gap-2 border-b border-edge pb-3">
          <Globe size={18} className="text-vital" />
          <h2 className="text-sm font-semibold text-ink">Select Preferred Interface Language</h2>
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
                transition={{ delay: i * 0.04 }}
                onClick={() => handleSelect(lang.code)}
                className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-vital bg-vital-soft/50 ring-2 ring-vital/30 shadow-sm'
                    : 'border-edge bg-panel2 hover:bg-edge/40'
                }`}
              >
                <div>
                  <p className="text-sm font-bold text-ink">{lang.nativeName}</p>
                  <p className="text-xs text-mist mt-0.5">{lang.name} — <span className="text-[11px]">{lang.region}</span></p>
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

        <div className="mt-6 flex items-center gap-2 rounded-2xl bg-panel2 p-4 border border-edge text-xs text-mist">
          <Sparkles size={16} className="text-ai shrink-0" />
          <span>
            Medical document translations and AI insights automatically adapt to your chosen preference when available.
          </span>
        </div>
      </Card>
    </div>
  )
}
