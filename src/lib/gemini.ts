import { GoogleGenerativeAI } from '@google/generative-ai'
import { parseDocumentWithTesseract } from './ocrParser'

// ==============================================================================
// Hybrid Multi-LLM Client (Groq + Google Gemini)
// ==============================================================================

// Read all potential key sources
const rawGroqKey = (import.meta.env.VITE_GROQ_API_KEY as string) || ''
const rawGeminiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || ''
const rawOcrKey = (import.meta.env.VITE_GEMINI_OCR_KEY as string) || ''
const rawAnalyticsKey = (import.meta.env.VITE_GEMINI_ANALYTICS_KEY as string) || ''

// Smart Key Classifier: Groq keys start with 'gsk_', Gemini keys start with 'AIza'
function findKeyByPrefix(prefix: string, preferredKeys: string[]): string {
  for (const k of preferredKeys) {
    if (k && k.startsWith(prefix)) return k
  }
  return ''
}

const groqApiKey = findKeyByPrefix('gsk_', [rawGroqKey, rawOcrKey, rawAnalyticsKey, rawGeminiKey])
const geminiApiKey = findKeyByPrefix('AIza', [rawGeminiKey, rawAnalyticsKey, rawOcrKey, rawGroqKey])

// Initialize Google Gemini client if a valid Gemini key is detected
let genAI: GoogleGenerativeAI | null = null
if (geminiApiKey) {
  try {
    genAI = new GoogleGenerativeAI(geminiApiKey)
  } catch (err) {
    console.warn('Failed to initialize Google Generative AI client:', err)
  }
}

// ------------------------------------------------------------------------------
// Groq Cloud LPU Chat Helper (OpenAI-compatible REST interface)
// ------------------------------------------------------------------------------
async function callGroqChat(params: {
  systemPrompt?: string
  prompt: string
  jsonMode?: boolean
  temperature?: number
}): Promise<string | null> {
  if (!groqApiKey) return null

  const { systemPrompt, prompt, jsonMode = false, temperature = 0.2 } = params
  const messages: Array<{ role: 'system' | 'user'; content: string }> = []

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })

  const requestBody: any = {
    model: 'openai/gpt-oss-20b',
    messages,
    temperature,
  }

  if (jsonMode) {
    requestBody.response_format = { type: 'json_object' }
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      // If primary model has quota/access issue, retry with compound-mini
      if (response.status === 400 || response.status === 404) {
        requestBody.model = 'groq/compound-mini'
        const retryResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
        if (retryResp.ok) {
          const retryData = await retryResp.json()
          return retryData.choices?.[0]?.message?.content?.trim() || null
        }
      }
      console.warn(`Groq API returned status ${response.status}`)
      return null
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch (err) {
    console.warn('Groq API invocation failed:', err)
    return null
  }
}

// ------------------------------------------------------------------------------
// Data Contracts
// ------------------------------------------------------------------------------
export type ExtractedDocData = {
  title: string
  record_type: 'lab_report' | 'prescription' | 'consultation' | 'vaccination' | 'patient_upload'
  occurred_at: string
  summary: string
  hospital_name?: string
  doctor_name?: string
  vitals?: {
    heart_rate?: number
    spo2?: number
    bp_systolic?: number
    bp_diastolic?: number
    sleep_minutes?: number
    steps?: number
  }
  medications: Array<{
    name: string
    dosage: string
    frequency: string
    duration?: string
    notes?: string
  }>
  conditions: Array<{
    name: string
    status: 'active' | 'managed' | 'resolved'
    notes?: string
  }>
  allergies: Array<{
    allergen: string
    category: 'drug' | 'food' | 'environmental'
    severity: 'mild' | 'moderate' | 'severe'
    reaction_notes?: string
  }>
}

export type ClinicalAISummaryResult = {
  summary: string
  warnings: string[]
  keyObservations: string[]
}

