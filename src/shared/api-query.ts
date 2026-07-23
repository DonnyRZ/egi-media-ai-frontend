export type IssueQueryValue = "all" | "tinggi" | "sedang" | "rendah" | "baru" | "berkembang" | "dipantau" | "selesai";
export type IssuePeriod = "all" | "24jam" | "7hari" | "30hari";

export function buildIssueListParams(params: { q?: string; priority?: IssueQueryValue; status?: IssueQueryValue; period?: IssuePeriod; page?: number; limit?: number }) {
  return {
    q: params.q?.trim() || undefined,
    priority: params.priority && params.priority !== "all" ? params.priority : undefined,
    status: params.status && params.status !== "all" ? params.status : undefined,
    ...(params.period && params.period !== "all" ? { period: params.period } : {}),
    page: params.page && params.page > 0 ? Math.floor(params.page) : 1,
    limit: params.limit && params.limit > 0 ? Math.min(Math.floor(params.limit), 100) : 20,
  };
}
