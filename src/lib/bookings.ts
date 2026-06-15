import { api } from "./api";

export type BookingStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

export interface AdminBookingRow {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  payment_status: string;
  price_pkr: number;
  commission_pkr: number;
  created_at: string;
  shop_id: string;
  customer_id: string;
  worker_id: string | null;
  barber_shops: { name: string; city: string } | null;
  profiles: { name: string; email: string } | null;
  shop_services: { name: string } | null;
  workers: { name: string } | null;
}

export async function fetchAdminBookings(params?: {
  status?: BookingStatus;
  shopId?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<AdminBookingRow[]> {
  const { data } = await api.get("/admin/bookings", { params });
  return (data.bookings ?? []) as AdminBookingRow[];
}