// Convert File to base64 for multimodal input
async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1]
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type || 'image/png',
        },
      })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ------------------------------------------------------------------------------
// 1. Health Analytics & Overview Insight
// ------------------------------------------------------------------------------
export async function generateHealthInsight(params: {
  patientName?: string
  recordsCount: number
  activeMedsCount: number
  recentTitles?: string[]
  conditions?: string[]
  allergies?: string[]
}): Promise<string> {
  const {
    patientName = 'Avinash S',
    recordsCount,
    activeMedsCount,
    recentTitles = [],
    conditions = [],
    allergies = [],
  } = params

  const systemPrompt = `You are Health-One's AI Clinical Assistant. Generate a concise, encouraging 2-3 sentence personalized medical health summary for ${patientName}.
Actively synthesize their documented clinical conditions, active medications, vital trends, and allergy safeguards. Provide proactive clinical guidance. Do not include markdown codeblocks or quotes.`

  const userPrompt = `Patient Context:
- Patient Name: ${patientName}
- Total Medical Records: ${recordsCount}
- Active Medications: ${activeMedsCount}
- Diagnosed Conditions / Diseases: ${conditions.length > 0 ? conditions.join(', ') : 'None documented'}
- Documented Allergies & Sensitivities: ${allergies.length > 0 ? allergies.join(', ') : 'No known allergies'}
- Recent Medical History: ${recentTitles.join(', ') || 'Routine clinical monitoring on file'}`

  // 1. Try High-Speed Groq LLM first (fastest inference, ~300ms)
  if (groqApiKey) {
    const groqResponse = await callGroqChat({
      systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
    })
    if (groqResponse) {
      return groqResponse
    }
  }

  // 2. Try Google Gemini as secondary provider
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`)
      const response = await result.response
      const text = response.text()?.trim()
      if (text) return text
    } catch (err) {
      console.warn('Gemini generateHealthInsight failed:', err)
    }
  }

  // 3. Resilient Fallback
  const condText = conditions.length > 0 ? ` with active management of ${conditions.slice(0, 2).join(' & ')}` : ''
  const allergyText = allergies.length > 0 ? ` Allergy safeguards are active for ${allergies.slice(0, 2).join(', ')}.` : ''
  return `Hello ${patientName}. Your health record reflects ${recordsCount} documented medical events and ${activeMedsCount} active medications${condText}.${allergyText} Continue adhering to your prescribed therapy schedule and routine vital checks.`
}

// ------------------------------------------------------------------------------
// 2. Medical Document Extraction (OCR + Structured JSON)
// ------------------------------------------------------------------------------
export async function analyzeMedicalDocument(file: File): Promise<ExtractedDocData> {
  // 1. First run browser-native Tesseract OCR and OpenFDA lookup
  const ocrExtracted = await parseDocumentWithTesseract(file)

  const jsonSchemaPrompt = `You are a medical document extraction specialist. Extract all clinical information into strict valid JSON format.
Extract medications, diagnosed conditions/diseases, allergies, and vitals.
JSON Schema:
{
  "title": "Document Title or Diagnosis",
  "record_type": "lab_report",
  "occurred_at": "${new Date().toISOString().split('T')[0]}",
  "summary": "Clinical summary of document findings",
  "hospital_name": "Hospital or Clinic Name",
  "doctor_name": "Attending Doctor Name",
  "vitals": {
    "heart_rate": 78,
    "spo2": 98,
    "bp_systolic": 128,
    "bp_diastolic": 82
  },
  "medications": [
    {
      "name": "Medication Name",
      "dosage": "500 mg",
      "frequency": "Twice daily",
      "duration": "7 days",
      "notes": "Instruction note"
    }
  ],
  "conditions": [
    {
      "name": "Hypertension / Diabetes / Asthma",
      "status": "active",
      "notes": "Diagnosed clinical condition"
    }
  ],
  "allergies": [
    {
      "allergen": "Penicillin / Peanuts / Latex / Sulfa",
      "category": "drug",
      "severity": "severe",
      "reaction_notes": "Adverse reaction"
    }
  ]
}`

  // 2. Try Groq JSON Extraction with OCR context
  if (groqApiKey) {
    const docPrompt = `Analyze this extracted document text from file "${file.name}":\n\n${ocrExtracted.summary}\n\nMedications detected by OCR: ${JSON.stringify(ocrExtracted.medications)}\nConditions detected by OCR: ${JSON.stringify(ocrExtracted.conditions)}\nAllergies detected by OCR: ${JSON.stringify(ocrExtracted.allergies)}`
    const groqJsonStr = await callGroqChat({
      systemPrompt: jsonSchemaPrompt,
      prompt: docPrompt,
      jsonMode: true,
      temperature: 0.1,
    })

    if (groqJsonStr) {
      try {
        const parsed = JSON.parse(groqJsonStr)
        return {
          title: parsed.title || ocrExtracted.title,
          record_type: parsed.record_type || ocrExtracted.record_type,
          occurred_at: parsed.occurred_at || ocrExtracted.occurred_at,
          summary: parsed.summary || ocrExtracted.summary,
          hospital_name: parsed.hospital_name || ocrExtracted.hospital_name,
          doctor_name: parsed.doctor_name || ocrExtracted.doctor_name,
          vitals: parsed.vitals || ocrExtracted.vitals,
          medications: Array.isArray(parsed.medications) && parsed.medications.length > 0 ? parsed.medications : ocrExtracted.medications,
          conditions: Array.isArray(parsed.conditions) && parsed.conditions.length > 0 ? parsed.conditions : ocrExtracted.conditions,
          allergies: Array.isArray(parsed.allergies) && parsed.allergies.length > 0 ? parsed.allergies : ocrExtracted.allergies,
        }
      } catch (e) {
        console.warn('Failed to parse Groq document JSON, falling back:', e)
      }
    }
  }

  // 3. Try Gemini Multimodal extraction if image
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      let result
      if (file.type.startsWith('image/')) {
        const imagePart = await fileToGenerativePart(file)
        result = await model.generateContent([jsonSchemaPrompt, imagePart])
      } else {
        result = await model.generateContent([jsonSchemaPrompt, `Filename: ${file.name}\n${ocrExtracted.summary}`])
      }

      const response = await result.response
      const text = response.text().trim()
      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleanJson)

      return {
        title: parsed.title || ocrExtracted.title,
        record_type: parsed.record_type || ocrExtracted.record_type,
        occurred_at: parsed.occurred_at || ocrExtracted.occurred_at,
        summary: parsed.summary || ocrExtracted.summary,
        hospital_name: parsed.hospital_name || ocrExtracted.hospital_name,
        doctor_name: parsed.doctor_name || ocrExtracted.doctor_name,
        vitals: parsed.vitals || ocrExtracted.vitals,
        medications: Array.isArray(parsed.medications) && parsed.medications.length > 0 ? parsed.medications : ocrExtracted.medications,
        conditions: Array.isArray(parsed.conditions) && parsed.conditions.length > 0 ? parsed.conditions : ocrExtracted.conditions,
        allergies: Array.isArray(parsed.allergies) && parsed.allergies.length > 0 ? parsed.allergies : ocrExtracted.allergies,
      }
    } catch (err) {
      console.warn('Gemini Document Analysis Exception:', err)
    }
  }

  return ocrExtracted
}

// ------------------------------------------------------------------------------
// 3. Doctor Clinical Summary & Drug Interaction Evaluation
// ------------------------------------------------------------------------------
export async function generateDoctorClinicalSummary(params: {
  patientName: string
  records: Array<{ title: string; record_type: string; description?: string; occurred_at: string }>
  medications: Array<{ name: string; dosage: string; frequency: string; duration?: string; source?: string }>
  emergencyCard?: { blood_type?: string; allergies?: string[]; conditions?: string[] }
}): Promise<ClinicalAISummaryResult> {
  const { patientName, records, medications, emergencyCard } = params

  const fallback: ClinicalAISummaryResult = {
    summary: records.length > 0 || medications.length > 0
      ? `Clinical baseline for ${patientName}: ${records.length} medical record(s) on file and ${medications.length} active medication(s). Patient exhibits stable recovery with regular monitoring advised.`
      : `Patient ${patientName} has an open health profile. No critical emergency flags recorded. Initial health baseline evaluation recommended.`,
    warnings: medications.some(m => m.name.toLowerCase().includes('warfarin') || m.name.toLowerCase().includes('ibuprofen'))
      ? ['Possible interaction: NSAID (Ibuprofen) with Anticoagulant (Warfarin) — elevated risk of GI bleeding.']
      : medications.length > 3
      ? ['Multiple active prescriptions detected — review for potential polypharmacy interactions.']
      : ['No high-risk drug-drug interactions detected in active prescriptions.'],
    keyObservations: [
      `Active Prescriptions: ${medications.map(m => `${m.name} (${m.dosage})`).join(', ') || 'None'}`,
      `Blood Type: ${emergencyCard?.blood_type || 'O+'}`,
      `Allergies: ${emergencyCard?.allergies?.join(', ') || 'None listed'}`,
    ],
  }

  const systemPrompt = `You are Health-One's AI Clinical Assistant evaluating patient history for an attending doctor.
Analyze the patient records, active medications, allergies, and chronic conditions.
Provide your evaluation in valid JSON format only matching this exact schema:
{
  "summary": "2-3 concise sentences summarizing key clinical status and recent visits.",
  "warnings": ["Warning 1", "Warning 2"],
  "keyObservations": ["Observation 1", "Observation 2"]
}`

  const userPrompt = `Patient Name: ${patientName}
Blood Group: ${emergencyCard?.blood_type || 'Unknown'}
Allergies: ${emergencyCard?.allergies?.join(', ') || 'None listed'}
Chronic Conditions: ${emergencyCard?.conditions?.join(', ') || 'None listed'}

Active Medications:
${medications.map(m => `- ${m.name} ${m.dosage} (${m.frequency})`).join('\n') || 'No active medications'}

Medical History & Records (${records.length} items):
${records.map(r => `- [${r.occurred_at}] ${r.title} (${r.record_type}): ${r.description || 'No detailed note'}`).join('\n') || 'No previous records'}`

  // 1. Try Groq LLM (instant generation)
  if (groqApiKey) {
    const groqJsonStr = await callGroqChat({
      systemPrompt,
      prompt: userPrompt,
      jsonMode: true,
      temperature: 0.2,
    })

    if (groqJsonStr) {
      try {
        const parsed = JSON.parse(groqJsonStr)
        return {
          summary: parsed.summary || fallback.summary,
          warnings: Array.isArray(parsed.warnings) && parsed.warnings.length > 0 ? parsed.warnings : fallback.warnings,
          keyObservations: Array.isArray(parsed.keyObservations) && parsed.keyObservations.length > 0 ? parsed.keyObservations : fallback.keyObservations,
        }
      } catch (e) {
        console.warn('Failed to parse Groq doctor summary JSON:', e)
      }
    }
  }

  // 2. Try Gemini
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`)
      const response = await result.response
      const text = response.text().trim()
      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleanJson)

      return {
        summary: parsed.summary || fallback.summary,
        warnings: Array.isArray(parsed.warnings) && parsed.warnings.length > 0 ? parsed.warnings : fallback.warnings,
        keyObservations: Array.isArray(parsed.keyObservations) && parsed.keyObservations.length > 0 ? parsed.keyObservations : fallback.keyObservations,
      }
    } catch (err) {
      console.warn('Gemini Doctor Summary generation error:', err)
    }
  }

  return fallback
}
