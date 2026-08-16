import { supabase } from '../supabase'

export interface MonthTrend {
  month: string
  recordsCount: number
}

export interface CategoryDistribution {
  name: string
  count: number
}

export interface VitalsTrendPoint {
  dateLabel: string
  systolic: number
  diastolic: number
  heartRate?: number
}

export interface HealthAnalyticsSummary {
  totalRecordsCount: number
  activeMedicationsCount: number
  activeConditionsCount: number
  avgSystolic: number
  avgDiastolic: number
  avgHeartRate: number
  vitalsTrend: VitalsTrendPoint[]
  monthlyTrends: MonthTrend[]
  categoryDistribution: CategoryDistribution[]
  recentTitles: string[]
}

export async function getHealthAnalyticsSummary(patientId: string): Promise<HealthAnalyticsSummary> {
  const [
    { data: vitals },
    { data: visits },
    { data: prescriptions },
    { data: medications },
    { data: labReports },
    { data: vaccinations },
    { data: surgeries },
    { data: diseases },
  ] = await Promise.all([
    supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: true })
      .limit(14),
    supabase.from('visits').select('id, visit_date, diagnosis, hospital_name').eq('patient_id', patientId),
    supabase.from('prescriptions').select('id, start_date, medicine_name').eq('patient_id', patientId),
    supabase.from('medications').select('id, name, active').eq('patient_id', patientId).eq('active', true),
    supabase.from('lab_reports').select('id, report_date, report_type').eq('patient_id', patientId),
    supabase.from('vaccinations').select('id, administered_date, vaccine_name').eq('patient_id', patientId),
    supabase.from('surgeries').select('id, surgery_date, surgery_type').eq('patient_id', patientId),
    supabase.from('diseases').select('id, status').eq('patient_id', patientId).eq('status', 'active'),
  ])

  const fetchedVitals = vitals || []
  const fetchedVisits = visits || []
  const fetchedRx = prescriptions || []
  const fetchedMeds = medications || []
  const fetchedLabs = labReports || []
  const fetchedVacs = vaccinations || []
  const fetchedSurgs = surgeries || []
  const fetchedDiseases = diseases || []

  // Vitals Trend & Averages
  const vitalsTrend: VitalsTrendPoint[] = fetchedVitals.map((v) => {
    const d = new Date(v.recorded_at)
    return {
      dateLabel: isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      systolic: v.bp_systolic || 120,
      diastolic: v.bp_diastolic || 80,
      heartRate: v.heart_rate || 72,
    }
  })

  const sysList = fetchedVitals.map((v) => v.bp_systolic).filter((val): val is number => val != null)
  const diaList = fetchedVitals.map((v) => v.bp_diastolic).filter((val): val is number => val != null)
  const hrList = fetchedVitals.map((v) => v.heart_rate).filter((val): val is number => val != null)

  const avgSystolic = sysList.length > 0 ? Math.round(sysList.reduce((a, b) => a + b, 0) / sysList.length) : 120
  const avgDiastolic = diaList.length > 0 ? Math.round(diaList.reduce((a, b) => a + b, 0) / diaList.length) : 80
  const avgHeartRate = hrList.length > 0 ? Math.round(hrList.reduce((a, b) => a + b, 0) / hrList.length) : 72

  // Category Distribution
  const categoryDistribution: CategoryDistribution[] = [
    { name: 'Visits', count: fetchedVisits.length },
    { name: 'Prescriptions', count: fetchedRx.length },
    { name: 'Lab Reports', count: fetchedLabs.length },
    { name: 'Vaccinations', count: fetchedVacs.length },
    { name: 'Surgeries', count: fetchedSurgs.length },
  ]

  // Total Records
  const totalRecordsCount =
    fetchedVisits.length +
    fetchedRx.length +
    fetchedLabs.length +
    fetchedVacs.length +
    fetchedSurgs.length

  // Monthly trends over past 6 months
  const monthsMap: Record<string, number> = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    monthsMap[key] = 0
  }

  const allEventDates: string[] = [
    ...fetchedVisits.map((v) => v.visit_date),
    ...fetchedRx.map((r) => r.start_date).filter((d): d is string => d != null),
    ...fetchedLabs.map((l) => l.report_date),
    ...fetchedVacs.map((v) => v.administered_date),
    ...fetchedSurgs.map((s) => s.surgery_date),
  ]

  allEventDates.forEach((dateStr) => {
    if (!dateStr) return
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    if (monthsMap[key] !== undefined) {
      monthsMap[key] += 1
    }
  })

  const monthlyTrends: MonthTrend[] = Object.entries(monthsMap).map(([month, recordsCount]) => ({
    month,
    recordsCount,
  }))

  const recentTitles: string[] = [
    ...fetchedVisits.map((v) => v.diagnosis || v.hospital_name),
    ...fetchedLabs.map((l) => l.report_type),
    ...fetchedSurgs.map((s) => s.surgery_type),
  ].filter((t): t is string => Boolean(t)).slice(0, 5)

  return {
    totalRecordsCount,
    activeMedicationsCount: fetchedMeds.length,
    activeConditionsCount: fetchedDiseases.length,
    avgSystolic,
    avgDiastolic,
    avgHeartRate,
    vitalsTrend,
    monthlyTrends,
    categoryDistribution,
    recentTitles,
  }
}
