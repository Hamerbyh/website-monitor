import monitoringContent from "@/content/monitoring.json";

export const CHECK_INTERVAL_OPTIONS = monitoringContent.intervalOptions;

export function getIntervalLabel(intervalMinutes: number) {
  return (
    CHECK_INTERVAL_OPTIONS.find((option) => option.value === intervalMinutes)?.label ??
    `${intervalMinutes} 分钟`
  );
}
