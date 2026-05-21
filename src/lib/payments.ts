import { api } from "./api";

export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";

export interface Payment {
  id: string;
  user_id: string;
  booking_id: string | null;
  tracker_token: string;
  amount_pkr: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  trackerToken: string;
  paymentId: string;
  amountPkr: number;
  currency: string;
}

export interface PaymentStatusResponse {
  payment: Payment;
  safepayState?: string;
}

/** Create SafePay hosted checkout via backend (PKR). */
export async function createCheckout(params: {
  amountPkr: number;
  bookingId?: string;
  source?: "hosted" | "mobile";
}): Promise<CheckoutResponse> {
  const { data } = await api.post<CheckoutResponse>("/payments/checkout", params);
  return data;
}

/** Poll payment status by SafePay tracker token. */
export async function getPaymentStatus(
  trackerToken: string
): Promise<PaymentStatusResponse> {
  const { data } = await api.get<PaymentStatusResponse>(
    `/payments/${trackerToken}`
  );
  return data;
}
