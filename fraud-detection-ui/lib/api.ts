const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export interface ApiGraphNode {
  id: string
  label: string
  type: string
  isSuspect: boolean
  inpplc?: Record<string, unknown> | null
}

export interface ApiGraphEdge {
  source: string
  target: string
  weight: string
  relation?: string | null
}

export interface ApiContract {
  id: string
  title: string
  vendor: string
  amount: string
  date: string
  status: 'sain' | 'suspect' | 'rejete'
  riskScore: number
}

export interface AnalyzeResponse {
  nodes: ApiGraphNode[]
  edges: ApiGraphEdge[]
  contracts: ApiContract[]
  stats: Record<string, number>
  source: string
}

export interface StatsResponse {
  stats: Record<string, number>
  source: string
  suspect_contracts: number
  rejected_contracts: number
}

export interface ReportPayload {
  title: string
  description: string
  urgency: string
  anonymous_identifier?: string
  anonymous_password?: string
}

export interface ReportResponse {
  id: string
  title: string
  status: string
  anonymous_token?: string | null
  message: string
}

export interface ReportHistoryItem {
  id: string
  title: string
  status: string
  submittedDate: string
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(errorBody || `Erreur API (${response.status})`)
  }
  return response.json() as Promise<T>
}

export async function fetchAnalyze(): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  return handleResponse<AnalyzeResponse>(response)
}

/** Endpoint léger : stats uniquement, sans les nœuds/arêtes complets. */
export async function fetchStats(): Promise<StatsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/stats`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  return handleResponse<StatsResponse>(response)
}

export async function submitReport(payload: ReportPayload): Promise<ReportResponse> {
  const response = await fetch(`${API_BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<ReportResponse>(response)
}

export async function fetchReportHistory(): Promise<ReportHistoryItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/reports/history`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  const data = await handleResponse<{ reports: ReportHistoryItem[] }>(response)
  return data.reports
}

/** Adapte la réponse API au format attendu par NetworkGraph */
export function mapAnalyzeToGraphData(data: AnalyzeResponse) {
  return {
    nodes: data.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      type: node.type,
      collusion: node.isSuspect,
      inpplc: node.inpplc,
    })),
    edges: data.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
      relation: edge.relation ?? null,
    })),
  }
}

export { API_BASE_URL }
