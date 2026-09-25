import { api } from "./api";

export interface BarberShopSummary {
  id: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  city: string;
  is_public: boolean;
}

export interface AdminBarber {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
  email_verified_at: string | null;
  shops: BarberShopSummary[];
  shop_count: number;
  worker_count: number;
  service_count: number;
  booking_count: number;
  upcoming_booking_count: number;
  paid_revenue_pkr: number;
}

export interface BarberDeletionSummary {
  barber: { id: string; email: string | null; name: string | null };
  shops: number;
  shopNames: string[];
  workers: number;
  services: number;
  bookings: number;
  upcomingBookings: number;
  reviews: number;
  chats: number;
}

export async function fetchAdminBarbers(): Promise<AdminBarber[]> {
  const { data } = await api.get<{ barbers: AdminBarber[] }>("/admin/barbers");
  return data.barbers ?? [];
}

/** Permanently deletes the barber and everything they own. */
export async function deleteBarber(barberId: string): Promise<BarberDeletionSummary> {
  const { data } = await api.delete<{ summary: BarberDeletionSummary }>(
    `/admin/barbers/${barberId}`
  );
  return data.summary;
}
