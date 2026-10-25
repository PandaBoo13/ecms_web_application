export type LeadStatus = 'NEW' | 'CONSULTED';

export type InteractionResult =
  | 'INTERESTED'
  | 'CONSIDERING'
  | 'REJECTED'
  | 'CANNOT_CONTACT';

export type RejectReason =
  | 'TUITION_HIGH'
  | 'SCHEDULE_MISMATCH'
  | 'CHOSE_ANOTHER_CENTER'
  | 'UNREACHABLE'
  | 'OTHER';

export type LeadTestStatus =
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'REFUSED'
  | 'NOT_ATTENDED';

export type InteractionType = 'CALL' | 'MEETING' | 'EMAIL' | 'CHAT' | 'OTHER';

export interface Lead {
  id: number;
  fullName: string;
  email?: string;
  phone?: string;
  courseId?: number;
  studentId?: number;
  status: LeadStatus;
  convertedAt?: string;
  sourceId?: number;
  assignedConsultantId?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadSource {
  id: number;
  sourceName: string;
  channelType: 'ONLINE' | 'OFFLINE';
}

export interface LeadInteraction {
  id: number;
  leadId: number;
  interactionType: InteractionType;
  notes?: string;
  result: InteractionResult;
  rejectReason?: RejectReason | string;
  performedBy?: number;
  createdAt: string;
}

export interface LeadPlacementTest {
  id: number;
  leadId: number;
  testStatus: LeadTestStatus;
  scheduledAt?: string;
  testScore?: number;
  recommendedLevel?: string;
  notes?: string;
  evaluatedAt?: string;
  createdAt: string;
}

export interface LeadStatusLog {
  id: number;
  leadId: number;
  oldStatus?: string;
  newStatus: string;
  reason?: string;
  changedBy?: number;
  changedAt: string;
}

export interface LeadAssignmentLog {
  id: number;
  leadId: number;
  oldConsultantId?: number;
  newConsultantId?: number;
  reason?: string;
  changedBy?: number;
  changedAt: string;
}

export interface LeadDetail extends Lead {
  interactions: LeadInteraction[];
  placementTests: LeadPlacementTest[];
  statusLogs: LeadStatusLog[];
  assignmentLogs: LeadAssignmentLog[];
}

export interface LeadFilterParams {
  search?: string;
  status?: LeadStatus;
  courseId?: number;
  sourceId?: number;
  consultantId?: number;
  inQueue?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'asc' | 'desc';
}

export interface LeadCreatePayload {
  fullName: string;
  email?: string;
  phone?: string;
  courseId?: number;
  sourceId?: number;
  assignedConsultantId?: number;
  status?: LeadStatus;
  note?: string;
}

export interface LeadUpdatePayload {
  fullName?: string;
  email?: string;
  phone?: string;
  courseId?: number;
  sourceId?: number;
  studentId?: number;
  assignedConsultantId?: number;
  status?: LeadStatus;
  note?: string;
}

export interface LeadAssignPayload {
  consultantId: number;
  reason?: string;
}

export interface LeadInteractionCreatePayload {
  interactionType: InteractionType;
  notes?: string;
  result: InteractionResult;
  rejectReason?: string;
}

export interface LeadPlacementTestCreatePayload {
  testStatus: LeadTestStatus;
  scheduledAt?: string;
  testScore?: number;
  recommendedLevel?: string;
  notes?: string;
  evaluatedAt?: string;
}

