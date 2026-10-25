export interface SpecializationResponse {
  accountId: number;
  instructorName?: string;
  instructorEmail?: string;
  categoryId: number;
  categoryName?: string;
  categorySlug?: string;
  isPrimary: boolean;
  yearsOfExp?: number;
  createdAt: string;
}

export interface SpecializationAddRequest {
  categoryId: number;
  isPrimary?: boolean;
  yearsOfExp?: number;
}