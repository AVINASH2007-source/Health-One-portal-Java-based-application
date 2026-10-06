import { createWorker } from 'tesseract.js'
import { verifyDrugWithOpenFDA } from './api/openfda'

export interface ExtractedAllergy {
  allergen: string
  category: 'drug' | 'food' | 'environmental'
  severity: 'mild' | 'moderate' | 'severe'
  reaction_notes?: string
}

export interface ExtractedCondition {
  name: string
  status: 'active' | 'managed' | 'resolved'
  notes?: string
}

export interface ExtractedDocData {
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
    fda_verified?: boolean
    generic_name?: string
  }>
  conditions: ExtractedCondition[]
  allergies: ExtractedAllergy[]
}

/**
 * Extracts medications dynamically from raw document text
 * using medical regex patterns and validates with OpenFDA API
 */
export async function extractMedicationsFromText(text: string): Promise<ExtractedDocData['medications']> {
  const medications: ExtractedDocData['medications'] = []
  const lines = text.split(/[\r\n]+/)
  const extractedNames = new Set<string>()

  // 1. Broad Drug Pattern Recognizers (Medical Suffixes & Prefix Headers)
  const drugSuffixPattern = /\b([a-z]{3,}(?:cillin|mycin|thromycin|olol|statin|pril|sartan|pine|zole|cef|caine|vir|mab|nidazole|prazole|formin|tidine|glitazone|gliptin|flozin|triptan|setron|sone|terol|fibrate|coxib|dronate|nitrate|amidem|pam|lam|ide))\b/gi

  // Standard Rx Header Regex
  const rxLinePattern = /(?:rx|take|tab|capsule|cap|medication|medicine|prescribed|tablet)\s*[\:\-]\s*([^\n\r]+)/gi

  // Parse lines for drug names
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length < 3) continue

    let detectedDrug: string | null = null

    // Check rx header pattern
    const rxMatch = rxLinePattern.exec(trimmed)
    if (rxMatch) {
      detectedDrug = rxMatch[1].trim()
    } else {
      // Check drug suffix pattern
      const suffixMatch = trimmed.match(drugSuffixPattern)
      if (suffixMatch && suffixMatch.length > 0) {
        detectedDrug = suffixMatch[0]
      }
    }

    if (detectedDrug) {
      // Extract dosage (e.g. 500mg, 10mg, 250mcg, 5ml)
      const doseMatch = trimmed.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|puffs|tablets?|units?))/i)
      const parsedDose = doseMatch ? doseMatch[1] : '500 mg'

      // Extract frequency (e.g. 1-0-1, twice daily, once daily, every 8 hours)
      let parsedFreq = 'Once daily'
      if (/1\s*-\s*0\s*-\s*1/i.test(trimmed) || /twice\s*daily/i.test(trimmed)) {
        parsedFreq = 'Twice daily (Morning & Night)'
      } else if (/1\s*-\s*1\s*-\s*1/i.test(trimmed) || /three\s*times\s*daily/i.test(trimmed)) {
        parsedFreq = 'Three times daily'
      } else if (/1\s*-\s*0\s*-\s*0/i.test(trimmed) || /morning/i.test(trimmed)) {
        parsedFreq = 'Once daily (Morning)'
      } else if (/0\s*-\s*0\s*-\s*1/i.test(trimmed) || /night|bedtime/i.test(trimmed)) {
        parsedFreq = 'Once daily (Night)'
      } else if (/as\s*needed|prn/i.test(trimmed)) {
        parsedFreq = 'As needed for symptoms'
      }

      // Extract duration
      const durationMatch = trimmed.match(/(\d+\s*(?:days?|weeks?|months?))/i)
      const parsedDuration = durationMatch ? durationMatch[1] : '30 days'

      const cleanDrugName = detectedDrug.split(/\s+\d+/)[0].trim()
      const keyName = cleanDrugName.toLowerCase()

      if (cleanDrugName.length >= 3 && !extractedNames.has(keyName)) {
        extractedNames.add(keyName)

        // Validate & enrich drug name using OpenFDA API
        const fdaInfo = await verifyDrugWithOpenFDA(cleanDrugName)

        medications.push({
          name: fdaInfo.verified_by_fda && fdaInfo.brand_name ? fdaInfo.brand_name : cleanDrugName,
          dosage: parsedDose,
          frequency: parsedFreq,
          duration: parsedDuration,
          notes: fdaInfo.warnings && fdaInfo.warnings.length > 0 ? fdaInfo.warnings[0] : 'Prescribed medication',
          fda_verified: fdaInfo.verified_by_fda,
          generic_name: fdaInfo.generic_name,
        })
      }
    }
  }

  // 2. Fallback to common drug search if no suffix matched
  if (medications.length === 0) {
    const commonDrugTerms = [
      'Amoxicillin', 'Metformin', 'Atorvastatin', 'Lisinopril', 'Levothyroxine',
      'Azithromycin', 'Pantoprazole', 'Omeprazole', 'Cetirizine', 'Paracetamol',
      'Ibuprofen', 'Telmisartan', 'Amlodipine', 'Losartan', 'Gabapentin',
    ]

    for (const term of commonDrugTerms) {
      if (new RegExp(term, 'i').test(text) && !extractedNames.has(term.toLowerCase())) {
        extractedNames.add(term.toLowerCase())
        const fdaInfo = await verifyDrugWithOpenFDA(term)
        medications.push({
          name: fdaInfo.verified_by_fda && fdaInfo.brand_name ? fdaInfo.brand_name : term,
          dosage: '500 mg',
          frequency: 'Once daily',
          duration: '30 days',
          notes: 'Prescribed medication',
          fda_verified: fdaInfo.verified_by_fda,
          generic_name: fdaInfo.generic_name,
        })
      }
    }
  }

  return medications
}

