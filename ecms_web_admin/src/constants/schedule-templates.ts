// src/constants/schedule-templates.ts
export const SCHEDULE_TEMPLATES = {
  'WE-M1': { days: [7, 8],    start: '07:30', end: '09:30', label: 'Cuối tuần sáng 1' },
  'WE-M2': { days: [7, 8],    start: '09:45', end: '11:45', label: 'Cuối tuần sáng 2' },
  'WE-A1': { days: [7, 8],    start: '14:00', end: '16:00', label: 'Cuối tuần chiều 1' },
  'WE-A2': { days: [7, 8],    start: '16:15', end: '18:15', label: 'Cuối tuần chiều 2' },
  'MW-E1': { days: [2, 4, 6], start: '17:30', end: '19:30', label: 'Tối T2-4-6 (ca 1)' },
  'MW-E2': { days: [2, 4, 6], start: '19:45', end: '21:45', label: 'Tối T2-4-6 (ca 2)' },
  'TT-E1': { days: [3, 5, 7], start: '17:30', end: '19:30', label: 'Tối T3-5-7 (ca 1)' },
  'TT-E2': { days: [3, 5, 7], start: '19:45', end: '21:45', label: 'Tối T3-5-7 (ca 2)' },
} as const;

export type ScheduleTemplateCode = keyof typeof SCHEDULE_TEMPLATES;