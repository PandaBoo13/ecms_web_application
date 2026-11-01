// src/services/types/course/room.ts

export interface RoomResponse {
  id: number;
  code?: string;
  name: string;
  capacity?: number;
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomRequest {
  code?: string;
  name: string;
  capacity?: number;
  location?: string;
  isActive?: boolean;
}