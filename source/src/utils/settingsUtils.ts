import type { TFunction } from 'i18next'

/** 弹出层垂直偏移，对应 spacing-2 (0.5rem = 8px) */
export const POPOVER_OFFSET = 8

/** 格式化相对时间（x分钟前） */
export function formatTimeAgo(timestamp: number, t: TFunction): string {
  const diffMs = Date.now() - timestamp
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return t('justNow')
  if (diffMins < 60) return t('minutesAgo', { count: diffMins })
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return t('hoursAgo', { count: diffHours })
  return t('daysAgo', { count: Math.floor(diffHours / 24) })
}
