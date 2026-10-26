import React, { useState, useEffect, useCallback } from 'react';
import {
  Link
} from 'react-router-dom';
import {
  ShieldCheck,
  Briefcase,
  HardDrive,
  Users,
  LogOut,
  Lock,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  Activity,
  Clock,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  History,
  Send,
  Phone,
  Mail,
  AlertTriangle,
  ExternalLink,
  Video,
  Sparkles,
  Download,
  Flame,
  X,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Moon,
  Sun,
  Crown,
  Edit3,
  ArrowLeft
} from 'lucide-react';
import {
  Button,
  Badge,
  EmptyState,
  ErrorState,
  Skeleton,
  Input,
  Textarea,
  Container,
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  TabsContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  toast
} from '../components/ui';
import {
  PageTransition
} from '../components/animations/PageTransition';
import {
  loginStaff,
  logoutStaff,
  inspectSession,
  fetchLeadsPaged,
  getLeadDetails,
  addLeadNote,
  updateLeadStatus,
  buildWhatsAppUrl
} from '../api';
import {
  StaffUser,
  LeadRecord,
  LeadStatus,
  LeadPagination,
  LeadQueryParams
} from '../types';
import {
  usePageSEO
} from '../utils/seo';

export const AdminPage: React.FC = () => {
  // The console has no navbar, so it applies the saved theme itself and offers its own toggle
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => localStorage.getItem('marsnova_theme') === 'dark');
  useEffect(() => {
    document.body.classList.toggle('theme-dark', isDarkTheme);
    document.body.classList.toggle('theme-porcelain-ice', !isDarkTheme);
  }, [isDarkTheme]);
  const toggleAdminTheme = () => {
    const next = !isDarkTheme;
    localStorage.setItem('marsnova_theme', next ? 'dark' : 'porcelain');
    setIsDarkTheme(next);
  };

  usePageSEO({
    title: 'Operations Admin Portal | MarsNova',
    description: 'Internal operations administration console for MarsNova Studio.',
    canonicalPath: '/admin'
  });

  const [activeTab, setActiveTab] = useState<string>('enquiries');

  // Staff Authentication State
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginSubmitting, setLoginSubmitting] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [sessionVerifying, setSessionVerifying] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loginThemeMode, setLoginThemeMode] = useState<'neumorphic' | 'dark'>('neumorphic');

  // Leads & Inquiries State
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [leadsLoading, setLeadsLoading] = useState<boolean>(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [leadPagination, setLeadPagination] = useState<LeadPagination>({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false
  });

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Lead Details Modal / Drawer State
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Follow-up Note Form State
  const [noteContent, setNoteContent] = useState<string>('');
  const [noteSubmitting, setNoteSubmitting] = useState<boolean>(false);

  // Status Change State
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [statusChangeNote, setStatusChangeNote] = useState<string>('');
  const [statusSubmitting, setStatusSubmitting] = useState<boolean>(false);

  // Fetch leads with server-side pagination & filter combinations
  const knownLeadTotal = React.useRef<number | null>(null);
  const loadLeads = useCallback(
    async (pageToLoad: number = leadPagination.page, signal?: AbortSignal, silent = false) => {
      if (!silent) setLeadsLoading(true);
      if (!silent) setLeadsError(null);
      try {
        const queryParams: LeadQueryParams = {
          page: pageToLoad,
          limit: leadPagination.limit,
          sort_by: sortBy,
          order: sortOrder
        };

        if (searchQuery.trim()) queryParams.q = searchQuery.trim();
        if (statusFilter !== 'all') queryParams.status = statusFilter;
        if (serviceFilter !== 'all') queryParams.service = serviceFilter;
        if (sourceFilter !== 'all') queryParams.source = sourceFilter;

        const result = await fetchLeadsPaged(queryParams, signal);
        // a background refresh that finds more leads than before means someone just submitted an enquiry
        if (silent && knownLeadTotal.current !== null && result.pagination.total > knownLeadTotal.current) {
          const fresh = result.pagination.total - knownLeadTotal.current;
          const newest = result.data[0];
          toast.success(fresh === 1 && newest ? `New lead: ${newest.full_name}` : `${fresh} new leads received`);
        }
        knownLeadTotal.current = result.pagination.total;
        setLeads(result.data);
        setLeadPagination(result.pagination);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        if (silent) return; // a failed background refresh keeps what is on screen
        const msg = err.message || 'Failed to load leads from server';
        setLeadsError(msg);
        toast.error(msg);
      } finally {
        if (!silent) setLeadsLoading(false);
      }
    },
    [leadPagination.page, leadPagination.limit, searchQuery, statusFilter, serviceFilter, sourceFilter, sortBy, sortOrder]
  );

  // Load Lead Details & Activity History
  const loadLeadDetails = useCallback(async (id: string, signal?: AbortSignal) => {
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const data = await getLeadDetails(id, signal);
      setSelectedLead(data);
      setTargetStatus(data.status);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const msg = err.message || 'Failed to load lead details';
      setDetailsError(msg);
      toast.error(msg);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  // Inspect session on mount
  useEffect(() => {
    const controller = new AbortController();
    inspectSession()
      .then((user) => {
        if (user && user.status === 'active') {
          setCurrentUser(user as StaffUser);
          loadLeads(1, controller.signal);
        } else {
          setCurrentUser(null);
        }
        setAuthLoading(false);
      })
      .catch(() => {
        setCurrentUser(null);
        setAuthLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [loadLeads]);

  // Live updates: enquiries submitted on the website show up here without a manual reload. Poll while the tab is
  // visible and refresh straight away when the tab regains focus.
  useEffect(() => {
    if (!currentUser) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') loadLeads(leadPagination.page, undefined, true);
    };
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [currentUser, loadLeads, leadPagination.page]);

  // Re-fetch leads when filters or pagination page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > leadPagination.total_pages) return;
    loadLeads(newPage);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLeads(1);
  };

  const applyDirectFilter = (newStatus: string) => {
    setStatusFilter(newStatus);
    setLeadsLoading(true);
    setLeadsError(null);
    const queryParams: LeadQueryParams = {
      page: 1,
      limit: leadPagination.limit,
      sort_by: sortBy,
      order: sortOrder,
      status: newStatus !== 'all' ? newStatus : undefined,
      service: serviceFilter !== 'all' ? serviceFilter : undefined,
      q: searchQuery.trim() || undefined
    };
    fetchLeadsPaged(queryParams)
      .then((result) => {
        setLeads(result.data);
        setLeadPagination(result.pagination);
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to filter leads');
      })
      .finally(() => {
        setLeadsLoading(false);
      });
  };

  const exportLeadsToCsv = () => {
    if (!leads.length) {
      toast.info('No leads available to export.');
      return;
    }
    const headers = ['Lead ID', 'Full Name', 'Email', 'Phone', 'Service Requested', 'Source', 'Status', 'Created At'];
    const rows = leads.map((l) => [
      `"${l.id}"`,
      `"${(l.full_name || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      `"${(l.service_requested || '').replace(/"/g, '""')}"`,
      `"${(l.source || '').replace(/"/g, '""')}"`,
      `"${l.status}"`,
      `"${l.created_at}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `marsnova_leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${leads.length} leads to CSV.`);
  };

  const getInitials = (name: string) => {
    if (!name) return 'MN';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getServiceIcon = (service: string) => {
    const s = (service || '').toLowerCase();
    if (s.includes('video') || s.includes('topic')) return <Video size={13} style={{ color: 'var(--purple-glow)' }} />;
    if (s.includes('pen drive') || s.includes('recovery')) return <HardDrive size={13} style={{ color: 'var(--cyan-accent)' }} />;
    if (s.includes('ai') || s.includes('automation')) return <Sparkles size={13} style={{ color: '#38BDF8' }} />;
    if (s.includes('brand') || s.includes('promotion')) return <TrendingUp size={13} style={{ color: '#F59E0B' }} />;
    return <Briefcase size={13} style={{ color: 'var(--text-muted)' }} />;
  };

  const formatDisplayDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setServiceFilter('all');
    setSourceFilter('all');
    setSortBy('created_at');
    setSortOrder('desc');
    setLeadsLoading(true);
    fetchLeadsPaged({ page: 1, limit: leadPagination.limit, sort_by: 'created_at', order: 'desc' })
      .then((res) => {
        setLeads(res.data);
        setLeadPagination(res.pagination);
      })
      .catch((err) => toast.error(err.message || 'Failed to reload leads'))
      .finally(() => setLeadsLoading(false));
  };

  // Open Lead Details Dialog
  const handleOpenLead = (id: string) => {
    setSelectedLeadId(id);
    loadLeadDetails(id);
  };

  // Add Follow-Up Note Handler
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !noteContent.trim()) return;

    setNoteSubmitting(true);
    try {
      await addLeadNote(selectedLead.id, noteContent.trim());
      toast.success('Follow-up note recorded with audit history.');
      setNoteContent('');
      // Reload details to obtain new activity and version
      await loadLeadDetails(selectedLead.id);
      loadLeads();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add note');
    } finally {
      setNoteSubmitting(false);
    }
  };

  // Update Status with Concurrency & RBAC check
  const handleUpdateStatus = async () => {
    if (!selectedLead || !targetStatus || targetStatus === selectedLead.status) return;

    setStatusSubmitting(true);
    try {
      const res = await updateLeadStatus(
        selectedLead.id,
        targetStatus,
        statusChangeNote.trim(),
        selectedLead.version,
        selectedLead.status
      );

      toast.success(res.message || `Status updated to ${targetStatus}`);
      setStatusChangeNote('');
      setSelectedLead(res.lead);
      loadLeads();
    } catch (err: any) {
      const msg = err.message || 'Status transition failed';
      toast.error(msg);
      // If concurrent modification was detected, refresh lead details to show latest version
      if (err.code === 'CONCURRENT_MODIFICATION_DETECTED' || err.status === 409) {
        toast.info('Reloading latest lead version from server...');
        loadLeadDetails(selectedLead.id);
      }
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSubmitting(true);

    try {
      const session = await loginStaff({
        email: loginEmail,
        password: loginPassword
      });

      setCurrentUser(session.user);
      setLoginPassword('');
      toast.success(`Authenticated as ${session.user.full_name} (${session.user.role})`);
      loadLeads(1);
    } catch (err: any) {
      const msg = err.message || 'Staff authentication failed';
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Drops everything the console fetched, so the next person to sign in on this browser never sees the
  // previous session's records (a lower-privilege login would otherwise show them if its own fetch is refused).
  const clearConsoleData = () => {
    setLeads([]);
    knownLeadTotal.current = null;
  };

  const handleLogout = async () => {
    try {
      await logoutStaff();
      setCurrentUser(null);
      clearConsoleData();
      toast.info('Staff session ended securely.');
    } catch (err: any) {
      toast.error('Logout error: ' + (err.message || 'Unknown error'));
      setCurrentUser(null);
      clearConsoleData();
    }
  };

  const handleVerifySession = async () => {
    setSessionVerifying(true);
    try {
      const user = await inspectSession();
      if (user && user.status === 'active') {
        setCurrentUser(user as StaffUser);
        toast.success(`Active session verified: ${user.email} [${user.role}]`);
        loadLeads();
      } else {
        setCurrentUser(null);
        toast.warning('Session expired or inactive. Please log in again.');
      }
    } catch {
      toast.error('Session inspection failed.');
    } finally {
      setSessionVerifying(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'purple';
      case 'agency_manager':
        return 'cyan';
      default:
        return 'secondary';
    }
  };

  const getLeadStatusBadgeVariant = (status: LeadStatus) => {
    switch (status) {
      case 'new':
        return 'cyan';
      case 'contacted':
        return 'purple';
      case 'qualified':
        return 'outline';
      case 'proposal_sent':
        return 'outline';
      case 'converted':
        return 'success';
      case 'lost':
        return 'destructive';
      case 'archived':
      default:
        return 'secondary';
    }
  };

  const getNotificationStatusBadge = (status?: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return { variant: 'success' as const, label: status.toUpperCase() };
      case 'fallback_click_to_chat':
        return { variant: 'cyan' as const, label: 'CLICK-TO-CHAT FALLBACK' };
      case 'failed':
        return { variant: 'destructive' as const, label: 'FAILED' };
      case 'pending':
        return { variant: 'outline' as const, label: 'PENDING' };
      default:
        return { variant: 'secondary' as const, label: 'READY' };
    }
  };

  // State Machine allowed transitions calculator
  const getAllowedTransitions = (current: LeadStatus): LeadStatus[] => {
    switch (current) {
      case 'new':
        return ['contacted', 'lost', 'archived'];
      case 'contacted':
        return ['qualified', 'lost', 'archived'];
      case 'qualified':
        return ['proposal_sent', 'lost', 'archived'];
      case 'proposal_sent':
        return ['converted', 'lost', 'archived'];
      case 'converted':
        return ['archived'];
      case 'lost':
        return ['contacted', 'archived'];
      case 'archived':
        return ['new'];
      default:
        return [];
    }
  };

  // 1. Initial Authentication Loading State
  if (authLoading) {
    return (
      <div style={{ padding: '100px 0', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container>
          <div style={{ textAlign: 'center', maxWidth: '420px', margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(0, 240, 255, 0.1)', marginBottom: '16px' }}>
              <ShieldCheck size={36} style={{ color: 'var(--cyan-accent)' }} />
            </div>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700 }}>Verifying Staff Session...</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
              Inspecting session cookie and verifying account status with MarsNova RBAC.
            </p>
          </div>
        </Container>
      </div>
    );
  }

  // 2. Unauthenticated State (Login Portal - Soft Porcelain Neumorphic & Cosmic Dark)
  if (!currentUser) {
    const isNeumorphic = loginThemeMode === 'neumorphic';

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          position: 'relative',
          overflow: 'hidden',
          background: isNeumorphic
            ? 'radial-gradient(circle at 15% 18%, #d8e6fd 0%, #edf3fd 35%, #f2f6fc 70%, #e2edfd 100%)'
            : 'var(--bg-deep)',
          transition: 'background 0.4s ease'
        }}
      >
        {/* Soft Neumorphic Background Elements (from user design reference) */}
        {isNeumorphic && (
          <>
            {/* Top-Left Glowing Concentric Neumorphic Ring */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '-70px',
                left: '-90px',
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                border: '28px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '16px 16px 36px rgba(166, 185, 214, 0.42), inset 10px 10px 20px rgba(255, 255, 255, 0.95)',
                pointerEvents: 'none',
                zIndex: 0
              }}
            />

            {/* Right Ambient Floating Neumorphic Sphere */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '180px',
                right: '-50px',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: 'linear-gradient(145deg, #ffffff, #dce8fc)',
                boxShadow: '14px 14px 32px rgba(166, 185, 214, 0.45), -10px -10px 24px #ffffff',
                pointerEvents: 'none',
                zIndex: 0
              }}
            />

            {/* Bottom-Left Layered Circular Disc */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: '-90px',
                left: '-60px',
                width: '260px',
                height: '260px',
                borderRadius: '50%',
                border: '20px solid rgba(255, 255, 255, 0.85)',
                boxShadow: '18px 18px 40px rgba(166, 185, 214, 0.38)',
                pointerEvents: 'none',
                zIndex: 0
              }}
            />

            {/* Bottom-Right Curved Frosted Neumorphic Panel */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '210px',
                height: '240px',
                borderRadius: '60px 0 0 0',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75), rgba(220, 232, 252, 0.65))',
                border: '1.5px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '-14px -14px 36px rgba(166, 185, 214, 0.35)',
                pointerEvents: 'none',
                zIndex: 0,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: '24px'
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', color: '#62748E', textTransform: 'uppercase' }}>
                MarsNova Studio
              </span>
            </div>
          </>
        )}

        {/* Top-Left Back to Website Navigation */}
        <Link
          to="/"
          style={{
            position: 'absolute',
            top: '32px',
            left: '32px',
            zIndex: 20,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '16px',
            background: isNeumorphic ? '#F1F5FA' : 'rgba(255, 255, 255, 0.06)',
            border: isNeumorphic ? '1px solid rgba(255, 255, 255, 0.95)' : '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: isNeumorphic
              ? '4px 4px 10px rgba(166, 185, 214, 0.35), -4px -4px 10px #ffffff'
              : 'none',
            color: isNeumorphic ? '#0F172A' : '#F5F7FF',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
            transition: 'all 0.2s ease'
          }}
          title="Return to public studio website"
        >
          <ArrowLeft size={16} />
          <span>Back to MarsNova</span>
        </Link>

        {/* Top-Right Theme Switcher Button (matches moon icon in user reference) */}
        <button
          type="button"
          aria-label={isNeumorphic ? 'Switch to Dark Mode' : 'Switch to Neumorphic Ice Mode'}
          onClick={() => setLoginThemeMode(isNeumorphic ? 'dark' : 'neumorphic')}
          style={{
            position: 'absolute',
            top: '32px',
            right: '32px',
            zIndex: 20,
            width: '46px',
            height: '46px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isNeumorphic ? '#F1F5FA' : 'rgba(255, 255, 255, 0.06)',
            border: isNeumorphic ? '1px solid rgba(255, 255, 255, 0.95)' : '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: isNeumorphic
              ? '6px 6px 14px rgba(166, 185, 214, 0.4), -6px -6px 14px #ffffff'
              : '0 4px 14px rgba(0, 0, 0, 0.3)',
            color: isNeumorphic ? '#0F172A' : '#F5F7FF',
            cursor: 'pointer',
            transition: 'all 0.25s ease'
          }}
          title={isNeumorphic ? 'Switch to Cosmic Dark' : 'Switch to Soft Porcelain Ice'}
        >
          {isNeumorphic ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <Container style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ maxWidth: '440px', margin: '0 auto', position: 'relative' }}>
            {/* The Main Neumorphic Login Card */}
            <div
              className={isNeumorphic ? 'neumorphic-card' : 'contact-card'}
              style={{
                padding: '40px 36px 36px',
                borderRadius: '32px',
                background: isNeumorphic
                  ? 'linear-gradient(160deg, #FFFFFF 0%, #F5F8FE 100%)'
                  : 'var(--bg-card)',
                border: isNeumorphic
                  ? '1.5px solid rgba(255, 255, 255, 0.95)'
                  : '1px solid var(--border-muted)',
                boxShadow: isNeumorphic
                  ? '22px 22px 64px rgba(166, 185, 214, 0.45), -22px -22px 64px #FFFFFF'
                  : '0 20px 50px rgba(0, 0, 0, 0.6)',
                transition: 'all 0.3s ease'
              }}
            >
              {/* 3D Wave Ribbon Emblem (Embossed Neumorphic Square Pill) */}
              <div
                style={{
                  width: '92px',
                  height: '92px',
                  margin: '0 auto 24px',
                  borderRadius: '26px',
                  background: isNeumorphic
                    ? 'linear-gradient(145deg, #FFFFFF, #EAF1FC)'
                    : 'rgba(56, 189, 248, 0.08)',
                  border: isNeumorphic ? '1px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(56, 189, 248, 0.25)',
                  boxShadow: isNeumorphic
                    ? '10px 10px 24px rgba(166, 185, 214, 0.45), -8px -8px 20px #FFFFFF'
                    : '0 10px 25px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                {/* 3D Layered Flame/Ribbon Icon matching user design */}
                <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M32 10C35 15 39 19 44 21C42 27 38 31 34 32C29 33 26 30 27 24C28 18 30 13 32 10Z"
                    fill="url(#ribbon-light)"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                  />
                  <path
                    d="M26 21C30 25 35 28 41 30C39 37 34 42 29 43C23 44 20 40 21 34C22 28 24 23 26 21Z"
                    fill="url(#ribbon-cyan)"
                    style={{ filter: 'drop-shadow(0 4px 8px rgba(37,99,235,0.25))' }}
                  />
                  <path
                    d="M20 32C25 36 31 40 37 42C35 50 29 54 24 54C17 54 14 49 15 43C16 38 18 34 20 32Z"
                    fill="url(#ribbon-blue)"
                    style={{ filter: 'drop-shadow(0 6px 12px rgba(16,82,232,0.35))' }}
                  />
                  <defs>
                    <linearGradient id="ribbon-light" x1="27" y1="10" x2="44" y2="32" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FFFFFF" />
                      <stop offset="1" stopColor="#93C5FD" />
                    </linearGradient>
                    <linearGradient id="ribbon-cyan" x1="21" y1="21" x2="41" y2="43" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#60A5FA" />
                      <stop offset="1" stopColor="#2563EB" />
                    </linearGradient>
                    <linearGradient id="ribbon-blue" x1="15" y1="32" x2="37" y2="54" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#2563EB" />
                      <stop offset="1" stopColor="#1E40AF" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Title & Subtitle */}
              <div style={{ textAlign: 'center', marginBottom: '26px' }}>
                <h1
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: isNeumorphic ? '#0F172A' : '#FFFFFF',
                    marginBottom: '6px',
                    letterSpacing: '-0.03em'
                  }}
                >
                  Welcome Back
                </h1>
                <p
                  style={{
                    color: isNeumorphic ? '#62748E' : 'var(--text-muted)',
                    fontSize: '14px',
                    fontWeight: 500,
                    letterSpacing: '0.01em'
                  }}
                >
                  Sign in to continue • MarsNova Staff Operations
                </p>
              </div>

              {/* Error Alert */}
              {loginError && (
                <div
                  style={{
                    background: isNeumorphic ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: isNeumorphic ? '#DC2626' : '#fca5a5',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    marginBottom: '20px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0, color: '#ef4444' }} />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Email / Username Input */}
                <div>
                  <div
                    className={isNeumorphic ? 'neumorphic-input-box' : ''}
                    style={{
                      height: '54px',
                      borderRadius: '18px',
                      padding: '0 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: isNeumorphic ? '#F1F5FA' : 'var(--bg-elevated)',
                      border: isNeumorphic ? '1px solid rgba(255, 255, 255, 0.9)' : '1px solid var(--border-muted)',
                      boxShadow: isNeumorphic
                        ? 'inset 3px 3px 6px rgba(166, 185, 214, 0.35), inset -3px -3px 6px #ffffff'
                        : 'none'
                    }}
                  >
                    <User size={18} style={{ color: isNeumorphic ? '#62748E' : '#38BDF8', flexShrink: 0 }} />
                    <input
                      id="staff-email"
                      type="email"
                      required
                      placeholder="Username or Email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      style={{
                        flex: 1,
                        height: '100%',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        color: isNeumorphic ? '#0F172A' : '#FFFFFF',
                        fontSize: '14.5px',
                        fontWeight: 500
                      }}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div
                    className={isNeumorphic ? 'neumorphic-input-box' : ''}
                    style={{
                      height: '54px',
                      borderRadius: '18px',
                      padding: '0 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: isNeumorphic ? '#F1F5FA' : 'var(--bg-elevated)',
                      border: isNeumorphic ? '1px solid rgba(255, 255, 255, 0.9)' : '1px solid var(--border-muted)',
                      boxShadow: isNeumorphic
                        ? 'inset 3px 3px 6px rgba(166, 185, 214, 0.35), inset -3px -3px 6px #ffffff'
                        : 'none'
                    }}
                  >
                    <Lock size={18} style={{ color: isNeumorphic ? '#62748E' : '#38BDF8', flexShrink: 0 }} />
                    <input
                      id="staff-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      style={{
                        flex: 1,
                        height: '100%',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        color: isNeumorphic ? '#0F172A' : '#FFFFFF',
                        fontSize: '14.5px',
                        fontWeight: 500
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: isNeumorphic ? '#62748E' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px'
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    margin: '2px 4px 6px'
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      color: isNeumorphic ? '#334155' : 'var(--text-white)',
                      fontWeight: 600,
                      userSelect: 'none'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        accentColor: '#1052E8',
                        cursor: 'pointer'
                      }}
                    />
                    <span>Remember Me</span>
                  </label>

                  <a
                    href="#forgot-password"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info('Default credentials: admin@marsnova.in / Admin@2026!');
                    }}
                    style={{
                      color: isNeumorphic ? '#1052E8' : 'var(--cyan-accent)',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    Forgot Password?
                  </a>
                </div>

                {/* Primary Royal Blue Pill Login Button */}
                <button
                  type="submit"
                  disabled={loginSubmitting}
                  className={isNeumorphic ? 'neumorphic-btn-blue' : ''}
                  style={{
                    width: '100%',
                    height: '52px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    background: isNeumorphic
                      ? 'linear-gradient(135deg, #2B70F7 0%, #1052E8 100%)'
                      : 'linear-gradient(135deg, #7919F5 0%, #A855F7 100%)',
                    boxShadow: isNeumorphic
                      ? '0 14px 28px -6px rgba(16, 82, 232, 0.48), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
                      : '0 8px 24px rgba(121, 25, 245, 0.4)',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: loginSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    position: 'relative',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <span>{loginSubmitting ? 'Authenticating...' : 'Login'}</span>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ArrowRight size={15} color="#FFFFFF" />
                  </div>
                </button>
              </form>

              {/* Divider: OR CONTINUE WITH */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  margin: '28px 0 20px'
                }}
              >
                <div style={{ flex: 1, height: '1px', background: isNeumorphic ? 'rgba(166, 185, 214, 0.35)' : 'rgba(255, 255, 255, 0.08)' }} />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: isNeumorphic ? '#62748E' : 'var(--text-dim)',
                    textTransform: 'uppercase'
                  }}
                >
                  Or Quick Login With
                </span>
                <div style={{ flex: 1, height: '1px', background: isNeumorphic ? 'rgba(166, 185, 214, 0.35)' : 'rgba(255, 255, 255, 0.08)' }} />
              </div>

              {/* Quick Role Fill Buttons (Neumorphic Square Tiles like social buttons in reference) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <button
                  type="button"
                  title="Super Admin (Aditya Verma)"
                  onClick={() => {
                    setLoginEmail('admin@marsnova.in');
                    setLoginPassword('Admin@2026!');
                    toast.success('Filled Super Admin credentials');
                  }}
                  className={isNeumorphic ? 'neumorphic-icon-btn' : ''}
                  style={{
                    height: '56px',
                    borderRadius: '16px',
                    background: isNeumorphic ? '#F4F8FE' : 'var(--bg-elevated)',
                    border: isNeumorphic ? '1px solid rgba(255, 255, 255, 0.95)' : '1px solid var(--border-muted)',
                    boxShadow: isNeumorphic
                      ? '6px 6px 14px rgba(166, 185, 214, 0.35), -6px -6px 14px #ffffff'
                      : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Crown size={18} style={{ color: '#1052E8' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: isNeumorphic ? '#0F172A' : '#F5F7FF' }}>Admin</span>
                </button>

                <button
                  type="button"
                  title="Agency Manager (Priya Sharma)"
                  onClick={() => {
                    setLoginEmail('manager@marsnova.in');
                    setLoginPassword('Manager@2026!');
                    toast.success('Filled Manager credentials');
                  }}
                  className={isNeumorphic ? 'neumorphic-icon-btn' : ''}
                  style={{
                    height: '56px',
                    borderRadius: '16px',
                    background: isNeumorphic ? '#F4F8FE' : 'var(--bg-elevated)',
                    border: isNeumorphic ? '1px solid rgba(255, 255, 255, 0.95)' : '1px solid var(--border-muted)',
                    boxShadow: isNeumorphic
                      ? '6px 6px 14px rgba(166, 185, 214, 0.35), -6px -6px 14px #ffffff'
                      : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Briefcase size={18} style={{ color: '#0EA5E9' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: isNeumorphic ? '#0F172A' : '#F5F7FF' }}>Manager</span>
                </button>

                <button
                  type="button"
                  title="Editor (Rohan Das)"
                  onClick={() => {
                    setLoginEmail('editor@marsnova.in');
                    setLoginPassword('Editor@2026!');
                    toast.success('Filled Editor credentials');
                  }}
                  className={isNeumorphic ? 'neumorphic-icon-btn' : ''}
                  style={{
                    height: '56px',
                    borderRadius: '16px',
                    background: isNeumorphic ? '#F4F8FE' : 'var(--bg-elevated)',
                    border: isNeumorphic ? '1px solid rgba(255, 255, 255, 0.95)' : '1px solid var(--border-muted)',
                    boxShadow: isNeumorphic
                      ? '6px 6px 14px rgba(166, 185, 214, 0.35), -6px -6px 14px #ffffff'
                      : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Edit3 size={18} style={{ color: '#8B5CF6' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: isNeumorphic ? '#0F172A' : '#F5F7FF' }}>Editor</span>
                </button>
              </div>

              {/* Tagline Footer (like "PLAY • COMPETE • GROW TOGETHER" in reference) */}
              <div
                style={{
                  marginTop: '28px',
                  textAlign: 'center',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  color: isNeumorphic ? '#94A3B8' : 'var(--text-dim)',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>CREATE</span>
                <span>•</span>
                <span>SCALE</span>
                <span>•</span>
                <span>DELIVER TOGETHER</span>
              </div>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // 3. Authenticated Workspace Shell
  const isEditor = currentUser.role === 'editor';

  return (
    <PageTransition>
      <SidebarProvider defaultOpen={true}>
      <div style={{ padding: '40px 0 80px' }}>
        {/* The signed-in console is a data-dense dashboard (sidebar + tables + forms), so it uses the wide
            container: at laptop widths the default 1200px one leaves the leads table too narrow to show every column */}
        <Container size="wide" className="admin-container admin-v2">
          {/* Header: title on the left, signed-in staff member and Sign Out on the right */}
          <div className="admin-header-shell admin-header-v2">
            <div>
              <h1 className="admin-title">Operations Center</h1>
              <p className="admin-subtitle">Client inquiries and their contact details.</p>
            </div>

            <div className="admin-header-actions">
              <div className="admin-user-chip">
                <div className="contact-avatar" style={{ width: '44px', height: '44px', fontSize: '14px' }}>
                  {getInitials(currentUser.full_name)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="admin-user-name">{currentUser.full_name}</span>
                    <Badge variant={getRoleBadgeVariant(currentUser.role)}>Admin</Badge>
                  </div>
                  <span className="admin-user-email">{currentUser.email}</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleVerifySession}
                disabled={sessionVerifying || leadsLoading}
                title="Inspect session & reload real-time data"
                className="admin-icon-btn"
              >
                <RefreshCw size={16} className={sessionVerifying || leadsLoading ? 'animate-spin' : ''} />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleAdminTheme}
                title={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
                aria-label={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
                className="admin-icon-btn"
              >
                {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
              </Button>

              <Button variant="outline" size="sm" onClick={handleLogout} leftIcon={<LogOut size={18} />} className="admin-signout-btn">
                Sign Out
              </Button>

              <SidebarTrigger className="md:hidden" />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="admin-layout-grid" style={{ display: 'grid', gap: '20px', alignItems: 'start' }}>
              {/* Navigation sidebar: brand, one entry per module */}
              <Sidebar className="admin-sidebar-v2" style={{ padding: 0 }}>
                <SidebarHeader>
                  <div className="admin-brand">
                    <span className="admin-brand-mark" aria-hidden="true">
                      <Sparkles size={22} />
                    </span>
                    <div>
                      <strong>MarsNova</strong>
                      <small>OPERATIONS</small>
                    </div>
                  </div>
                </SidebarHeader>
                <SidebarContent>
                  <SidebarMenu>
                    {[{ value: 'enquiries', label: 'Leads', Icon: Users }].map(({ value, label, Icon }) => (
                      <SidebarMenuItem key={value}>
                        <SidebarMenuButton
                          isActive={activeTab === value}
                          onClick={() => setActiveTab(value)}
                          className={`admin-nav-btn ${activeTab === value ? 'is-active' : ''}`}
                        >
                          <Icon size={22} aria-hidden="true" />
                          <span>{label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarContent>
                <div className="admin-nav-foot">
                  <span className="admin-brand-mark admin-brand-mark-sm" aria-hidden="true">
                    <Sparkles size={14} />
                  </span>
                  <div>
                    <strong>Operations Center</strong>
                    <small>MarsNova</small>
                  </div>
                </div>
              </Sidebar>

              {/* Main Workspace Pane */}
              <div style={{ minWidth: 0 }}>
                {/* Tab 2: Leads & Inquiries Management (Search, Filters, Pagination, Notes, Status Changes) */}
                <TabsContent value="enquiries">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Leads Metric Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
                      <div
                        className={`admin-kpi-card admin-kpi-card-total ${statusFilter === 'all' ? 'is-active' : ''}`}
                        onClick={() => applyDirectFilter('all')}
                        title="Click to view all inquiries"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', fontWeight: 700 }}>
                            Total Inquiries
                          </span>
                          <div className="admin-kpi-icon admin-kpi-icon-cyan">
                            <Users size={18} />
                          </div>
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                          {leadPagination.total}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <Activity size={12} style={{ color: 'var(--cyan-accent)' }} />
                          <span>All channel inquiries</span>
                        </div>
                      </div>

                      <div
                        className={`admin-kpi-card admin-kpi-card-new ${statusFilter === 'new' ? 'is-active' : ''}`}
                        onClick={() => applyDirectFilter('new')}
                        title="Click to filter new inquiries"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--cyan-accent)', fontWeight: 700 }}>
                            New (Uncontacted)
                          </span>
                          <div className="admin-kpi-icon admin-kpi-icon-cyan">
                            <Flame size={18} />
                          </div>
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--cyan-accent)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                          {leads.filter((l) => l.status === 'new').length}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--cyan-accent)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span className="status-dot-pulse" />
                          <span>Action required (within SLA)</span>
                        </div>
                      </div>

                      <div
                        className={`admin-kpi-card admin-kpi-card-followup ${statusFilter === 'contacted' ? 'is-active' : ''}`}
                        onClick={() => applyDirectFilter('contacted')}
                        title="Click to filter inquiries in follow-up"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--purple-glow)', fontWeight: 700 }}>
                            In Follow-Up
                          </span>
                          <div className="admin-kpi-icon admin-kpi-icon-purple">
                            <Clock size={18} />
                          </div>
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--purple-glow)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                          {leads.filter((l) => l.status === 'contacted' || l.status === 'qualified' || l.status === 'proposal_sent').length}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--purple-glow)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <MessageSquare size={12} />
                          <span>Contacted & proposals</span>
                        </div>
                      </div>

                      <div
                        className={`admin-kpi-card admin-kpi-card-converted ${statusFilter === 'converted' ? 'is-active' : ''}`}
                        onClick={() => applyDirectFilter('converted')}
                        title="Click to filter converted inquiries"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#22c55e', fontWeight: 700 }}>
                            Converted
                          </span>
                          <div className="admin-kpi-icon admin-kpi-icon-green">
                            <CheckCircle2 size={18} />
                          </div>
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 800, color: '#22c55e', letterSpacing: '-0.02em', lineHeight: 1 }}>
                          {leads.filter((l) => l.status === 'converted').length}
                        </div>
                        <div style={{ fontSize: '11px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <TrendingUp size={12} />
                          <span>Studio deals closed</span>
                        </div>
                      </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="admin-glass-panel" style={{ padding: '16px 20px' }}>
                      {/* Quick Filter Presets */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginRight: '4px' }}>
                          Filter Presets:
                        </span>
                        <button
                          type="button"
                          className={`filter-preset-chip ${statusFilter === 'all' ? 'active' : ''}`}
                          onClick={() => applyDirectFilter('all')}
                        >
                          All Leads ({leadPagination.total})
                        </button>
                        <button
                          type="button"
                          className={`filter-preset-chip ${statusFilter === 'new' ? 'active' : ''}`}
                          onClick={() => applyDirectFilter('new')}
                        >
                          <span className="status-dot-pulse" style={{ width: '5px', height: '5px' }} />
                          New ({leads.filter((l) => l.status === 'new').length})
                        </button>
                        <button
                          type="button"
                          className={`filter-preset-chip ${statusFilter === 'contacted' ? 'active' : ''}`}
                          onClick={() => applyDirectFilter('contacted')}
                        >
                          <Clock size={12} style={{ color: 'var(--purple-glow)' }} />
                          Contacted ({leads.filter((l) => l.status === 'contacted').length})
                        </button>
                        <button
                          type="button"
                          className={`filter-preset-chip ${statusFilter === 'proposal_sent' ? 'active' : ''}`}
                          onClick={() => applyDirectFilter('proposal_sent')}
                        >
                          Proposal Sent ({leads.filter((l) => l.status === 'proposal_sent').length})
                        </button>
                        <button
                          type="button"
                          className={`filter-preset-chip ${statusFilter === 'converted' ? 'active' : ''}`}
                          onClick={() => applyDirectFilter('converted')}
                        >
                          <CheckCircle2 size={12} style={{ color: '#22c55e' }} />
                          Converted ({leads.filter((l) => l.status === 'converted').length})
                        </button>
                      </div>

                      <form onSubmit={handleSearchSubmit}>
                        <div className="admin-filter-bar-grid">
                          {/* Search Input */}
                          <div>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: '#fff' }}>
                              <Search size={13} style={{ color: 'var(--cyan-accent)' }} /> Search
                            </label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <Input
                                placeholder="Search by name, email, phone or service..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                  background: 'rgba(8, 15, 29, 0.8)',
                                  borderColor: 'rgba(56, 189, 248, 0.2)',
                                  color: '#fff',
                                  height: '40px',
                                  paddingRight: searchQuery ? '32px' : '12px'
                                }}
                              />
                              {searchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setSearchQuery('')}
                                  style={{
                                    position: 'absolute',
                                    right: '8px',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-dim)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                  }}
                                  title="Clear search"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Status Filter */}
                          <div>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: '#fff' }}>
                              Status
                            </label>
                            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                              <SelectTrigger style={{ height: '40px', background: 'rgba(8, 15, 29, 0.8)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>
                                <SelectValue placeholder="All Statuses" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="new">New (Uncontacted)</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="qualified">Qualified</SelectItem>
                                <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                                <SelectItem value="converted">Converted</SelectItem>
                                <SelectItem value="lost">Lost</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Service Filter */}
                          <div>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: '#fff' }}>
                              Service
                            </label>
                            <Select value={serviceFilter} onValueChange={(val) => setServiceFilter(val)}>
                              <SelectTrigger style={{ height: '40px', background: 'rgba(8, 15, 29, 0.8)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>
                                <SelectValue placeholder="All Services" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Services</SelectItem>
                                <SelectItem value="topic to video">Topic to Video</SelectItem>
                                <SelectItem value="video creation">Video Creation & Editing</SelectItem>
                                <SelectItem value="pen drive">Pen Drive Data Recovery</SelectItem>
                                <SelectItem value="ai tools">AI Tools & Automation</SelectItem>
                                <SelectItem value="brand promotion">Brand Promotion</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Button type="submit" variant="primary" leftIcon={<Filter size={14} />} style={{ height: '40px', whiteSpace: 'nowrap' }}>
                              Apply Filters
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleClearFilters}
                              title="Reset filters"
                              style={{
                                height: '40px',
                                borderColor: 'rgba(255, 255, 255, 0.15)',
                                color: 'var(--text-muted)',
                                background: 'rgba(255, 255, 255, 0.03)',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Reset
                            </Button>
                          </div>
                        </div>
                      </form>
                    </div>

                    {/* Leads Results Table */}
                    <div className="admin-glass-panel" style={{ padding: '24px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '16px',
                          marginBottom: '22px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                              Client Inquiries
                            </h3>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                background: 'rgba(56, 189, 248, 0.12)',
                                color: 'var(--cyan-accent)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                border: '1px solid rgba(56, 189, 248, 0.25)'
                              }}
                            >
                              {leadPagination.total} Leads
                            </span>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '3px' }}>
                            Showing page {leadPagination.page} of {leadPagination.total_pages} ({leadPagination.total} total matching leads)
                          </span>
                        </div>

                        {/* Controls (Export, Per Page, Refresh) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={exportLeadsToCsv}
                            leftIcon={<Download size={13} />}
                            title="Download leads as CSV"
                            style={{
                              borderColor: 'rgba(56, 189, 248, 0.25)',
                              background: 'rgba(56, 189, 248, 0.06)',
                              color: 'var(--cyan-accent)',
                              fontSize: '12px'
                            }}
                          >
                            Export CSV
                          </Button>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>Per page:</span>
                            <Select
                              value={String(leadPagination.limit)}
                              onValueChange={(val) => {
                                setLeadPagination({ ...leadPagination, limit: Number(val) });
                                loadLeads(1);
                              }}
                            >
                              <SelectTrigger style={{ width: '80px', height: '34px', background: 'rgba(8, 15, 29, 0.8)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>
                                <SelectValue placeholder="10" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                              </SelectContent>
                            </Select>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadLeads()}
                              disabled={leadsLoading}
                              style={{
                                height: '34px',
                                width: '34px',
                                padding: 0,
                                borderColor: 'rgba(56, 189, 248, 0.25)',
                                background: 'rgba(56, 189, 248, 0.06)'
                              }}
                              title="Refresh leads list"
                            >
                              <RefreshCw size={13} className={leadsLoading ? 'animate-spin' : ''} />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {leadsLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-14 w-full" style={{ borderRadius: '10px' }} />
                          ))}
                        </div>
                      ) : leadsError ? (
                        <ErrorState title="Failed to Load Leads" message={leadsError} onRetry={() => loadLeads()} />
                      ) : leads.length === 0 ? (
                        <EmptyState
                          title="No Leads Found"
                          description="No inquiries match your current search and filter parameters. Try clearing your filters."
                          action={{
                            label: 'Clear Filters',
                            onClick: handleClearFilters
                          }}
                        />
                      ) : (
                        <div className="leads-table-container">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead style={{ width: '1%' }}>#</TableHead>
                                <TableHead style={{ minWidth: '200px' }}>Client</TableHead>
                                <TableHead style={{ width: '1%' }}>Phone</TableHead>
                                <TableHead style={{ minWidth: '150px' }}>Service</TableHead>
                                <TableHead style={{ width: '1%' }}>Status</TableHead>
                                <TableHead style={{ width: '1%' }}>Date</TableHead>
                                <TableHead style={{ width: '1%', textAlign: 'right' }}>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {leads.map((l, idx) => (
                                <TableRow key={l.id} className="leads-table-row">
                                  <TableCell style={{ whiteSpace: 'nowrap' }} title={l.id}>
                                    {(leadPagination.page - 1) * leadPagination.limit + idx + 1}
                                  </TableCell>

                                  <TableCell>
                                    <div className="lead-client">
                                      <div className="contact-avatar">{getInitials(l.full_name)}</div>
                                      <div className="lead-contact">
                                        <div className="lead-name">{l.full_name}</div>
                                        <a href={`mailto:${l.email}`} className="lead-email" title="Send Email">
                                          <span>{l.email}</span>
                                        </a>
                                      </div>
                                    </div>
                                  </TableCell>

                                  <TableCell>
                                    {l.phone ? (
                                      <div className="lead-phone">
                                        <a href={`tel:${l.phone}`} title="Call">{l.phone}</a>
                                        <a
                                          href={`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${l.full_name}, this is MarsNova regarding your inquiry for ${l.service_requested}.`)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="lead-whatsapp"
                                          title={`Chat on WhatsApp (${l.phone})`}
                                          aria-label={`Chat with ${l.full_name} on WhatsApp`}
                                        >
                                          <MessageSquare size={16} />
                                        </a>
                                      </div>
                                    ) : (
                                      <span style={{ color: 'var(--text-dim)' }}>—</span>
                                    )}
                                  </TableCell>

                                  <TableCell>
                                    <div className="lead-service">
                                      <span className="lead-service-icon">{getServiceIcon(l.service_requested)}</span>
                                      <span>{l.service_requested}</span>
                                    </div>
                                  </TableCell>

                                  <TableCell>
                                    <Badge variant={getLeadStatusBadgeVariant(l.status)} className="lead-status" data-status={l.status}>
                                      <span className={l.status === 'new' ? 'status-dot-pulse' : ''} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor', flexShrink: 0 }} />
                                      <span>{l.status.replace('_', ' ')}</span>
                                    </Badge>
                                  </TableCell>

                                  <TableCell style={{ whiteSpace: 'nowrap' }}>{formatDisplayDate(l.created_at)}</TableCell>

                                  <TableCell style={{ textAlign: 'right' }}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenLead(l.id)}
                                      rightIcon={<ChevronRight size={16} />}
                                      className="lead-view-btn"
                                      title="Open lead details, notes and WhatsApp follow-up"
                                    >
                                      View
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Server-Side Pagination Bar */}
                      {leadPagination.total_pages > 1 && (
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '22px',
                            paddingTop: '18px',
                            borderTop: '1px solid rgba(56, 189, 248, 0.12)',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                              Page {leadPagination.page} of {leadPagination.total_pages}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                              {leadPagination.total} total leads
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(leadPagination.page - 1)}
                              disabled={!leadPagination.has_prev || leadsLoading}
                              leftIcon={<ChevronLeft size={14} />}
                              style={{ borderColor: 'rgba(255, 255, 255, 0.12)', background: 'rgba(255, 255, 255, 0.03)', color: '#fff' }}
                            >
                              Previous
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(leadPagination.page + 1)}
                              disabled={!leadPagination.has_next || leadsLoading}
                              rightIcon={<ChevronRight size={14} />}
                              style={{ borderColor: 'rgba(255, 255, 255, 0.12)', background: 'rgba(255, 255, 255, 0.03)', color: '#fff' }}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>


              </div>
            </div>
          </Tabs>

          {/* Lead Details & Audit History Dialog */}
          <Dialog open={!!selectedLeadId} onOpenChange={(open) => !open && setSelectedLeadId(null)}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <DialogTitle style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>
                    {selectedLead ? selectedLead.full_name : 'Lead Details'}
                  </DialogTitle>
                  {selectedLead && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge variant={getLeadStatusBadgeVariant(selectedLead.status)}>
                        {selectedLead.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">v{selectedLead.version}</Badge>
                    </div>
                  )}
                </div>
                <DialogDescription style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Reference: <span style={{ color: 'var(--cyan-accent)', fontWeight: 600 }}>{selectedLead?.id}</span> • Audited client communication and status workflow
                </DialogDescription>
              </DialogHeader>

              {detailsLoading ? (
                <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : detailsError ? (
                <ErrorState title="Error Loading Lead" message={detailsError} />
              ) : selectedLead ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '12px' }}>
                  {/* Lead Metadata Grid */}
                  <div
                    style={{
                      background: 'var(--bg-deep)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '16px'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                        Email Address
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '14px', marginTop: '4px' }}>
                        <Mail size={14} style={{ color: 'var(--cyan-accent)' }} />
                        <span>{selectedLead.email}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                        Phone Number
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '14px', marginTop: '4px' }}>
                        <Phone size={14} style={{ color: 'var(--purple-glow)' }} />
                        <span>{selectedLead.phone || 'Not provided'}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                        Service Requested
                      </span>
                      <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                        {selectedLead.service_requested}
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                        Acquisition Source
                      </span>
                      <span style={{ color: 'var(--cyan-accent)', fontSize: '13px', display: 'block', marginTop: '4px' }}>
                        {selectedLead.source}
                      </span>
                    </div>
                  </div>

                  {/* Client Note / Inquiry Description */}
                  {selectedLead.notes && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-muted)', borderRadius: '10px', padding: '14px 18px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                        Initial Client Inquiry Message
                      </span>
                      <p style={{ color: '#fff', fontSize: '13px', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                        "{selectedLead.notes}"
                      </p>
                    </div>
                  )}

                  {/* WhatsApp Notification & Delivery Status */}
                  {(() => {
                    const notifs = selectedLead.notifications || [];
                    const latestNotif = notifs.length > 0 ? notifs[0] : null;
                    const statusInfo = getNotificationStatusBadge(latestNotif?.status);
                    const waUrl =
                      latestNotif?.click_to_chat_url ||
                      latestNotif?.whatsapp_url ||
                      buildWhatsAppUrl({
                        name: selectedLead.full_name,
                        email: selectedLead.email,
                        phone: selectedLead.phone,
                        service: selectedLead.service_requested,
                        message: selectedLead.notes || 'MarsNova lead follow-up'
                      });

                    return (
                      <div
                        style={{
                          background: 'var(--bg-deep)',
                          border: '1px solid var(--border-muted)',
                          borderRadius: '12px',
                          padding: '18px 20px'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px',
                            marginBottom: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MessageSquare size={16} style={{ color: '#25D366' }} />
                            <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: 0 }}>
                              WhatsApp Notification & Delivery Status
                            </h4>
                          </div>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </div>

                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '14px', lineHeight: 1.5 }}>
                          Automated WhatsApp business dispatch with duplicate deduplication and safe failure containment.
                          {latestNotif?.status === 'fallback_click_to_chat' && (
                            <span style={{ color: 'var(--cyan-accent)', display: 'block', marginTop: '2px' }}>
                              Provider automation inactive — preserved direct click-to-chat fallback to MarsNova verified business line (+91 72085 91595).
                            </span>
                          )}
                        </p>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                            gap: '12px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-muted)',
                            marginBottom: '14px'
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                              Delivery Attempts
                            </span>
                            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600, marginTop: '2px', display: 'block' }}>
                              {latestNotif ? `${latestNotif.attempts} / ${latestNotif.max_attempts}` : '0 / 3'}
                            </span>
                          </div>

                          <div>
                            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                              Channel / Provider
                            </span>
                            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600, marginTop: '2px', display: 'block' }}>
                              {latestNotif?.provider_message_id ? 'WhatsApp Cloud API' : 'Direct Click-to-Chat'}
                            </span>
                          </div>

                          <div>
                            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                              Provider Message ID
                            </span>
                            <span
                              style={{
                                color: latestNotif?.provider_message_id ? 'var(--cyan-accent)' : 'var(--text-dim)',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                marginTop: '2px',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              title={latestNotif?.provider_message_id || 'Not assigned'}
                            >
                              {latestNotif?.provider_message_id || 'None (Fallback mode)'}
                            </span>
                          </div>

                          <div>
                            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                              Recipient Phone
                            </span>
                            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600, marginTop: '2px', display: 'block' }}>
                              {selectedLead.phone || 'No phone provided'}
                            </span>
                          </div>
                        </div>

                        {latestNotif?.safe_error_details && latestNotif.status === 'failed' && (
                          <div
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '8px',
                              padding: '10px 14px',
                              marginBottom: '14px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px'
                            }}
                          >
                            <AlertTriangle size={15} style={{ color: '#ef4444', marginTop: '2px', flexShrink: 0 }} />
                            <div>
                              <strong style={{ color: '#ef4444', fontSize: '12px', display: 'block' }}>
                                Provider Dispatch Error (Sanitized)
                              </strong>
                              <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '2px 0 0', lineHeight: 1.4 }}>
                                {latestNotif.safe_error_details}
                              </p>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              leftIcon={<ExternalLink size={13} style={{ color: '#25D366' }} />}
                            >
                              Open MarsNova WhatsApp Chat
                            </Button>
                          </a>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Status Transition Manager (State Machine & RBAC) */}
                  <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-muted)', borderRadius: '12px', padding: '18px 20px' }}>
                    <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
                      Status Workflow Transition
                    </h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '14px' }}>
                      Current status: <strong style={{ color: 'var(--cyan-accent)' }}>{selectedLead.status}</strong>. Valid transitions enforced by Drogon state machine.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr auto', gap: '12px', alignItems: 'end' }}>
                      <div>
                        <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                          Next Target Status
                        </label>
                        <Select value={targetStatus} onValueChange={(val) => setTargetStatus(val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={selectedLead.status}>No Change ({selectedLead.status})</SelectItem>
                            {getAllowedTransitions(selectedLead.status).map((nxt) => (
                              <SelectItem
                                key={nxt}
                                value={nxt}
                                disabled={isEditor && (nxt === 'converted' || nxt === 'archived')}
                              >
                                {nxt.replace('_', ' ')} {isEditor && (nxt === 'converted' || nxt === 'archived') ? '(Restricted: Manager Only)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                          Transition Audit Note (Optional)
                        </label>
                        <Input
                          placeholder="Reason or outcome for status transition..."
                          value={statusChangeNote}
                          onChange={(e) => setStatusChangeNote(e.target.value)}
                        />
                      </div>

                      <Button
                        variant="primary"
                        onClick={handleUpdateStatus}
                        disabled={statusSubmitting || targetStatus === selectedLead.status}
                      >
                        {statusSubmitting ? 'Updating...' : 'Update Status'}
                      </Button>
                    </div>

                    {isEditor && (
                      <p style={{ color: 'var(--text-dim)', fontSize: '11px', marginTop: '10px' }}>
                        * Notice: Role <strong>Editor</strong> can qualify leads and record follow-ups. Marking as <strong>converted</strong> or <strong>archived</strong> requires <strong>Agency Manager</strong> or <strong>Super Admin</strong>.
                      </p>
                    )}
                  </div>

                  {/* Add Follow-Up Note */}
                  <form onSubmit={handleAddNote} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-muted)', borderRadius: '12px', padding: '18px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>
                        Record Staff Follow-Up Note
                      </h4>
                      <MessageSquare size={16} style={{ color: 'var(--purple-glow)' }} />
                    </div>

                    <Textarea
                      placeholder="Enter follow-up call details, client feedback, or proposal requirements..."
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      rows={3}
                      required
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        leftIcon={<Send size={13} />}
                        disabled={noteSubmitting || !noteContent.trim()}
                      >
                        {noteSubmitting ? 'Saving Note...' : 'Append Follow-Up Note'}
                      </Button>
                    </div>
                  </form>

                  {/* Audited Activity History Timeline */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <History size={16} style={{ color: '#10b981' }} />
                      <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>
                        Audited Activity & Transition History
                      </h4>
                    </div>

                    {selectedLead.activities && selectedLead.activities.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {selectedLead.activities.map((act) => (
                          <div
                            key={act.id}
                            style={{
                              background: 'var(--bg-deep)',
                              border: '1px solid var(--border-muted)',
                              borderRadius: '10px',
                              padding: '12px 16px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '8px'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ color: '#fff', fontSize: '13px' }}>{act.summary}</strong>
                                <Badge variant={act.type === 'status_change' ? 'cyan' : act.type === 'follow_up_note' ? 'purple' : 'secondary'}>
                                  {act.type.replace('_', ' ')}
                                </Badge>
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                                By: {act.created_by}
                              </span>
                            </div>

                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {new Date(act.created_at).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>No recorded activities.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>

        </Container>
      </div>
    </SidebarProvider>
  </PageTransition>
);
};