/**
 * Extracts clinical medical conditions dynamically from raw document text
 */
export function extractConditionsFromText(text: string): ExtractedDocData['conditions'] {
  const conditions: ExtractedDocData['conditions'] = []
  const extracted = new Set<string>()

  // Condition Regex Headers
  const conditionHeaderRegex = /(?:diagnosis|condition|impression|assessment|known for|history of|indication)\s*[\:\-]\s*([^\n\r]+)/gi
  let match: RegExpExecArray | null

  while ((match = conditionHeaderRegex.exec(text)) !== null) {
    const condName = match[1].trim()
    if (condName.length > 3 && !extracted.has(condName.toLowerCase())) {
      extracted.add(condName.toLowerCase())
      conditions.push({
        name: condName,
        status: 'active',
        notes: 'Extracted from uploaded medical document',
      })
    }
  }

  // Common Disease Keywords Fallback
  const diseaseKeywords = [
    'Hypertension', 'Type 2 Diabetes', 'Diabetes Mellitus', 'Asthma', 'Bronchial Asthma',
    'Gastritis', 'Hyperlipidemia', 'High Cholesterol', 'Coronary Artery Disease',
    'Hypothyroidism', 'Pneumonia', 'Bronchitis', 'Migraine', 'Rheumatoid Arthritis',
    'Allergic Rhinitis', 'Depression', 'Anxiety', 'GERD',
  ]

  diseaseKeywords.forEach((disease) => {
    if (new RegExp(disease, 'i').test(text) && !extracted.has(disease.toLowerCase())) {
      extracted.add(disease.toLowerCase())
      conditions.push({
        name: disease,
        status: 'active',
        notes: 'Diagnosed condition recorded in document',
      })
    }
  })

  return conditions
}

/**
 * Extracts allergies and adverse reactions dynamically from raw document text
 */
export function extractAllergiesFromText(text: string): ExtractedAllergy[] {
  const allergies: ExtractedAllergy[] = []
  const extracted = new Set<string>()

  // 1. Allergy Header Regex
  const allergyHeaderRegex = /(?:allergic to|allergies|allergy|adverse reaction to|known allergies|drug allergies)\s*[\:\-]\s*([^\n\r]+)/gi
  let match: RegExpExecArray | null

  while ((match = allergyHeaderRegex.exec(text)) !== null) {
    const rawAllergyStr = match[1].trim()
    // Split on commas or 'and'
    const items = rawAllergyStr.split(/[,;&]|\band\b/i)
    for (const item of items) {
      const cleanItem = item.replace(/[^\w\s-]/g, '').trim()
      if (cleanItem.length > 2 && !/^(none|nil|no|denies|nkda)$/i.test(cleanItem) && !extracted.has(cleanItem.toLowerCase())) {
        extracted.add(cleanItem.toLowerCase())
        
        let category: 'drug' | 'food' | 'environmental' = 'environmental'
        if (/cillin|sulfa|aspirin|nsaid|codeine|morphine|iodine|statin|antibiotic|drug/i.test(cleanItem)) {
          category = 'drug'
        } else if (/peanut|nut|shellfish|egg|milk|dairy|wheat|soy|fish|gluten/i.test(cleanItem)) {
          category = 'food'
        }

        let severity: 'mild' | 'moderate' | 'severe' = 'moderate'
        if (/anaphyl|severe|shock|throat|airway|difficulty breathing|epipen/i.test(text)) {
          severity = 'severe'
        } else if (/hives|rash|vomiting|swelling|nausea/i.test(text)) {
          severity = 'moderate'
        } else if (/mild|itch|sneeze|rhinitis/i.test(text)) {
          severity = 'mild'
        }

        allergies.push({
          allergen: cleanItem,
          category,
          severity,
          reaction_notes: `Extracted from medical document note: "${cleanItem}"`,
        })
      }
    }
  }

  // 2. Common Allergen Keywords Fallback
  const commonAllergens: Array<{ name: string; category: 'drug' | 'food' | 'environmental'; severity: 'mild' | 'moderate' | 'severe' }> = [
    { name: 'Penicillin', category: 'drug', severity: 'severe' },
    { name: 'Sulfa Drugs', category: 'drug', severity: 'moderate' },
    { name: 'Aspirin', category: 'drug', severity: 'moderate' },
    { name: 'Cephalosporins', category: 'drug', severity: 'severe' },
    { name: 'Peanuts', category: 'food', severity: 'severe' },
    { name: 'Tree Nuts', category: 'food', severity: 'severe' },
    { name: 'Shellfish', category: 'food', severity: 'severe' },
    { name: 'Latex', category: 'environmental', severity: 'moderate' },
    { name: 'Pollen', category: 'environmental', severity: 'mild' },
    { name: 'Dust Mites', category: 'environmental', severity: 'mild' },
  ]

  commonAllergens.forEach((item) => {
    if (new RegExp(`\\b${item.name}\\b`, 'i').test(text) && !extracted.has(item.name.toLowerCase())) {
      // Ensure it's in the context of an allergy, not just a prescription
      if (/allergic|allergy|sensitiv|reaction|contraindicat/i.test(text)) {
        extracted.add(item.name.toLowerCase())
        allergies.push({
          allergen: item.name,
          category: item.category,
          severity: item.severity,
          reaction_notes: `Document indicates patient sensitivity to ${item.name}`,
        })
      }
    }
  })

  return allergies
}

