export interface LiveReview {
  name: string;
  rating: number;
  date: string;
  text: string;
  verified: boolean;
}

export function fetchApprovedReviews(productId: string): Promise<LiveReview[]>;

declare function handler(req: unknown, res: unknown): Promise<unknown>;
export default handler;
