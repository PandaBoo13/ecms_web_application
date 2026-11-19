export interface RequestCreateRequest {
  requestType: string;
  title: string;
  description?: string;
  targetEntityId?: number | null;
  payload?: Record<string, unknown>;
}

export interface RequestResponseData {
  id: number;
  requestCode: string;
  requestType: string;
  status: string;
  title?: string;
}
