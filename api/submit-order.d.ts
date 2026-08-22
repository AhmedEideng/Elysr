export interface OrderValidationResult {
  success?: boolean;
  orderId?: string;
  error?: string;
}

export const GOOGLE_SHEETS_TIMEOUT_MS: number;
export function getShippingCost(governorate: string, subtotal?: number): number;
export function validateOrderPayload(payload: unknown): string | undefined;

declare function handler(req: unknown, res: unknown): Promise<unknown>;
export default handler;
