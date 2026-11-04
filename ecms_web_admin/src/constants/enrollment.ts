import type { EnrollmentStatus } from '@/services/types/enrollment';

/** Nhãn tiếng Việt cho trạng thái ghi danh — dùng thống nhất toàn bộ UI admin. */
export const ENROLLMENT_STATUS_LABEL: Record<EnrollmentStatus, string> = {
  PENDING: 'Chờ khai giảng',
  ACTIVE: 'Đang học',
  RESERVED: 'Bảo lưu',
  TERMINATED: 'Đã chấm dứt',
  COMPLETED: 'Hoàn thành',
};

export const ENROLLMENT_STATUS_COLOR: Record<EnrollmentStatus, string> = {
  PENDING: 'gold',
  ACTIVE: 'green',
  RESERVED: 'blue',
  TERMINATED: 'default',
  COMPLETED: 'purple',
};

export const ENROLLMENT_STATUS_OPTIONS = (
  Object.keys(ENROLLMENT_STATUS_LABEL) as EnrollmentStatus[]
).map((value) => ({ value, label: ENROLLMENT_STATUS_LABEL[value] }));

export const ENROLLMENT_STATUS_FLOW =
  'Chờ khai giảng → Đang học → Hoàn thành · Đang học ⇄ Bảo lưu · Bất kỳ → Đã kết thúc';

export const HOLD_REASON_PRESETS = [
  'Học viên xin tạm nghỉ',
  'Học viên bận việc gia đình',
  'Học viên ốm / điều trị',
  'Theo yêu cầu của phụ huynh',
  'Lý do khác',
];

export const TERMINATE_REASON_PRESETS = [
  'Học viên xin nghỉ học',
  'Chuyển sang khóa học khác',
  'Không liên lạc được với học viên',
  'Không đủ điều kiện tiếp tục học',
  'Lý do khác',
];
