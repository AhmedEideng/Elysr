export const GOOGLE_SHEETS_TIMEOUT_MS: number;
export function validateReviewPayload(payload: unknown): string | undefined;

declare function handler(req: unknown, res: unknown): Promise<unknown>;
export default handler;
