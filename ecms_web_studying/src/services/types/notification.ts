export interface NotificationResponse {
  /** ID của recipient (dùng cho mark read/delete) */
  id: number;
  /** ID của notification gốc */
  notificationId: number;
  senderAccountId?: number;
  senderName?: string;
  notificationType: string;
  title: string;
  content?: string;
  referenceType?: string;
  referenceId?: number;
  extraData?: Record<string, unknown>;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  createdAt: string;
  expiresAt?: string;
  isRead: boolean;
  readAt?: string;
  receivedAt?: string;
}

export interface NotificationSearchRequest {
  notificationType?: string;
  priority?: string;
  isRead?: boolean;
  fromDate?: string;
  toDate?: string;
  keyword?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}