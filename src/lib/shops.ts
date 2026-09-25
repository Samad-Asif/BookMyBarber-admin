import { api } from "./api";

export interface ShopDeletionSummary {
  shop: { id: string; name: string; city: string | null };
  owner: { id: string | null; name: string | null; email: string | null };
  workers: number;
  services: number;
  bookings: number;
  upcomingBookings: number;
  reviews: number;
  chats: number;
  dryRun: boolean;
}

/** What deleting the shop would remove (nothing is deleted). */
export async function fetchShopDeletionImpact(shopId: string): Promise<ShopDeletionSummary> {
  const { data } = await api.get<{ impact: ShopDeletionSummary }>(
    `/admin/shops/${shopId}/deletion-impact`
  );
  return data.impact;
}

/** Permanently deletes one shop; the owner's barber account is kept. */
export async function deleteShop(shopId: string): Promise<ShopDeletionSummary> {
  const { data } = await api.delete<{ summary: ShopDeletionSummary }>(`/admin/shops/${shopId}`);
  return data.summary;
}
