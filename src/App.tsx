import React, { useState, useEffect } from "react";
import {
  Users,
  Scissors,
  HelpCircle,
  TrendingUp,
  DollarSign,
  LogOut,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { login, logout, getMe } from "./lib/auth";
import type { AuthUser } from "./lib/auth";
import { api, tryRestoreSession } from "./lib/api";
import { getApiBaseUrl } from "./lib/api-config";
import { formatApiError } from "./lib/network-error";
import { CHART } from "./constants/design-tokens";
import {
  fetchAdminBookings,
  type AdminBookingRow,
  type BookingStatus,
} from "./lib/bookings";

type Tab = "overview" | "shops" | "bookings" | "feedbacks";

interface Stats {
  customers: number;
  barbers: number;
  shops: number;
  bookings: number;
  totalRevenue: number;
  totalCommission: number;
}

interface RecentBooking {
  id: string;
  booking_date: string;
  start_time: string;
  status: string;
  price_pkr: number;
  payment_status: string;
  profiles: {
    name: string;
    email: string;
  };
}

interface Shop {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  business_phone: string | null;
  website_url: string | null;
  location_updated_at: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles?: {
    name: string;
    email: string;
    phone: string;
  } | null;
}

interface Feedback {
  id: string;
  target_type: string;
  target_id: string;
  subject: string;
  description: string;
  status: "open" | "resolved";
  resolution_notes: string;
  created_at: string;
  profiles: {
    name: string;
    email: string;
    role: string;
  };
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dashboard states
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [shopStatusFilter, setShopStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [graphData, setGraphData] = useState<any[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopsLoadError, setShopsLoadError] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [adminBookings, setAdminBookings] = useState<AdminBookingRow[]>([]);
  const [bookingsLoadError, setBookingsLoadError] = useState<string | null>(null);
  const [bookingStatusFilter, setBookingStatusFilter] = useState<"all" | BookingStatus>("all");

  // Resolution states
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  useEffect(() => {
    (async () => {
      const restored = await tryRestoreSession();
      if (!restored) return;
      getMe()
        .then((res) => {
          if (res.user.role !== "admin") {
            handleLogout();
          } else {
            setUser(res.user);
          }
        })
        .catch(() => handleLogout());
    })();
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
      fetchShops();
      fetchFeedbacks();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void fetchBookingsList();
    }
  }, [user, bookingStatusFilter]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.user.role !== "admin") {
        setAuthError("Access Denied: Admin accounts only.");
        await logout();
      } else {
        setUser(res.user);
      }
    } catch (err: unknown) {
      setAuthError(formatApiError(err, "Invalid credentials"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  const fetchDashboardStats = async () => {
    try {
      const { data } = await api.get("/admin/dashboard/stats");
      setStats(data.stats);
      setRecentBookings(data.recentBookings);
      setGraphData(data.graphData);
    } catch (err) {
      console.error("Failed to load dashboard statistics", err);
    }
  };

  const fetchShops = async () => {
    setShopsLoadError(null);
    try {
      const { data } = await api.get("/admin/shops");
      setShops(data.shops ?? []);
    } catch (err) {
      const message = formatApiError(err, "Failed to fetch barber shops");
      setShopsLoadError(message);
      setShops([]);
      console.error("Failed to fetch barber shops", err);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const { data } = await api.get("/admin/feedbacks");
      setFeedbacks(data.feedbacks);
    } catch (err) {
      console.error("Failed to fetch feedbacks", err);
    }
  };

  const fetchBookingsList = async () => {
    setBookingsLoadError(null);
    try {
      const rows = await fetchAdminBookings({
        status: bookingStatusFilter === "all" ? undefined : bookingStatusFilter,
        limit: 100,
      });
      setAdminBookings(rows);
    } catch (err) {
      const message = formatApiError(err, "Failed to load bookings");
      setBookingsLoadError(message);
      setAdminBookings([]);
      console.error("Failed to load admin bookings", err);
    }
  };

  const handleApproveShop = async (shopId: string) => {
    try {
      await api.post(`/admin/shops/${shopId}/approve`);
      fetchShops();
      fetchDashboardStats();
    } catch (err) {
      alert("Failed to approve shop");
    }
  };

  const handleRejectShop = async (shopId: string) => {
    const rejectionReason = window.prompt("Rejection reason (optional):") ?? "";
    try {
      await api.post(`/admin/shops/${shopId}/reject`, { rejectionReason });
      fetchShops();
      fetchDashboardStats();
    } catch (err) {
      alert("Failed to reject shop");
    }
  };

  const filteredShops =
    shopStatusFilter === "all"
      ? shops
      : shops.filter((s) => s.status === shopStatusFilter);

  const filteredFeedbacks =
    feedbackStatusFilter === "all"
      ? feedbacks
      : feedbacks.filter((f) => f.status === feedbackStatusFilter);

  const openFeedbackCount = feedbacks.filter((f) => f.status === "open").length;

  const handleResolveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback) return;

    try {
      await api.post(`/admin/feedbacks/${selectedFeedback.id}/resolve`, {
        resolutionNotes,
      });
      setSelectedFeedback(null);
      setResolutionNotes("");
      fetchFeedbacks();
    } catch (err) {
      alert("Failed to resolve feedback complaint");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-body text-foreground">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-primary rounded-xl mb-4">
              <ShieldCheck className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground tracking-wide">
              BookMyBarber Admin
            </h1>
            <p className="text-muted-foreground text-sm mt-1 font-body">
              Control room and auditing console
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {authError && (
              <div className="p-3 bg-destructive/10 border border-destructive text-destructive text-sm rounded-lg text-center font-body">
                {authError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 font-body">
                Email Address
              </label>
              <input
                type="email"
                required
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body"
                placeholder="admin@bookmybarber.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 font-body">
                Secret Password
              </label>
              <input
                type="password"
                required
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:opacity-90 text-primary-foreground font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer font-body"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                "Authorize Access"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const navClass = (tab: Tab) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-semibold cursor-pointer font-body ${activeTab === tab
      ? "bg-sidebar-accent text-sidebar-primary border-l-4 border-sidebar-primary"
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    }`;

  return (
    <div className="min-h-screen bg-background flex font-body text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col justify-between">
        <div>
          {/* Brand */}
          <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
            <div className="p-2 bg-sidebar-primary/20 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-sidebar-primary" />
            </div>
            <div>
              <span className="font-heading font-bold text-sidebar-foreground text-lg tracking-wide block">
                BookMyBarber
              </span>
              <span className="text-[10px] text-sidebar-foreground/70 uppercase tracking-widest font-semibold font-body">
                Admin Console
              </span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-2">
            <button onClick={() => setActiveTab("overview")} className={navClass("overview")}>
              <TrendingUp className="w-5 h-5" />
              Overview Stats
            </button>

            <button onClick={() => setActiveTab("shops")} className={navClass("shops")}>
              <Scissors className="w-5 h-5" />
              Barber Shops ({shops.filter((s) => s.status === "pending").length} pending)
            </button>

            <button onClick={() => setActiveTab("bookings")} className={navClass("bookings")}>
              <Calendar className="w-5 h-5" />
              Bookings
            </button>

            <button onClick={() => setActiveTab("feedbacks")} className={navClass("feedbacks")}>
              <HelpCircle className="w-5 h-5" />
              Feedback complaints
            </button>
          </nav>
        </div>

        {/* User Info / Logout */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-sidebar-primary rounded-full flex items-center justify-center text-sidebar-primary-foreground font-bold uppercase font-body">
              {user.email?.[0] || "A"}
            </div>
            <div className="truncate">
              <span className="text-sm font-semibold text-sidebar-foreground block truncate font-body">
                {user.email}
              </span>
              <span className="text-xs text-sidebar-foreground/70 block font-medium capitalize font-body">
                {user.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-sidebar-accent hover:bg-destructive/20 hover:text-destructive text-sidebar-foreground font-semibold py-2.5 rounded-xl border border-sidebar-border transition cursor-pointer text-sm font-body"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 bg-background">
        {/* Header */}
        <header className="mb-8">
          <h2 className="font-heading text-3xl font-bold text-foreground capitalize">{activeTab} panel</h2>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            Real-time indicators & action center
          </p>
        </header>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && stats && (
          <div className="space-y-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider font-body">
                    Total Bookings
                  </span>
                  <h3 className="font-heading text-2xl font-bold text-foreground mt-1">{stats.bookings}</h3>
                </div>
                <div className="p-4 bg-chart-2/10 rounded-xl text-chart-2">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider font-body">
                    Total Cut/Commissions
                  </span>
                  <h3 className="font-heading text-2xl font-bold text-foreground mt-1">
                    PKR {stats.totalCommission.toLocaleString()}
                  </h3>
                </div>
                <div className="p-4 bg-chart-2/10 rounded-xl text-chart-2">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider font-body">
                    Gross Volume Paid
                  </span>
                  <h3 className="font-heading text-2xl font-bold text-foreground mt-1">
                    PKR {stats.totalRevenue.toLocaleString()}
                  </h3>
                </div>
                <div className="p-4 bg-primary/10 rounded-xl text-primary">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider font-body">
                    Registered Barber Shops
                  </span>
                  <h3 className="font-heading text-2xl font-bold text-foreground mt-1">{stats.shops}</h3>
                </div>
                <div className="p-4 bg-chart-3/10 rounded-xl text-chart-3">
                  <Scissors className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider font-body">
                    Registered Platform Users
                  </span>
                  <h3 className="font-heading text-2xl font-bold text-foreground mt-1">
                    {stats.customers + stats.barbers}
                  </h3>
                </div>
                <div className="p-4 bg-chart-4/10 rounded-xl text-chart-4">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Graphs / Plots */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h4 className="font-heading font-bold text-foreground text-lg mb-6">
                Revenue and Commission Progress
              </h4>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={graphData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART[1]} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={CHART[1]} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART[2]} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={CHART[2]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART[3]} vertical={false} />
                    <XAxis dataKey="month" stroke={CHART[3]} fontSize={12} />
                    <YAxis stroke={CHART[3]} fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-foreground)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Total Revenue"
                      stroke={CHART[1]}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                    <Area
                      type="monotone"
                      dataKey="commission"
                      name="Admin Commission Cut"
                      stroke={CHART[2]}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorCommission)"
                    />
                    <Area
                      type="monotone"
                      dataKey="bookings"
                      name="Bookings"
                      stroke={CHART[4]}
                      strokeWidth={2}
                      fillOpacity={0}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Bookings table */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h4 className="font-heading font-bold text-foreground text-lg mb-6">Recent Bookings Details</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider font-body">
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Time</th>
                      <th className="pb-3">Total Cost</th>
                      <th className="pb-3">Payment</th>
                      <th className="pb-3">Booking Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((b) => (
                      <tr key={b.id} className="border-b border-border/60 text-sm font-body">
                        <td className="py-4">
                          <span className="text-foreground block font-medium">
                            {b.profiles?.name || "Customer"}
                          </span>
                          <span className="text-muted-foreground text-xs">{b.profiles?.email}</span>
                        </td>
                        <td className="py-4 text-foreground/80">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {b.booking_date}
                          </div>
                        </td>
                        <td className="py-4 text-foreground/80">{b.start_time}</td>
                        <td className="py-4 font-semibold text-foreground">PKR {b.price_pkr}</td>
                        <td className="py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold font-body ${b.payment_status === "paid"
                              ? "bg-chart-2/10 text-chart-2"
                              : "bg-chart-4/10 text-chart-4"
                              }`}
                          >
                            {b.payment_status}
                          </span>
                        </td>
                        <td className="py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold font-body ${b.status === "approved"
                              ? "bg-primary/10 text-primary"
                              : b.status === "completed"
                                ? "bg-chart-2/10 text-chart-2"
                                : "bg-chart-4/10 text-chart-4"
                              }`}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Barber Shops Approvals */}
        {activeTab === "shops" && (
          <div className="bg-card border border-border rounded-2xl p-6">
            {shopsLoadError && (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-body">
                <p className="font-semibold text-destructive">Could not load shops</p>
                <p className="text-muted-foreground mt-1">{shopsLoadError}</p>
                <p className="text-muted-foreground mt-2 text-xs">
                  API: {getApiBaseUrl()} — log in as admin; restart backend after .env changes.
                </p>
                <button
                  type="button"
                  onClick={() => fetchShops()}
                  className="mt-3 text-primary text-xs font-semibold cursor-pointer font-body"
                >
                  Retry
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h4 className="font-heading font-bold text-foreground text-lg">Shop verification</h4>
              <div className="flex gap-2">
                {(["all", "pending", "approved", "rejected"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setShopStatusFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer font-body ${shopStatusFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase font-body">
                    <th className="pb-3 pr-4">Shop</th>
                    <th className="pb-3 pr-4">Address</th>
                    <th className="pb-3 pr-4">City</th>
                    <th className="pb-3 pr-4">Coordinates</th>
                    <th className="pb-3 pr-4">Contact</th>
                    <th className="pb-3 pr-4">Owner</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShops.map((shop) => (
                    <tr key={shop.id} className="border-b border-border/60 font-body">
                      <td className="py-3 text-foreground font-medium">{shop.name}</td>
                      <td className="py-3 text-muted-foreground text-xs max-w-[220px]">{shop.address}</td>
                      <td className="py-3 text-foreground/80">{shop.city}</td>
                      <td className="py-3 text-muted-foreground text-xs">
                        {shop.latitude !== null && shop.longitude !== null ? (
                          <div className="space-y-1">
                            <div>{shop.latitude.toFixed(5)}, {shop.longitude.toFixed(5)}</div>
                            <a
                              className="text-primary underline"
                              href={`https://www.google.com/maps?q=${shop.latitude},${shop.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open map
                            </a>
                          </div>
                        ) : "N/A"}
                      </td>
                      <td className="py-3 text-xs">
                        <div className="text-muted-foreground">Phone: {shop.business_phone ?? "N/A"}</div>
                        {shop.website_url && (
                          <a
                            className="text-primary underline"
                            href={shop.website_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Website
                          </a>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">{shop.profiles?.name ?? "—"}</td>
                      <td className="py-3">
                        <span className="text-xs uppercase font-bold text-chart-4 font-body">{shop.status}</span>
                      </td>
                      <td className="py-3">
                        {shop.status === "pending" && (
                          <div className="flex gap-2">
                            <button onClick={() => handleApproveShop(shop.id)} className="text-chart-2 text-xs font-semibold cursor-pointer font-body">Approve</button>
                            <button onClick={() => handleRejectShop(shop.id)} className="text-destructive text-xs font-semibold cursor-pointer font-body">Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredShops.length === 0 && !shopsLoadError && (
                <p className="text-muted-foreground text-center py-8 text-sm font-body">
                  {shops.length === 0
                    ? "No shops in database yet."
                    : "No shops match this filter."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab: Bookings */}
        {activeTab === "bookings" && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h4 className="font-heading font-bold text-foreground text-lg">All bookings</h4>
              <div className="flex flex-wrap gap-2">
                {(
                  ["all", "pending", "approved", "rejected", "cancelled", "completed"] as const
                ).map((f) => (
                  <button
                    key={f}
                    onClick={() => setBookingStatusFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer font-body ${bookingStatusFilter === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {f}
                  </button>
                ))}
                <button
                  onClick={() => void fetchBookingsList()}
                  className="px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer font-body bg-sidebar-accent text-sidebar-foreground"
                >
                  Refresh
                </button>
              </div>
            </div>
            {bookingsLoadError && (
              <p className="text-destructive text-sm mb-4 font-body">{bookingsLoadError}</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase font-body">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Shop</th>
                    <th className="pb-3 pr-4">Customer</th>
                    <th className="pb-3 pr-4">Service</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Payment</th>
                    <th className="pb-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {adminBookings.map((b) => (
                    <tr key={b.id} className="border-b border-border/60 font-body">
                      <td className="py-3 text-foreground">
                        {b.booking_date} {String(b.start_time).slice(0, 5)}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {b.barber_shops?.name ?? "—"}
                        {b.barber_shops?.city ? ` (${b.barber_shops.city})` : ""}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {b.profiles?.name ?? "—"}
                        <div className="text-xs">{b.profiles?.email}</div>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {b.shop_services?.name ?? "—"}
                        {b.workers?.name ? ` · ${b.workers.name}` : ""}
                      </td>
                      <td className="py-3">
                        <span className="text-xs uppercase font-bold text-chart-4">{b.status}</span>
                      </td>
                      <td className="py-3 text-muted-foreground text-xs uppercase">{b.payment_status}</td>
                      <td className="py-3 text-foreground font-medium">PKR {b.price_pkr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {adminBookings.length === 0 && !bookingsLoadError && (
                <p className="text-muted-foreground text-center py-8 text-sm font-body">
                  No bookings match this filter.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Feedbacks & Complaints */}
        {activeTab === "feedbacks" && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h4 className="font-heading font-bold text-foreground text-lg">
                Feedbacks ({openFeedbackCount} open)
              </h4>
              <div className="flex gap-2">
                {(["all", "open", "resolved"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFeedbackStatusFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer font-body ${feedbackStatusFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase font-body">
                    <th className="pb-3 pr-4">Subject</th>
                    <th className="pb-3 pr-4">From</th>
                    <th className="pb-3 pr-4">Target</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeedbacks.map((f) => (
                    <tr key={f.id} className="border-b border-border/60 font-body">
                      <td className="py-3 text-foreground">{f.subject}</td>
                      <td className="py-3 text-muted-foreground">{f.profiles?.name}</td>
                      <td className="py-3 text-muted-foreground">{f.target_type}</td>
                      <td className="py-3 text-xs uppercase">{f.status}</td>
                      <td className="py-3">
                        {f.status === "open" && (
                          <button
                            onClick={() => setSelectedFeedback(f)}
                            className="text-primary text-xs font-semibold cursor-pointer font-body"
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Resolve Feedback Dialog */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h4 className="font-heading text-lg font-bold text-foreground mb-2">Resolve Complaint</h4>
            <p className="text-muted-foreground text-xs mb-4 font-body">
              Submit resolution notes to complete ticket #{selectedFeedback.id.slice(0, 8)}
            </p>

            <form onSubmit={handleResolveFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 font-body">
                  Subject
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full bg-muted border border-input rounded-xl px-4 py-2.5 text-muted-foreground text-sm font-body"
                  value={selectedFeedback.subject}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 font-body">
                  Resolution Notes
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm transition font-body"
                  placeholder="Explain actions taken to resolve this customer/barber issue..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                  className="px-4 py-2 border border-border hover:bg-muted text-foreground rounded-lg text-sm cursor-pointer font-body"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-sm cursor-pointer font-body"
                >
                  Confirm & Resolve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
