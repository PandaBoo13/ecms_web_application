export interface DashboardStats {
  totalUsers: number;
  totalInstructors: number;
  totalStudents: number;
  totalCourses: number;
  totalRevenue: number;
}

export interface AuditLogResponse {
  id: number;
  actorId: number;
  action: string;
  entityType: string;
  entityId?: number;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}