export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ReviewRequestResult {
  reviewId: string;
  token: string;
}

export interface SubmitReviewResult {
  success: boolean;
}

export interface PublicReviewItem {
  rating: number;
  comment: string | null;
  patientName: string;
  createdAt: Date;
}
