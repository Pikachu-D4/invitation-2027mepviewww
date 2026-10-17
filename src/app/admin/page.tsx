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
  Globe,
  LayoutDashboard,
  Instagram,
  UserCheck,
  ArrowRightLeft,
  AlertTriangle,
  Crown,
  Sparkles,
} from "lucide-react";
import { ContentManager } from "@/components/admin/ContentManager";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/content";

type Application = {
  id: number;
  name: string;
  email: string;
  whatsapp: string;
  instagramUsername?: string | null;
  requestedRole?: string | null;
  requestedPosition?: number | null;
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

async function parseResponsePayload<T = any>(
  res: Response
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  let data: any = null;
  let rawText = "";

  try {
    rawText = await res.text();
    if (rawText && rawText.trim()) {
      data = JSON.parse(rawText);
    }
  } catch {
    // Non-JSON response payload
  }

  if (!res.ok) {
    const errorMsg =
      (data && typeof data === "object" && (data.error || data.message)) ||
      (rawText && rawText.length > 0 && rawText.length < 200 && !rawText.includes("<html")
        ? rawText.trim()
        : null) ||
      `Request failed with status ${res.status}`;
    return { ok: false, status: res.status, data: null, error: String(errorMsg) };
  }

  return { ok: true, status: res.status, data: (data as T) ?? null, error: null };
}

export default function AdminPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // View mode switcher: 'dashboard' | 'content'
  const [adminView, setAdminView] = useState<"dashboard" | "content">("dashboard");

  // Website Content Management State
  const [siteContentState, setSiteContentState] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [originalContent, setOriginalContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [contentVersion, setContentVersion] = useState<number>(1);
  const [contentUpdatedAt, setContentUpdatedAt] = useState<string | Date | null>(null);
  const [contentRevisionsList, setContentRevisionsList] = useState<any[]>([]);
  const [isSavingContent, setIsSavingContent] = useState<boolean>(false);

  // Filters and search for applications
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [requestedRoleFilter, setRequestedRoleFilter] = useState<"all" | "Leader" | "Co-Leader">("all");
  const [assignedFilter, setAssignedFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");

  // Modals & interaction state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [deletingApp, setDeletingApp] = useState<Application | null>(null);
  const [resettingSlot, setResettingSlot] = useState<Leader | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Assign & Approve modal state
  const [assigningApp, setAssigningApp] = useState<Application | null>(null);
  const [selectedAssignSeat, setSelectedAssignSeat] = useState<number | null>(null);

  // Move / Reassign modal state
  const [reassigningApp, setReassigningApp] = useState<Application | null>(null);
  const [selectedReassignSeat, setSelectedReassignSeat] = useState<number | null>(null);
  const [confirmRoleChange, setConfirmRoleChange] = useState<boolean>(false);

  // Check if content has unsaved edits
  const isContentDirty = useMemo(() => {
    return JSON.stringify(siteContentState) !== JSON.stringify(originalContent);
  }, [siteContentState, originalContent]);

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
      const parsedApps = await parseResponsePayload<Application[]>(appsRes);
      if (!parsedApps.ok) throw new Error(parsedApps.error || "Failed to fetch applications");

      const leadersRes = await fetch(`/api/leaders?t=${Date.now()}`, { cache: "no-store" });
      const parsedLeaders = await parseResponsePayload<Leader[]>(leadersRes);
      if (!parsedLeaders.ok) throw new Error(parsedLeaders.error || "Failed to fetch leader slots");

      setApplications(Array.isArray(parsedApps.data) ? parsedApps.data : []);
      setLeaders(Array.isArray(parsedLeaders.data) ? parsedLeaders.data : []);
      setAuthenticated(true);

      // Also fetch content
      await fetchContentData();
    } catch (error: any) {
      console.error("Error fetching admin data:", error);
      toast.error(error?.message || "Failed to load admin data. Check database connection.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchContentData() {
    try {
      const res = await fetch(`/api/admin/content?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const parsed = await parseResponsePayload<{
          content?: SiteContent;
          version?: number;
          updatedAt?: string | Date;
          revisions?: any[];
        }>(res);
        const data = parsed.data;
        if (data && data.content) {
          setSiteContentState(data.content);
          setOriginalContent(data.content);
          setContentVersion(data.version || 1);
          setContentUpdatedAt(data.updatedAt || null);
          setContentRevisionsList(Array.isArray(data.revisions) ? data.revisions : []);
        }
      }
    } catch (err) {
      console.warn("Could not load content data:", err);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });

      const parsed = await parseResponsePayload(res);

      if (!parsed.ok) {
        setLoginError(parsed.error || "Authentication failed.");
        return;
      }

      setAuthenticated(true);
      setAdminPassword("");
      toast.success("Welcome to MEP 2027 Admin Console!");
      await fetchData();
    } catch {
      setLoginError("Could not connect to authentication service.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAuthenticated(false);
      setApplications([]);
      setLeaders([]);
      toast.info("Logged out successfully.");
    }
  }

  // Content Management: Save Content
  async function handleSaveContent() {
    setIsSavingContent(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(siteContentState),
      });

      const parsed = await parseResponsePayload<{
        content?: SiteContent;
        version?: number;
        updatedAt?: string | Date;
      }>(res);

      if (!parsed.ok || !parsed.data) {
        throw new Error(parsed.error || "Failed to save website content");
      }

      const savedContent = parsed.data.content || siteContentState;
      setOriginalContent(savedContent);
      setSiteContentState(savedContent);
      setContentVersion(parsed.data.version ?? (contentVersion + 1));
      setContentUpdatedAt(parsed.data.updatedAt || new Date());
      toast.success("Website content saved and published successfully!");
      await fetchContentData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save website content");
    } finally {
      setIsSavingContent(false);
    }
  }

  // Content Management: Discard Edits
  function handleDiscardContent() {
    setSiteContentState(JSON.parse(JSON.stringify(originalContent)));
    toast.info("Unsaved edits discarded");
  }

  // Content Management: Reset to Defaults
  async function handleResetDefaultContent() {
    setIsSavingContent(true);
    try {
      const res = await fetch("/api/admin/content/reset", {
        method: "POST",
      });

      const parsed = await parseResponsePayload<{
        content?: SiteContent;
        version?: number;
      }>(res);

      if (!parsed.ok || !parsed.data) {
        throw new Error(parsed.error || "Failed to reset content");
      }

      const resetContent = parsed.data.content || DEFAULT_SITE_CONTENT;
      setOriginalContent(resetContent);
      setSiteContentState(resetContent);
      setContentVersion(parsed.data.version || 1);
      setContentUpdatedAt(new Date());
      toast.success("Website content reset to defaults!");
      await fetchContentData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reset content");
    } finally {
      setIsSavingContent(false);
    }
  }

  // Open Assign & Approve modal
  function openAssignModal(app: Application) {
    setAssigningApp(app);
    // If the applicant requested a specific position and that slot is open, preselect it
    if (app.requestedPosition && app.requestedPosition >= 1 && app.requestedPosition <= 6) {
      const slot = leaders.find((l) => l.position === app.requestedPosition);
      if (slot && slot.status === "open") {
        setSelectedAssignSeat(slot.id);
        return;
      }
    }
    // If preferred was flexible or occupied, preselect first open slot matching requested role
    const matchingOpenSlot = leaders.find(
      (l) => l.status === "open" && (!app.requestedRole || l.role === app.requestedRole)
    );
    if (matchingOpenSlot) {
      setSelectedAssignSeat(matchingOpenSlot.id);
    } else {
      const anyOpen = leaders.find((l) => l.status === "open");
      setSelectedAssignSeat(anyOpen ? anyOpen.id : null);
    }
  }

  // Confirm Assign & Approve
  async function confirmAssignAndApprove() {
    if (!assigningApp || !selectedAssignSeat) {
      toast.error("Please choose an available seat to assign.");
      return;
    }

    setActionLoadingId(assigningApp.id);
    try {
      const res = await fetch(`/api/applications/${assigningApp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaderId: selectedAssignSeat,
          status: "approved",
        }),
      });

      const parsed = await parseResponsePayload(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || "Failed to assign seat.");
      }

      toast.success(`Assigned ${assigningApp.name} to Slot #${selectedAssignSeat} and approved!`);
      setAssigningApp(null);
      setSelectedAssignSeat(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Seat assignment failed.");
    } finally {
      setActionLoadingId(null);
    }
  }

  // Open Move / Reassign modal
  function openReassignModal(app: Application) {
    setReassigningApp(app);
    setSelectedReassignSeat(app.leaderId);
    setConfirmRoleChange(false);
  }

  // Confirm Move / Reassign
  async function confirmReassign() {
    if (!reassigningApp) return;

    setActionLoadingId(reassigningApp.id);
    try {
      const res = await fetch(`/api/applications/${reassigningApp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaderId: selectedReassignSeat, // number or null
          status: selectedReassignSeat === null ? "pending" : "approved",
        }),
      });

      const parsed = await parseResponsePayload(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || "Failed to reassign seat.");
      }

      if (selectedReassignSeat === null) {
        toast.success(`Moved ${reassigningApp.name} to waiting list (unassigned).`);
      } else {
        toast.success(`Successfully moved ${reassigningApp.name} to Slot #${selectedReassignSeat}!`);
      }

      setReassigningApp(null);
      setSelectedReassignSeat(null);
      setConfirmRoleChange(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Reassignment failed.");
    } finally {
      setActionLoadingId(null);
    }
  }

  // Update application status (approved, rejected, pending)
  async function handleStatusUpdate(id: number, newStatus: "approved" | "rejected" | "pending") {
    const targetApp = applications.find((a) => a.id === id);

    // If approving an unassigned application, direct to Assign & Approve modal
    if (newStatus === "approved" && targetApp && !targetApp.leaderId) {
      openAssignModal(targetApp);
      return;
    }

    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const parsed = await parseResponsePayload(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || "Failed to update status");
      }

      await fetchData();
      if (selectedApp && selectedApp.id === id) {
        setSelectedApp((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                leaderId: newStatus === "approved" ? prev.leaderId : null,
              }
            : null
        );
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

      const parsed = await parseResponsePayload(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || "Failed to delete application");
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

      const parsed = await parseResponsePayload(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || "Failed to reset slot");
      }

      toast.success(`Slot #${target.position} reset to open (assigned applicant moved to pending)`);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reset slot");
    }
  }

  // CSV Export with formula injection protection
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
      "Instagram Username",
      "Requested Role",
      "Requested Position",
      "Assigned Role",
      "Assigned Position",
      "Status",
      "Applied Date",
      "Bio",
    ];

    const escapeCSV = (val: string | null | undefined | number) => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      // Protect against spreadsheet formula injection: if value starts with =, +, -, @, prepend single quote
      if (/^[=+\-@]/.test(str)) {
        str = "'" + str;
      }
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = filteredApplications.map((app) => {
      const linked = leaders.find((l) => l.id === app.leaderId);
      const reqPos =
        app.requestedPosition && app.requestedPosition > 0
          ? `Position #${app.requestedPosition}`
          : "Flexible / Any";
      return [
        app.id,
        escapeCSV(app.name),
        escapeCSV(app.email),
        escapeCSV(app.whatsapp),
        escapeCSV(app.instagramUsername ? `@${app.instagramUsername}` : ""),
        escapeCSV(app.requestedRole || "Not specified"),
        escapeCSV(reqPos),
        escapeCSV(linked ? linked.role : "Unassigned / Waiting List"),
        escapeCSV(linked ? `Slot #${linked.position}` : ""),
        escapeCSV(app.status),
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

    if (requestedRoleFilter !== "all") {
      list = list.filter((a) => a.requestedRole === requestedRoleFilter);
    }

    if (assignedFilter === "assigned") {
      list = list.filter((a) => a.leaderId !== null && a.leaderId !== undefined);
    } else if (assignedFilter === "unassigned") {
      list = list.filter((a) => !a.leaderId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.whatsapp.toLowerCase().includes(q) ||
          (a.instagramUsername && a.instagramUsername.toLowerCase().includes(q))
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
  }, [applications, statusFilter, requestedRoleFilter, assignedFilter, searchQuery, sortBy]);

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

              {loginError && <p className="text-xs text-red-600 font-medium">{loginError}</p>}

              <Button
                type="submit"
                disabled={loggingIn || !adminPassword}
                className="w-full text-black hover:brightness-105"
                style={{ backgroundImage: "linear-gradient(135deg,#D7C4F3,#A7D8FF)" }}
              >
                {loggingIn ? "Verifying..." : "Sign In to Admin Portal"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/40 text-gray-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-white/60 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 transition text-gray-700 flex items-center gap-1.5"
            >
              <Globe size={14} />
              View Site
            </Link>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-sm tracking-wide text-gray-900" style={{ fontFamily: "Cinzel, serif" }}>
              MEP 2027 Admin Control Center
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Nav Switcher: Dashboard vs Content Manager */}
            <div className="flex items-center bg-gray-100/80 p-0.5 rounded-lg border border-gray-200 text-xs">
              <button
                type="button"
                onClick={() => setAdminView("dashboard")}
                className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                  adminView === "dashboard"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <LayoutDashboard size={14} />
                Applications & Leaders
              </button>
              <button
                type="button"
                onClick={() => setAdminView("content")}
                className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                  adminView === "content"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Globe size={14} />
                Website Content CMS
              </button>
            </div>

            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-rose-700 hover:bg-rose-50">
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8 space-y-8">
        {/* VIEW 1: WEBSITE CONTENT MANAGER CMS */}
        {adminView === "content" && (
          <ContentManager
            content={siteContentState}
            onChange={setSiteContentState}
            onSave={handleSaveContent}
            onDiscard={handleDiscardContent}
            onResetDefault={handleResetDefaultContent}
            isSaving={isSavingContent}
            isDirty={isContentDirty}
            version={contentVersion}
            updatedAt={contentUpdatedAt}
            revisions={contentRevisionsList}
          />
        )}

        {/* VIEW 2: APPLICATIONS & LEADERS DASHBOARD */}
        {adminView === "dashboard" && (
          <>
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
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={applications.length === 0}
                  className="bg-white/70 hover:bg-white border-gray-300 text-gray-800"
                >
                  <Download size={14} className="mr-1.5" />
                  Export CSV ({filteredApplications.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  disabled={loading}
                  className="bg-white/70 hover:bg-white border-gray-300"
                >
                  <RotateCcw size={14} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
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
                  Click &quot;Reset Slot&quot; to reopen any slot and return occupant to waiting list.
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leaders.map((leader) => {
                    const isLeader = leader.position <= 3;
                    const isFilled = leader.status === "filled";
                    const assignedApp = applications.find((a) => a.leaderId === leader.id);

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
                              <div className="mt-3 pt-2 border-t border-emerald-200/60 flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 border-indigo-200 bg-white"
                                  onClick={() => {
                                    if (assignedApp) {
                                      openReassignModal(assignedApp);
                                    } else {
                                      toast.info(`No application record currently linked to Slot #${leader.position}`);
                                    }
                                  }}
                                >
                                  <ArrowRightLeft size={12} className="mr-1" />
                                  Reassign
                                </Button>
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
              <CardHeader className="pb-4 border-b border-gray-100 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold" style={{ fontFamily: "Cinzel, serif" }}>
                      Submitted Applications ({filteredApplications.length})
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Review preferences, Instagram handles, assign open seats, and manage approvals.
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

                {/* Second Filter Row: Role Preference & Assignment Status */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
                  <span className="text-gray-500 font-medium">Role Preference:</span>
                  {(["all", "Leader", "Co-Leader"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRequestedRoleFilter(r)}
                      className={`px-2.5 py-1 rounded-md transition font-medium ${
                        requestedRoleFilter === r
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {r === "all" ? "All Roles" : r === "Leader" ? "Squad Leader" : "Squad Co-Leader"}
                    </button>
                  ))}

                  <span className="text-gray-300 mx-1">|</span>

                  <span className="text-gray-500 font-medium">Seat Assignment:</span>
                  {(["all", "assigned", "unassigned"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAssignedFilter(a)}
                      className={`px-2.5 py-1 rounded-md transition font-medium ${
                        assignedFilter === a
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {a === "all"
                        ? "All Records"
                        : a === "assigned"
                        ? "Assigned Only"
                        : "Unassigned / Waiting List"}
                    </button>
                  ))}
                </div>

                {/* Search and Sort Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search applicants by name, email, WhatsApp, or Instagram..."
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
                      {searchQuery || statusFilter !== "all" || requestedRoleFilter !== "all" || assignedFilter !== "all"
                        ? "Try adjusting your search query or filters to view other submissions."
                        : "No applications have been recorded yet."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredApplications.map((app) => {
                      const linkedLeader = leaders.find((l) => l.id === app.leaderId);
                      const isUpdating = actionLoadingId === app.id;
                      const hasSeat = !!app.leaderId;

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

                                  {/* Preference Badge */}
                                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-300">
                                    Preference: {app.requestedRole || "Flexible"} •{" "}
                                    {app.requestedPosition && app.requestedPosition > 0
                                      ? `Slot #${app.requestedPosition}`
                                      : "Any Slot"}
                                  </Badge>

                                  {/* Actual Assignment Badge */}
                                  {linkedLeader ? (
                                    <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-semibold">
                                      Assigned: {linkedLeader.role} • Slot #{linkedLeader.position}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-xs">
                                      Unassigned / Waiting List
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
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-1 gap-x-4 text-xs sm:text-sm text-gray-600 mb-3">
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

                                {app.instagramUsername ? (
                                  <div className="flex items-center gap-1.5 truncate">
                                    <Instagram size={14} className="text-pink-600 flex-shrink-0" />
                                    <a
                                      href={`https://instagram.com/${app.instagramUsername}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="hover:text-pink-600 hover:underline truncate font-mono text-xs"
                                    >
                                      @{app.instagramUsername}
                                    </a>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                                    <Instagram size={14} className="flex-shrink-0" />
                                    <span>No Instagram handle</span>
                                  </div>
                                )}

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
                                  View Details
                                </Button>

                                <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                                  {/* CORE WORKFLOW ACTION 1: Assign & Approve (for unassigned applicants) */}
                                  {!hasSeat && (
                                    <Button
                                      size="sm"
                                      disabled={isUpdating}
                                      className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                                      onClick={() => openAssignModal(app)}
                                    >
                                      <UserCheck size={13} className="mr-1.5" />
                                      Assign & Approve
                                    </Button>
                                  )}

                                  {/* CORE WORKFLOW ACTION 2: Move / Reassign (for assigned applicants) */}
                                  {hasSeat && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isUpdating}
                                      className="h-8 px-3 text-xs text-indigo-700 border-indigo-300 hover:bg-indigo-50 bg-white font-medium shadow-xs"
                                      onClick={() => openReassignModal(app)}
                                    >
                                      <ArrowRightLeft size={13} className="mr-1.5" />
                                      Move / Reassign
                                    </Button>
                                  )}

                                  {/* Standard Status Controls */}
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
                                      Pending
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
          </>
        )}
      </main>

      {/* Modal: Assign & Approve for Unassigned Applications */}
      {assigningApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-xl bg-white shadow-2xl border-gray-200 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900" style={{ fontFamily: "Cinzel, serif" }}>
                  Assign Seat & Approve Application
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Allocate an available public seat to confirm {assigningApp.name}&apos;s placement.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={() => setAssigningApp(null)}
              >
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Applicant Preference Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Applicant:</span>
                  <span className="font-semibold text-gray-900">{assigningApp.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Requested Role:</span>
                  <Badge variant="outline" className="font-semibold text-blue-800 bg-blue-50 border-blue-200">
                    {assigningApp.requestedRole === "Leader" ? "Squad Leader" : "Squad Co-Leader"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Preferred Seat:</span>
                  <span className="font-semibold text-gray-900">
                    {assigningApp.requestedPosition && assigningApp.requestedPosition > 0
                      ? `Position #${assigningApp.requestedPosition}`
                      : "Any Available Position (Flexible)"}
                  </span>
                </div>
              </div>

              {/* Occupied Preferred Slot Notice */}
              {assigningApp.requestedPosition &&
                assigningApp.requestedPosition > 0 &&
                leaders.find((l) => l.position === assigningApp.requestedPosition)?.status === "filled" && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Preferred Seat (Slot #{assigningApp.requestedPosition}) is Occupied.</strong>
                      <p className="mt-0.5 text-2xs text-amber-700">
                        Occupied by {leaders.find((l) => l.position === assigningApp.requestedPosition)?.name || "another applicant"}. Please select another open seat below or leave unassigned on waiting list.
                      </p>
                    </div>
                  </div>
                )}

              {/* Seat Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-2">
                  Select Seat to Assign:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {leaders.map((leader) => {
                    const isOccupied = leader.status === "filled";
                    const isSelected = selectedAssignSeat === leader.id;
                    const isPreferred = assigningApp.requestedPosition === leader.position;

                    return (
                      <div
                        key={leader.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (!isOccupied) setSelectedAssignSeat(leader.id);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isOccupied
                            ? "border-gray-200 bg-gray-100/70 opacity-60 cursor-not-allowed"
                            : isSelected
                            ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-300 shadow-xs cursor-pointer"
                            : "border-gray-200 bg-white hover:bg-gray-50 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-900">
                            Slot #{leader.position}
                          </span>
                          <span
                            className={`text-3xs uppercase font-bold px-1.5 py-0.5 rounded-full ${
                              isOccupied
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {isOccupied ? "Occupied" : "Open"}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          {leader.role === "Leader" ? (
                            <Crown size={12} className="text-amber-600" />
                          ) : (
                            <Sparkles size={12} className="text-indigo-600" />
                          )}
                          {leader.role}
                        </div>
                        {isOccupied && (
                          <div className="text-3xs text-gray-500 mt-1 truncate">
                            Occupant: {leader.name || "Assigned"}
                          </div>
                        )}
                        {isPreferred && (
                          <div className="mt-1 text-3xs font-semibold text-blue-700">
                            ★ Applicant&apos;s Preference
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setAssigningApp(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!selectedAssignSeat || actionLoadingId === assigningApp.id}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                  onClick={confirmAssignAndApprove}
                >
                  <CheckCircle size={14} className="mr-1.5" />
                  Confirm Assignment & Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Move / Reassign for Assigned Applicants */}
      {reassigningApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-xl bg-white shadow-2xl border-gray-200 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900" style={{ fontFamily: "Cinzel, serif" }}>
                  Move / Reassign Leadership Seat
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Change {reassigningApp.name}&apos;s assigned seat across Squad Leader and Co-Leader roles.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={() => setReassigningApp(null)}
              >
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Current Assignment Details */}
              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Applicant:</span>
                  <span className="font-semibold text-gray-900">{reassigningApp.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Current Seat:</span>
                  <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300">
                    Slot #{reassigningApp.leaderId} ({leaders.find((l) => l.id === reassigningApp.leaderId)?.role})
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Original Preference:</span>
                  <span className="font-semibold text-gray-800">
                    {reassigningApp.requestedRole || "Flexible"} •{" "}
                    {reassigningApp.requestedPosition && reassigningApp.requestedPosition > 0
                      ? `Position #${reassigningApp.requestedPosition}`
                      : "Flexible"}
                  </span>
                </div>
              </div>

              {/* Destination Seat Choice */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-2">
                  Select Destination Seat:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {leaders.map((leader) => {
                    const isCurrent = reassigningApp.leaderId === leader.id;
                    const isOccupiedByOther = leader.status === "filled" && !isCurrent;
                    const isSelected = selectedReassignSeat === leader.id;

                    return (
                      <div
                        key={leader.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (!isOccupiedByOther) {
                            setSelectedReassignSeat(leader.id);
                            // Check if cross role move
                            const currentSlot = leaders.find((l) => l.id === reassigningApp.leaderId);
                            if (currentSlot && currentSlot.role !== leader.role) {
                              setConfirmRoleChange(true);
                            } else {
                              setConfirmRoleChange(false);
                            }
                          }
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isOccupiedByOther
                            ? "border-gray-200 bg-gray-100/70 opacity-60 cursor-not-allowed"
                            : isSelected
                            ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-300 shadow-xs cursor-pointer"
                            : "border-gray-200 bg-white hover:bg-gray-50 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-900">
                            Slot #{leader.position}
                          </span>
                          <span
                            className={`text-3xs uppercase font-bold px-1.5 py-0.5 rounded-full ${
                              isCurrent
                                ? "bg-blue-100 text-blue-800 font-bold"
                                : isOccupiedByOther
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {isCurrent ? "Current" : isOccupiedByOther ? "Occupied" : "Available"}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          {leader.role === "Leader" ? (
                            <Crown size={12} className="text-amber-600" />
                          ) : (
                            <Sparkles size={12} className="text-indigo-600" />
                          )}
                          {leader.role}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Option: Move back to waiting list (unassign) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedReassignSeat(null);
                  setConfirmRoleChange(false);
                }}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-between ${
                  selectedReassignSeat === null
                    ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-300 font-semibold"
                    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                }`}
              >
                <span>Unassign & Move to Waiting List (Pending Review)</span>
                <span className="text-2xs text-amber-700">Frees Slot #{reassigningApp.leaderId}</span>
              </button>

              {/* Cross-Role Transition Warning */}
              {confirmRoleChange && selectedReassignSeat && (
                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Cross-Role Transition:</strong>
                    <p className="mt-0.5 text-2xs text-indigo-700">
                      Moving applicant from {leaders.find((l) => l.id === reassigningApp.leaderId)?.role} to {leaders.find((l) => l.id === selectedReassignSeat)?.role}. Original applicant preference is preserved.
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setReassigningApp(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={actionLoadingId === reassigningApp.id}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
                  onClick={confirmReassign}
                >
                  <ArrowRightLeft size={14} className="mr-1.5" />
                  Confirm Move
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                    {selectedApp.instagramUsername && (
                      <p className="flex items-center justify-center sm:justify-start gap-2">
                        <Instagram size={15} className="text-pink-600" />
                        <a
                          href={`https://instagram.com/${selectedApp.instagramUsername}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-pink-600 hover:underline font-mono"
                        >
                          @{selectedApp.instagramUsername}
                        </a>
                      </p>
                    )}
                    <p className="flex items-center justify-center sm:justify-start gap-2 text-xs text-gray-500">
                      <Calendar size={14} className="text-gray-400" />
                      Applied: {new Date(selectedApp.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Preference vs Assignment Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-gray-500 block font-medium">Applicant Preference:</span>
                  <span className="font-semibold text-gray-900 mt-0.5 block">
                    {selectedApp.requestedRole || "Not specified"} •{" "}
                    {selectedApp.requestedPosition && selectedApp.requestedPosition > 0
                      ? `Position #${selectedApp.requestedPosition}`
                      : "Flexible / Any Seat"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block font-medium">Actual Confirmed Assignment:</span>
                  {selectedApp.leaderId ? (
                    <span className="font-semibold text-emerald-800 mt-0.5 block">
                      Slot #{selectedApp.leaderId} ({leaders.find((l) => l.id === selectedApp.leaderId)?.role})
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-700 mt-0.5 block">
                      Unassigned / Waiting List
                    </span>
                  )}
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

              {/* Status & Assignment Action Buttons */}
              <div className="pt-4 border-t flex flex-wrap items-center justify-end gap-2">
                {!selectedApp.leaderId ? (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    onClick={() => {
                      const appToAssign = selectedApp;
                      setSelectedApp(null);
                      openAssignModal(appToAssign);
                    }}
                  >
                    <UserCheck size={14} className="mr-1.5" />
                    Assign & Approve
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                    onClick={() => {
                      const appToReassign = selectedApp;
                      setSelectedApp(null);
                      openReassignModal(appToReassign);
                    }}
                  >
                    <ArrowRightLeft size={14} className="mr-1.5" />
                    Move / Reassign
                  </Button>
                )}

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
                  Delete
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
                Current occupant ({resettingSlot.name || "Assigned"}) will be cleared and their application returned to the pending waiting list.
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
