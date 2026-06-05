import { getDataset } from "../data";
import type { Dataset } from "../types";
import { buildBriefing, scoreAll } from "./attention";
import { buildDataConfidence, type DataConfidence } from "./dataConfidence";
import { buildTrends } from "./trends";
import { buildAlerts, alertCounts, type Alert } from "./alerts";
import type { Briefing, TrendReport } from "./types";

export * from "./types";
export { scoreToBand } from "./risk";
export { buildDataConfidence } from "./dataConfidence";
export type { DataConfidence } from "./dataConfidence";
export { alertCounts } from "./alerts";
export type { Alert } from "./alerts";

export interface ExecState {
  dataset: Dataset;
  briefing: Briefing;
  dataConfidence: DataConfidence;
  trends: TrendReport;
  alerts: Alert[];
  alertCounts: ReturnType<typeof alertCounts>;
}

let cached: Promise<ExecState> | null = null;

/** The full computed executive state — the single thing the UI/AI consume. */
export function getExecState(): Promise<ExecState> {
  if (!cached) {
    cached = (async () => {
      const dataset = await getDataset();
      const briefing = buildBriefing(dataset);
      const dataConfidence = buildDataConfidence(dataset);
      const trends = buildTrends(dataset, briefing);
      const alerts = buildAlerts(dataset, briefing, trends);
      return { dataset, briefing, dataConfidence, trends, alerts, alertCounts: alertCounts(alerts) };
    })();
  }
  return cached;
}

/** Detailed view for a single attention item (used by drill-down pages). */
export async function getItemDetail(itemId: string) {
  const { dataset, briefing } = await getExecState();
  const item = briefing.items.find((i) => i.id === itemId);
  if (!item) return null;
  const { projectScores, clientScores } = scoreAll(dataset);
  return { item, dataset, projectScores, clientScores };
}
