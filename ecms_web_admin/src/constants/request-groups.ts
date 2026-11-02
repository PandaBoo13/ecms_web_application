import type { RequestType } from '@/services/types/request/request';

export interface RequestGroup {
  key: string;
  labelKey: string;
  icon: string;
  types: RequestType[];
}

export const REQUEST_GROUPS: RequestGroup[] = [
  {
    key: 'course',
    labelKey: 'request.group.course',
    icon: 'BookOutlined',
    types: [
      'COURSE_REVIEW',
      'COURSE_UNPUBLISH',
      'COURSE_CLONE',
      'COURSE_DELETE',
      'COURSE_PRICE_CHANGE',
      'COURSE_TEACHER_CHANGE',
    ],
  },
  {
    key: 'schedule',
    labelKey: 'request.group.schedule',
    icon: 'CalendarOutlined',
    types: [
      'SCHEDULE_CHANGE',
      'SCHEDULE_CANCEL',
      'ROOM_CHANGE',
      'SESSION_SUBSTITUTE',
      'SESSION_EXTEND',
      'SESSION_ADD',
    ],
  },
  {
    key: 'finance',
    labelKey: 'request.group.finance',
    icon: 'DollarOutlined',
    types: [
      'INVOICE_REFUND',
      'INVOICE_ADJUSTMENT',
      'INVOICE_CANCEL',
      'INVOICE_EXTEND_DUE',
      'PAYMENT_CONFIRM',
    ],
  },
  {
    key: 'enrollment',
    labelKey: 'request.group.enrollment',
    icon: 'SolutionOutlined',
    types: [
      'ENROLLMENT_TERMINATE',
      'ENROLLMENT_RESERVE',
      'ENROLLMENT_RESUME',
      'ENROLLMENT_TRANSFER',
    ],
  },
  {
    key: 'student',
    labelKey: 'request.group.student',
    icon: 'TeamOutlined',
    types: [
      'STUDENT_STATUS_CHANGE',
      'STUDENT_LOCK_ACCOUNT',
      'STUDENT_PROFILE_UPDATE',
    ],
  },
  {
    key: 'lead',
    labelKey: 'request.group.lead',
    icon: 'UserAddOutlined',
    types: ['LEAD_ASSIGNMENT', 'LEAD_CLOSE', 'LEAD_CONVERT'],
  },
  {
    key: 'account',
    labelKey: 'request.group.account',
    icon: 'UserOutlined',
    types: [
      'ACCOUNT_ROLE_CHANGE',
      'ACCOUNT_RESET_PASSWORD',
      'ACCOUNT_UNLOCK',
      'INSTRUCTOR_SPEC_ADD',
    ],
  },
  {
    key: 'support',
    labelKey: 'request.group.support',
    icon: 'FileTextOutlined',
    types: [
      'SUPPORT_TICKET',
      'FEEDBACK',
      'BUG_REPORT',
      'FEATURE_REQUEST',
      'COMPLAINT',
      'SUGGESTION',
      'DOCUMENT_REQUEST',
      'CERTIFICATE_REQUEST',
      'LEAVE_FEEDBACK',
      'DATA_EXPORT',
      'NOTIFICATION_BROADCAST',
      'NOTIFICATION_BLAST',
    ],
  },
  {
    key: 'hr',
    labelKey: 'request.group.hr',
    icon: 'ProfileOutlined',
    types: [
      'LEAVE_REQUEST',
      'OVERTIME_REQUEST',
      'EXPENSE_CLAIM',
      'EQUIPMENT_REQUEST',
    ],
  },
];

export function getGroupByKey(key: string): RequestGroup | undefined {
  return REQUEST_GROUPS.find((g) => g.key === key);
}