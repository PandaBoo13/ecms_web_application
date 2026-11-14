// src/services/types/course/category.ts

export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  parentName?: string;
  isActive: boolean;
  childCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryCreateRequest {
  name: string;
  slug?: string;
  description?: string;
  parentId?: number;
}

export interface CategoryUpdateRequest {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: number;
  isActive?: boolean;
}

export interface CategoryTreeResponse {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  isActive: boolean;
  childCount?: number;
  children?: CategoryTreeResponse[];
}