// BrisaStory publicly launched on 20 September 2026 (Malaysia time). Content
// and weekly editions dated earlier are shown as launch day so the site never
// presents a date before it existed.
export const LAUNCH_DATE = new Date("2026-09-20T00:00:00+08:00");

// Dates are displayed in the editorial timezone; formatting the launch
// instant in UTC would otherwise show 19 September.
export const DISPLAY_TIME_ZONE = "Asia/Kuala_Lumpur";

export function clampToLaunch(value: string | Date): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return date;
  return date.getTime() < LAUNCH_DATE.getTime() ? new Date(LAUNCH_DATE) : date;
}
