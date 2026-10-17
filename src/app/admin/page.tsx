"use client";

import { useEffect, useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  User,
  Calendar,
  FileText,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Eye,
  RotateCcw,
  Shield,
  ArrowUpDown,
  X,
  ExternalLink,
} from "lucide-react";

type Application = {
  id: number;
  name: string;
  email: string;
  whatsapp: string;
  bio: string | null;
  profileImage: string;
  status: string;
  adminNotes?: string | null;
  leaderId: number | null;
  createdAt: string;
  updatedAt: string;
};

type Leader = {
  id: number;
  name: string | null;
  role: string | null;
  avatar: string;
  status: string;
  position: number;
};

export default function AdminPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");

  // Modals & interaction state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [deletingApp, setDeletingApp] = useState<Application | null>(null);
  const [resettingSlot, setResettingSlot] = useState<Leader | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const appsRes = await fetch(`/api/applications?t=${Date.now()}&limit=200`, { cache: "no-store" });
      if (appsRes.status === 401) {
        setAuthenticated(false);
        setApplications([]);
        setLeaders([]);
        return;
      }
      if (!appsRes.ok) throw new Error("Failed to fetch applications");

      const appsData = await appsRes.json();
      const leadersRes = await fetch(`/api/leaders?t=${Date.now()}`, { cache: "no-store" });
      if (!leadersRes.ok) throw new Error("Failed to fetch leader slots");
      const leadersData = await leadersRes.json();

      setApplications(Array.isArray(appsData) ? appsData : []);
      setLeaders(Array.isArray(leadersData) ? leadersData : []);
      setAuthenticated(true);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error("Failed to load admin data. Check database connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Admin login failed.");
      }
      setAdminPassword("");
      await fetchData();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Admin login failed.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      setAuthenticated(false);
      setApplications([]);
      setLeaders([]);
    }
  }

  // Update application status (approved, rejected, pending)
  async function handleStatusUpdate(id: number, newStatus: "approved" | "rejected" | "pending") {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
      );
      if (selectedApp && selectedApp.id === id) {
        setSelectedApp((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      toast.success(`Application marked as ${newStatus}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    } finally {
      setActionLoadingId(null);
    }
  }

  // Delete application with slot release
  async function confirmDeleteApplication() {
    if (!deletingApp) return;
    const target = deletingApp;
    setDeletingApp(null);

    try {
      setActionLoadingId(target.id);
      const res = await fetch(`/api/applications/${target.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete application");
      }

      toast.success(`Removed application for ${target.name}`);
      if (selectedApp?.id === target.id) {
        setSelectedApp(null);
      }
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete application");
    } finally {
      setActionLoadingId(null);
    }
  }

  // Reset a leader slot
  async function confirmResetSlot() {
    if (!resettingSlot) return;
    const target = resettingSlot;
    setResettingSlot(null);

    try {
      const res = await fetch("/api/leaders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: target.position }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to reset slot");
      }

      toast.success(`Slot #${target.position} reset to open`);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reset slot");
    }
  }

  // CSV Export
  function exportToCSV() {
    if (applications.length === 0) {
      toast.error("No applications to export.");
      return;
    }

    const headers = [
      "ID",
      "Name",
      "Email",
      "WhatsApp",
      "Status",
      "Assigned Role",
      "Position",
      "Applied Date",
      "Bio",
    ];

    const escapeCSV = (val: string | null | undefined | number) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredApplications.map((app) => {
      const linked = leaders.find((l) => l.id === app.leaderId);
      return [
        app.id,
        escapeCSV(app.name),
        escapeCSV(app.email),
        escapeCSV(app.whatsapp),
        escapeCSV(app.status),
        escapeCSV(linked ? linked.role : "None"),
        escapeCSV(linked ? linked.position : ""),
        escapeCSV(new Date(app.createdAt).toISOString()),
        escapeCSV(app.bio || ""),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MEP_2027_Applications_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredApplications.length} records to CSV`);
  }

  // Computed statistics
  const totalApps = applications.length;
  const pendingApps = applications.filter((a) => a.status === "pending").length;
  const approvedApps = applications.filter((a) => a.status === "approved").length;
  const rejectedApps = applications.filter((a) => a.status === "rejected").length;
  const filledSlots = leaders.filter((l) => l.status === "filled").length;
  const openSlots = 6 - filledSlots;

  // Filtered and sorted applications
  const filteredApplications = useMemo(() => {
    let list = [...applications];

    if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.whatsapp.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return list;
  }, [applications, statusFilter, searchQuery, sortBy]);

  // Login View
  if (!authenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 px-4 py-10">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-md border-white/50 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 mb-2">
              <Shield size={24} />
            </div>
            <CardTitle className="text-2xl" style={{ fontFamily: "Cinzel, serif" }}>
              MEP 2027 Admin Portal
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in with your configured deployment administrator credentials.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Admin password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  placeholder="Enter administrator password"
                  required
                  maxLength={512}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>
              {loginError && <p role="alert" className="text-sm text-red-600 font-medium">{loginError}</p>}
              {loading && <p className="text-xs text-muted-foreground">Checking authentication session…</p>}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loggingIn || !adminPassword}>
                {loggingIn ? "Signing in…" : "Sign In to Dashboard"}
              </Button>
              <div className="text-center pt-2">
                <Link href="/" className="text-sm text-gray-600 hover:text-black underline underline-offset-4">
                  ← Back to Home
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 text-[#333333]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/80 bg-white/80 border-b border-white/40 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-extrabold tracking-wide text-lg sm:text-xl" style={{ fontFamily: "Cinzel, serif" }}>
            <span className="glow-text-gold">MEP</span> <span className="glow-text-blue">2027</span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
              Admin
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge className="bg-amber-100 text-amber-900 border border-amber-300 hidden sm:inline-flex">
              {filledSlots}/6 Slots Filled
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 bg-white/70 hover:bg-white text-xs sm:text-sm"
              onClick={exportToCSV}
            >
              <Download size={14} className="mr-1 sm:mr-1.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 bg-white/70 hover:bg-white text-xs sm:text-sm"
              onClick={handleLogout}
            >
              Sign Out
            </Button>
            <Link href="/">
              <Button size="sm" variant="ghost" className="text-xs sm:text-sm">
                View Site
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8 space-y-8">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "Cinzel, serif" }}>
              MEP 2027 Leadership Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Live statistics, leader allocation, and applicant review pipeline.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="self-start sm:self-auto bg-white/60 hover:bg-white border-gray-300"
          >
            <RotateCcw size={14} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>

        {/* 6 Real Database Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <Card className="bg-white/70 border-white/60 shadow-sm backdrop-blur-sm">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-gray-500 uppercase">Total Apps</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-gray-900">{totalApps}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 border-white/60 shadow-sm backdrop-blur-sm">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-amber-700 uppercase">Pending</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-amber-600">{pendingApps}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 border-white/60 shadow-sm backdrop-blur-sm">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-emerald-700 uppercase">Approved</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-emerald-600">{approvedApps}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 border-white/60 shadow-sm backdrop-blur-sm">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-rose-700 uppercase">Rejected</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-rose-600">{rejectedApps}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 border-white/60 shadow-sm backdrop-blur-sm">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-blue-700 uppercase">Filled Slots</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-blue-600">{filledSlots}/6</div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 border-white/60 shadow-sm backdrop-blur-sm">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-purple-700 uppercase">Open Slots</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-purple-600">{openSlots}</div>
            </CardContent>
          </Card>
        </div>

        {/* Six Leader & Co-Leader Slots Management */}
        <Card className="bg-white/70 border-white/60 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold" style={{ fontFamily: "Cinzel, serif" }}>
                6 Squad Leader & Co-Leader Slots
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Positions 1–3 are designated Squad Leaders; Positions 4–6 are Co-Leaders.
              </p>
            </div>
            <div className="text-xs text-gray-500">
              Click &quot;Reset Slot&quot; to reopen any slot for new applications.
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaders.map((leader) => {
                const isLeader = leader.position <= 3;
                const isFilled = leader.status === "filled";
                return (
                  <div
                    key={leader.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isFilled
                        ? "border-emerald-300 bg-emerald-50/70 shadow-sm"
                        : "border-gray-200 bg-white/60 border-dashed"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-white shadow-md flex-shrink-0 bg-white">
                        <img
                          src={leader.avatar}
                          alt={leader.name ?? `Position ${leader.position}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                            Slot #{leader.position}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-2xs font-semibold px-2 py-0.5 ${
                              isFilled
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-gray-100 text-gray-600 border-gray-300"
                            }`}
                          >
                            {isFilled ? "FILLED" : "OPEN"}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-gray-900 truncate mt-0.5">
                          {leader.name || "Available Slot"}
                        </h4>
                        <div className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              isLeader ? "bg-amber-500" : "bg-indigo-500"
                            }`}
                          />
                          {isLeader ? "Squad Leader" : "Squad Co-Leader"}
                        </div>

                        {isFilled && (
                          <div className="mt-3 pt-2 border-t border-emerald-200/60 flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200 bg-white"
                              onClick={() => setResettingSlot(leader)}
                            >
                              <RotateCcw size={12} className="mr-1" />
                              Reset Slot
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Applications Management Section */}
        <Card className="bg-white/70 border-white/60 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold" style={{ fontFamily: "Cinzel, serif" }}>
                  Submitted Applications ({filteredApplications.length})
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Search, review profile photos, approve or reject applications, and manage submissions.
                </p>
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(["all", "pending", "approved", "rejected"] as const).map((filter) => {
                  const count =
                    filter === "all"
                      ? totalApps
                      : applications.filter((a) => a.status === filter).length;
                  return (
                    <Button
                      key={filter}
                      size="sm"
                      variant={statusFilter === filter ? "default" : "outline"}
                      className={`h-8 text-xs capitalize ${
                        statusFilter === filter
                          ? "bg-gray-900 text-white"
                          : "bg-white/60 text-gray-700 border-gray-300 hover:bg-white"
                      }`}
                      onClick={() => setStatusFilter(filter)}
                    >
                      {filter} ({count})
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Search and Sort Toolbar */}
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search applicants by name, email, or WhatsApp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="text-gray-500 hidden sm:inline-block" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name (A–Z)</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="mt-3 text-sm text-gray-500 font-medium">Loading applications from database…</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-white/40">
                <FileText size={36} className="mx-auto text-gray-400 mb-2" />
                <p className="text-base font-semibold text-gray-700">No applications found</p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search query or status filter to see other submissions."
                    : "No applications have been submitted to the database yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((app) => {
                  const linkedLeader = leaders.find((l) => l.id === app.leaderId);
                  const isUpdating = actionLoadingId === app.id;

                  return (
                    <div
                      key={app.id}
                      className="p-4 sm:p-5 rounded-xl border border-gray-200/80 bg-white/70 hover:bg-white hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        {/* Profile Image with Click to Zoom */}
                        <div
                          className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden border-2 border-white shadow-md flex-shrink-0 cursor-pointer group bg-gray-100"
                          onClick={() => setPhotoPreview(app.profileImage)}
                          title="Click to zoom profile picture"
                        >
                          <img
                            src={app.profileImage}
                            alt={app.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye size={18} />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-lg text-gray-900">{app.name}</h3>
                              {linkedLeader && (
                                <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-xs">
                                  {linkedLeader.role} • Slot #{linkedLeader.position}
                                </Badge>
                              )}
                            </div>

                            {/* Status Badge */}
                            <Badge
                              variant="outline"
                              className={`text-xs font-semibold uppercase px-2.5 py-0.5 ${
                                app.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : app.status === "rejected"
                                  ? "bg-rose-100 text-rose-800 border-rose-300"
                                  : "bg-amber-100 text-amber-800 border-amber-300"
                              }`}
                            >
                              {app.status}
                            </Badge>
                          </div>

                          {/* Contact Info Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 text-xs sm:text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail size={14} className="text-gray-400 flex-shrink-0" />
                              <a
                                href={`mailto:${app.email}`}
                                className="hover:text-blue-600 hover:underline truncate"
                              >
                                {app.email}
                              </a>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Phone size={14} className="text-gray-400 flex-shrink-0" />
                              <a
                                href={`https://wa.me/${app.whatsapp.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-emerald-600 hover:underline inline-flex items-center gap-1"
                              >
                                {app.whatsapp}
                                <ExternalLink size={10} />
                              </a>
                            </div>

                            <div className="flex items-center gap-1.5 text-gray-500">
                              <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                              <span>
                                {new Date(app.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Bio preview if available */}
                          {app.bio && (
                            <div className="p-2.5 rounded-lg bg-gray-50/80 border border-gray-100 text-xs text-gray-700 line-clamp-2 mb-3">
                              <span className="font-semibold text-gray-500 mr-1">Bio:</span>
                              {app.bio}
                            </div>
                          )}

                          {/* Action Toolbar */}
                          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 text-xs text-gray-700 hover:bg-gray-100"
                              onClick={() => setSelectedApp(app)}
                            >
                              <FileText size={13} className="mr-1" />
                              View Full Details
                            </Button>

                            <div className="flex items-center gap-1.5 ml-auto">
                              {app.status !== "approved" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating}
                                  className="h-8 px-2.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 bg-white"
                                  onClick={() => handleStatusUpdate(app.id, "approved")}
                                >
                                  <CheckCircle size={13} className="mr-1" />
                                  Approve
                                </Button>
                              )}

                              {app.status !== "rejected" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating}
                                  className="h-8 px-2.5 text-xs text-rose-700 border-rose-300 hover:bg-rose-50 bg-white"
                                  onClick={() => handleStatusUpdate(app.id, "rejected")}
                                >
                                  <XCircle size={13} className="mr-1" />
                                  Reject
                                </Button>
                              )}

                              {app.status !== "pending" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating}
                                  className="h-8 px-2.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 bg-white"
                                  onClick={() => handleStatusUpdate(app.id, "pending")}
                                >
                                  <Clock size={13} className="mr-1" />
                                  Mark Pending
                                </Button>
                              )}

                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={isUpdating}
                                className="h-8 px-2.5 text-xs"
                                onClick={() => setDeletingApp(app)}
                              >
                                <Trash2 size={13} className="mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal: Full Application Detail View */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <Card className="w-full max-w-2xl bg-white shadow-2xl border-gray-200 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-xl font-bold" style={{ fontFamily: "Cinzel, serif" }}>
                  Applicant Details: {selectedApp.name}
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Application ID #{selectedApp.id}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={() => setSelectedApp(null)}
              >
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <div
                  className="h-28 w-28 rounded-2xl overflow-hidden border-2 border-gray-200 shadow-md flex-shrink-0 cursor-pointer"
                  onClick={() => setPhotoPreview(selectedApp.profileImage)}
                  title="Click to view full photo"
                >
                  <img
                    src={selectedApp.profileImage}
                    alt={selectedApp.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedApp.name}</h3>
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold uppercase ${
                        selectedApp.status === "approved"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : selectedApp.status === "rejected"
                          ? "bg-rose-100 text-rose-800 border-rose-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}
                    >
                      {selectedApp.status}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="flex items-center justify-center sm:justify-start gap-2">
                      <Mail size={15} className="text-gray-400" />
                      <a href={`mailto:${selectedApp.email}`} className="text-blue-600 hover:underline">
                        {selectedApp.email}
                      </a>
                    </p>
                    <p className="flex items-center justify-center sm:justify-start gap-2">
                      <Phone size={15} className="text-gray-400" />
                      <a
                        href={`https://wa.me/${selectedApp.whatsapp.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:underline"
                      >
                        {selectedApp.whatsapp}
                      </a>
                    </p>
                    <p className="flex items-center justify-center sm:justify-start gap-2 text-xs text-gray-500">
                      <Calendar size={14} className="text-gray-400" />
                      Applied: {new Date(selectedApp.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Submitted Bio & Motivation
                </h4>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {selectedApp.bio || "No bio submitted."}
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="pt-4 border-t flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate(selectedApp.id, "approved")}
                  className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  <CheckCircle size={14} className="mr-1" />
                  Mark Approved
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate(selectedApp.id, "rejected")}
                  className="text-rose-700 border-rose-300 hover:bg-rose-50"
                >
                  <XCircle size={14} className="mr-1" />
                  Mark Rejected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate(selectedApp.id, "pending")}
                  className="text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <Clock size={14} className="mr-1" />
                  Mark Pending
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const toDelete = selectedApp;
                    setSelectedApp(null);
                    setDeletingApp(toDelete);
                  }}
                >
                  <Trash2 size={14} className="mr-1" />
                  Delete Application
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Full-Size Photo Preview */}
      {photoPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setPhotoPreview(null)}
        >
          <div className="relative max-w-xl max-h-[85vh] p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPhotoPreview(null)}
              className="absolute -top-3 -right-3 z-10 bg-white text-black rounded-full p-1.5 shadow-lg hover:bg-gray-200"
            >
              <X size={18} />
            </button>
            <img
              src={photoPreview}
              alt="Profile zoomed"
              className="max-h-[80vh] w-auto rounded-2xl object-contain shadow-2xl border-2 border-white/20"
            />
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Application */}
      {deletingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md bg-white shadow-2xl border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg text-rose-600 flex items-center gap-2">
                <Trash2 size={20} />
                Confirm Application Deletion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to permanently remove the application for{" "}
                <span className="font-semibold text-gray-900">{deletingApp.name}</span>?
              </p>
              <p className="text-xs text-gray-500">
                If this applicant was assigned to a leader slot, that slot will be immediately freed and reopened for new applicants.
              </p>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDeletingApp(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={confirmDeleteApplication}>
                  Confirm Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Confirm Reset Slot */}
      {resettingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md bg-white shadow-2xl border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg text-amber-600 flex items-center gap-2">
                <RotateCcw size={20} />
                Confirm Slot #{resettingSlot.position} Reset
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                Reset Slot #{resettingSlot.position} (
                <span className="font-semibold">
                  {resettingSlot.position <= 3 ? "Squad Leader" : "Squad Co-Leader"}
                </span>
                ) back to open status?
              </p>
              <p className="text-xs text-gray-500">
                Current occupant ({resettingSlot.name || "Assigned"}) will be cleared and the slot will immediately become available for next submissions.
              </p>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setResettingSlot(null)}>
                  Cancel
                </Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  size="sm"
                  onClick={confirmResetSlot}
                >
                  Confirm Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/40 bg-white/60 backdrop-blur mt-16">
        <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © 2026–2027 MEP — Administration Control Panel
          </p>
          <div className="text-xs text-gray-500 flex items-center gap-4">
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/" className="hover:underline">
              Public Homepage
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
