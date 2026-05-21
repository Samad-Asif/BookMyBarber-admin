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

type Tab = "overview" | "shops" | "feedbacks";

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
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles: {
    name: string;
    email: string;
    phone: string;
  };
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
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

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
    } catch (err: any) {
      setAuthError(err.response?.data?.message || "Invalid credentials");
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
    try {
      const { data } = await api.get("/admin/shops");
      setShops(data.shops);
    } catch (err) {
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
      <div className="min-h-screen bg-[#0d0e11] flex items-center justify-center p-4 font-sans text-gray-100">
        <div className="w-full max-w-md bg-[#161719] border border-[#2e3135] rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-gradient-to-tr from-[#3c87f7] to-[#1d4ed8] rounded-xl mb-4">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">BookMyBarber Admin</h1>
            <p className="text-gray-400 text-sm mt-1">Control room and auditing console</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {authError && (
              <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg text-center">
                {authError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                className="w-full bg-[#212225] border border-[#2e3135] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3c87f7] transition"
                placeholder="admin@bookmybarber.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Secret Password
              </label>
              <input
                type="password"
                required
                className="w-full bg-[#212225] border border-[#2e3135] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3c87f7] transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#3c87f7] hover:bg-[#2563eb] text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Authorize Access"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0e11] flex font-sans text-gray-200">
      {/* Sidebar */}
      <aside className="w-64 bg-[#161719] border-r border-[#2e3135] flex flex-col justify-between">
        <div>
          {/* Brand */}
          <div className="p-6 border-b border-[#2e3135] flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-[#3c87f7]" />
            </div>
            <div>
              <span className="font-bold text-white text-lg tracking-wide block">BookMyBarber</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                Admin Console
              </span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-semibold cursor-pointer ${activeTab === "overview"
                  ? "bg-[#3c87f7]/10 text-[#3c87f7] border-l-4 border-[#3c87f7]"
                  : "text-gray-400 hover:bg-[#212225] hover:text-white"
                }`}
            >
              <TrendingUp className="w-5 h-5" />
              Overview Stats
            </button>

            <button
              onClick={() => setActiveTab("shops")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-semibold cursor-pointer ${activeTab === "shops"
                  ? "bg-[#3c87f7]/10 text-[#3c87f7] border-l-4 border-[#3c87f7]"
                  : "text-gray-400 hover:bg-[#212225] hover:text-white"
                }`}
            >
              <Scissors className="w-5 h-5" />
              Barber Shops ({shops.filter((s) => s.status === "pending").length} pending)
            </button>

            <button
              onClick={() => setActiveTab("feedbacks")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-semibold cursor-pointer ${activeTab === "feedbacks"
                  ? "bg-[#3c87f7]/10 text-[#3c87f7] border-l-4 border-[#3c87f7]"
                  : "text-gray-400 hover:bg-[#212225] hover:text-white"
                }`}
            >
              <HelpCircle className="w-5 h-5" />
              Feedback complaints
            </button>
          </nav>
        </div>

        {/* User Info / Logout */}
        <div className="p-4 border-t border-[#2e3135]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold uppercase">
              {user.email?.[0] || "A"}
            </div>
            <div className="truncate">
              <span className="text-sm font-semibold text-white block truncate">{user.email}</span>
              <span className="text-xs text-gray-400 block font-medium capitalize">{user.role}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-[#212225] hover:bg-red-950/20 hover:text-red-400 text-gray-300 font-semibold py-2.5 rounded-xl border border-[#2e3135] transition cursor-pointer text-sm"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 bg-[#0d0e11]">
        {/* Header */}
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-white capitalize">{activeTab} panel</h2>
          <p className="text-gray-400 text-sm mt-1">Real-time indicators & action center</p>
        </header>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && stats && (
          <div className="space-y-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-[#161719] border border-[#2e3135] rounded-2xl p-6 flex items-center justify-between shadow-lg">
                <div>
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                    Total Bookings
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-1">{stats.bookings}</h3>
                </div>
                <div className="p-4 bg-cyan-500/10 rounded-xl text-cyan-400">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
              <div className="bg-[#161719] border border-[#2e3135] rounded-2xl p-6 flex items-center justify-between shadow-lg">
                <div>
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                    Total Cut/Commissions
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-1">
                    PKR {stats.totalCommission.toLocaleString()}
                  </h3>
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#161719] border border-[#2e3135] rounded-2xl p-6 flex items-center justify-between shadow-lg">
                <div>
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                    Gross Volume Paid
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-1">
                    PKR {stats.totalRevenue.toLocaleString()}
                  </h3>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-xl text-blue-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#161719] border border-[#2e3135] rounded-2xl p-6 flex items-center justify-between shadow-lg">
                <div>
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                    Registered Barber Shops
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-1">{stats.shops}</h3>
                </div>
                <div className="p-4 bg-purple-500/10 rounded-xl text-purple-400">
                  <Scissors className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#161719] border border-[#2e3135] rounded-2xl p-6 flex items-center justify-between shadow-lg">
                <div>
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                    Registered Platform Users
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-1">
                    {stats.customers + stats.barbers}
                  </h3>
                </div>
                <div className="p-4 bg-orange-500/10 rounded-xl text-orange-400">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Graphs / Plots */}
            <div className="bg-[#161719] border border-[#2e3135] rounded-2xl p-6 shadow-lg">
              <h4 className="font-bold text-white text-lg mb-6">Revenue and Commission Progress</h4>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={graphData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3c87f7" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3c87f7" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2e3135" vertical={false} />
                    <XAxis dataKey="month" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#161719",
                        borderColor: "#2e3135",
                        color: "#fff",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Total Revenue"
                      stroke="#3c87f7"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                    <Area
                      type="monotone"
                      dataKey="commission"
                      name="Admin Commission Cut"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorCommission)"
                    />
                    <Area
                      type="monotone"
                      dataKey="bookings"
                      name="Bookings"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={0}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Bookings table */}
            <div className="bg-[#161719] border border-[#2e3135] rounded-2xl p-6 shadow-lg">
              <h4 className="font-bold text-white text-lg mb-6">Recent Bookings Details</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#2e3135] text-gray-400 text-xs font-semibold uppercase tracking-wider">
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
                      <tr key={b.id} className="border-b border-[#2e3135]/40 text-sm">
                        <td className="py-4">
                          <span className="text-white block font-medium">
                            {b.profiles?.name || "Customer"}
                          </span>
                          <span className="text-gray-400 text-xs">{b.profiles?.email}</span>
                        </td>
                        <td className="py-4 text-gray-300">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {b.booking_date}
                          </div>
                        </td>
                        <td className="py-4 text-gray-300">{b.start_time}</td>
                        <td className="py-4 font-semibold text-white">PKR {b.price_pkr}</td>
                        <td className="py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${b.payment_status === "paid"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-orange-500/10 text-orange-400"
                              }`}
                          >
                            {b.payment_status}
                          </span>
                        </td>
                        <td className="py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${b.status === "approved"
                                ? "bg-blue-500/10 text-blue-400"
                                : b.status === "completed"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-yellow-500/10 text-yellow-400"
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
          <div className="bg-[#161719] border border-[#2e3135] rounded-2xl p-6 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h4 className="font-bold text-white text-lg">Shop verification</h4>
              <div className="flex gap-2">
                {(["all", "pending", "approved", "rejected"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setShopStatusFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${shopStatusFilter === f
                        ? "bg-[#3c87f7] text-white"
                        : "bg-[#212225] text-gray-400"
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
                  <tr className="border-b border-[#2e3135] text-gray-400 text-xs uppercase">
                    <th className="pb-3 pr-4">Shop</th>
                    <th className="pb-3 pr-4">City</th>
                    <th className="pb-3 pr-4">Owner</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShops.map((shop) => (
                    <tr key={shop.id} className="border-b border-[#2e3135]/40">
                      <td className="py-3 text-white font-medium">{shop.name}</td>
                      <td className="py-3 text-gray-300">{shop.city}</td>
                      <td className="py-3 text-gray-400">{shop.profiles?.name}</td>
                      <td className="py-3">
                        <span className="text-xs uppercase font-bold text-yellow-400">{shop.status}</span>
                      </td>
                      <td className="py-3">
                        {shop.status === "pending" && (
                          <div className="flex gap-2">
                            <button onClick={() => handleApproveShop(shop.id)} className="text-emerald-400 text-xs font-semibold cursor-pointer">Approve</button>
                            <button onClick={() => handleRejectShop(shop.id)} className="text-red-400 text-xs font-semibold cursor-pointer">Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredShops.length === 0 && (
                <p className="text-gray-400 text-center py-8 text-sm">No shops match this filter.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Feedbacks & Complaints */}
        {activeTab === "feedbacks" && (
          <div className="bg-[#161719] border border-[#2e3135] rounded-2xl p-6 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h4 className="font-bold text-white text-lg">
                Feedbacks ({openFeedbackCount} open)
              </h4>
              <div className="flex gap-2">
                {(["all", "open", "resolved"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFeedbackStatusFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${feedbackStatusFilter === f
                        ? "bg-[#3c87f7] text-white"
                        : "bg-[#212225] text-gray-400"
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
                  <tr className="border-b border-[#2e3135] text-gray-400 text-xs uppercase">
                    <th className="pb-3 pr-4">Subject</th>
                    <th className="pb-3 pr-4">From</th>
                    <th className="pb-3 pr-4">Target</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeedbacks.map((f) => (
                    <tr key={f.id} className="border-b border-[#2e3135]/40">
                      <td className="py-3 text-white">{f.subject}</td>
                      <td className="py-3 text-gray-400">{f.profiles?.name}</td>
                      <td className="py-3 text-gray-400">{f.target_type}</td>
                      <td className="py-3 text-xs uppercase">{f.status}</td>
                      <td className="py-3">
                        {f.status === "open" && (
                          <button
                            onClick={() => setSelectedFeedback(f)}
                            className="text-[#3c87f7] text-xs font-semibold cursor-pointer"
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
          <div className="bg-[#161719] border border-[#2e3135] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h4 className="text-lg font-bold text-white mb-2">Resolve Complaint</h4>
            <p className="text-gray-400 text-xs mb-4">
              Submit resolution notes to complete ticket #{selectedFeedback.id.slice(0, 8)}
            </p>

            <form onSubmit={handleResolveFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full bg-[#212225] border border-[#2e3135] rounded-xl px-4 py-2.5 text-gray-400 text-sm"
                  value={selectedFeedback.subject}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Resolution Notes
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full bg-[#212225] border border-[#2e3135] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3c87f7] text-sm transition"
                  placeholder="Explain actions taken to resolve this customer/barber issue..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                  className="px-4 py-2 border border-[#2e3135] hover:bg-[#212225] text-gray-300 rounded-lg text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm cursor-pointer"
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
