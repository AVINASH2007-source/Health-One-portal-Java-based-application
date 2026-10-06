/**
 * OpenFDA API Integration Module
 * Queries FDA regulatory & drug labeling database for verification,
 * active ingredients, brand/generic resolution, and safety warnings.
 * https://open.fda.gov/apis/
 */

export interface OpenFDADrugInfo {
  brand_name: string
  generic_name?: string
  active_ingredients?: string[]
  dosage_form?: string
  warnings?: string[]
  fda_application_number?: string
  verified_by_fda: boolean
}

export async function verifyDrugWithOpenFDA(drugName: string): Promise<OpenFDADrugInfo> {
  const cleanName = drugName.trim().replace(/[^\w\s-]/gi, '')
  if (!cleanName || cleanName.length < 2) {
    return { brand_name: drugName, verified_by_fda: false }
  }

  // Extract base drug term (e.g. "Amoxicillin 500mg" -> "Amoxicillin")
  const baseTerm = cleanName.split(/\s+\d+/)[0].trim() || cleanName

  const fdaApiKey = (import.meta.env.VITE_FDA_API_KEY as string) || (import.meta.env.FDA_API_KEY as string) || ''
  const apiKeyParam = fdaApiKey ? `&api_key=${encodeURIComponent(fdaApiKey)}` : ''

  try {
    // 1. Query openFDA Label API by exact brand_name or generic_name
    let url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(baseTerm)}"+OR+openfda.generic_name:"${encodeURIComponent(baseTerm)}"${apiKeyParam}&limit=1`
    let response = await fetch(url)
    let json = await response.json()

    // 2. Fallback to broad wildcard search if exact match returned 0 results
    if (!json.results || json.results.length === 0) {
      url = `https://api.fda.gov/drug/label.json?search="${encodeURIComponent(baseTerm)}"${apiKeyParam}&limit=1`
      response = await fetch(url)
      json = await response.json()
    }

    if (json.results && json.results.length > 0) {
      const label = json.results[0]
      const openfda = label.openfda || {}

      const brandName = openfda.brand_name ? openfda.brand_name[0] : baseTerm
      const genericName = openfda.generic_name ? openfda.generic_name[0] : undefined
      const ingredients = openfda.substance_name || label.active_ingredient || []
      const dosageForm = openfda.dosage_form ? openfda.dosage_form[0] : undefined
      const warningsText = label.warnings ? label.warnings[0].slice(0, 200) : undefined

      return {
        brand_name: brandName,
        generic_name: genericName,
        active_ingredients: Array.isArray(ingredients) ? ingredients.slice(0, 3) : [String(ingredients)],
        dosage_form: dosageForm,
        warnings: warningsText ? [warningsText] : [],
        fda_application_number: openfda.application_number ? openfda.application_number[0] : undefined,
        verified_by_fda: true,
      }
    }
  } catch (err) {
    console.warn('OpenFDA API lookup notice:', err)
  }

  return { brand_name: drugName, verified_by_fda: false }
}