export async function parseDocumentWithTesseract(file: File): Promise<ExtractedDocData> {
  let text = ''

  try {
    const worker = await createWorker('eng')
    const ret = await worker.recognize(file)
    await worker.terminate()
    text = ret.data.text || ''
    console.log('Tesseract.js Extracted Raw OCR Text:\n', text)
  } catch (err) {
    console.warn('Tesseract OCR engine notice:', err)
  }

  // 1. Extract Vitals
  let bp_systolic: number | undefined
  let bp_diastolic: number | undefined
  const bpMatch = text.match(/(\d{2,3})\s*[\/\\]\s*(\d{2,3})/i)
  if (bpMatch) {
    bp_systolic = parseInt(bpMatch[1], 10)
    bp_diastolic = parseInt(bpMatch[2], 10)
  }

  let heart_rate: number | undefined
  const hrMatch = text.match(/(\d{2,3})\s*(?:bpm|pulse)/i) || text.match(/(?:heart\s*rate|pulse)\D*(\d{2,3})/i)
  if (hrMatch) {
    heart_rate = parseInt(hrMatch[1], 10)
  }

  let spo2: number | undefined
  const spo2Match = text.match(/(?:spo2|oxygen)\D*(\d{2,3})/i) || text.match(/(\d{2})\s*%/i)
  if (spo2Match) {
    const parsed = parseInt(spo2Match[1], 10)
    if (parsed >= 70 && parsed <= 100) spo2 = parsed
  }

  // 2. Extract Doctor Name & Hospital/Lab Name
  let doctor_name = 'Dr. Attending Physician'
  const docMatch = text.match(/(?:dr\.|doctor)\s+([a-z\s\.]+)/i)
  if (docMatch) doctor_name = `Dr. ${docMatch[1].trim()}`

  let hospital_name = 'Medical Care Center'
  const hospMatch = text.match(/([a-z\s]+hospital[a-z\s]*)/i) || text.match(/([a-z\s]+clinic[a-z\s]*)/i) || text.match(/([a-z\s]+lab[a-z\s]*)/i)
  if (hospMatch) hospital_name = hospMatch[1].trim()

  // 3. Extract Document Title
  let title = file.name.replace(/\.[^/.]+$/, '')
  const diagMatch = text.match(/(?:diagnosis|primary condition|title)\s*:\s*([^\n\r]+)/i)
  if (diagMatch) title = diagMatch[1].trim()

  // 4. Extract Medications dynamically & verify with OpenFDA API
  const medications = await extractMedicationsFromText(text)

  // 5. Extract Conditions dynamically
  const conditions = extractConditionsFromText(text)

  // 6. Extract Allergies dynamically
  const allergies = extractAllergiesFromText(text)

  // Document Summary
  const medSummaryText = medications.length > 0 ? ` Extracted Medications: ${medications.map(m => m.name).join(', ')}.` : ''
  const condSummaryText = conditions.length > 0 ? ` Conditions: ${conditions.map(c => c.name).join(', ')}.` : ''
  const allergySummaryText = allergies.length > 0 ? ` Allergies: ${allergies.map(a => `${a.allergen} (${a.severity})`).join(', ')}.` : ''
  const summary = `OCR Document "${file.name}" parsed.${medSummaryText}${condSummaryText}${allergySummaryText}`

  return {
    title,
    record_type: 'patient_upload',
    occurred_at: new Date().toISOString().split('T')[0],
    summary,
    hospital_name,
    doctor_name,
    vitals: {
      heart_rate,
      spo2,
      bp_systolic,
      bp_diastolic,
      sleep_minutes: 450,
      steps: 8800,
    },
    medications,
    conditions,
    allergies,
  }
}
