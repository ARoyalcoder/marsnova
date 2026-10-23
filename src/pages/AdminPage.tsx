import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  FileText,
  Briefcase,
  HardDrive,
  Users,
  Plus,
  LogOut,
  Lock,
  UserCheck,
  AlertCircle,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  Activity,
  Layers,
  Clock,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  History,
  Send,
  Calendar,
  Phone,
  Mail,
  AlertTriangle,
  ExternalLink,
  UserPlus,
  UserMinus,
  CheckSquare,
  FolderPlus,
  UploadCloud,
  Video,
  BookOpen,
  FileCode
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  ProgressBar,
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
  TabsList,
  TabsTrigger,
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
import { PageTransition } from '../components/animations/PageTransition';
import {
  loginStaff,
  logoutStaff,
  inspectSession,
  getAdminOverview,
  fetchLeadsPaged,
  getLeadDetails,
  addLeadNote,
  updateLeadStatus,
  buildWhatsAppUrl,
  fetchQuotationsPaged,
  getQuotationDetails,
  createQuotation,
  updateQuotationStatus,
  createQuotationRevision,
  fetchProjectsPaged,
  getProjectDetails,
  createProject,
  updateProjectStatus,
  assignProjectStaff,
  removeProjectStaff,
  updateProjectDeliverables,
  fetchAdminServices,
  createAdminService,
  publishAdminService,
  archiveAdminService,
  deleteAdminService,
  fetchAdminPortfolio,
  createAdminPortfolio,
  publishAdminPortfolio,
  archiveAdminPortfolio,
  deleteAdminPortfolio,
  fetchAdminCourses,
  createAdminCourse,
  publishAdminCourse,
  archiveAdminCourse,
  deleteAdminCourse,
  fetchAdminLessons,
  createAdminLesson,
  publishAdminLesson,
  archiveAdminLesson,
  deleteAdminLesson,
  uploadMedia,
  fetchAdminMedia,
  fetchAdminRecoveryCases,
  getAdminRecoveryCase,
  confirmPhysicalReceipt,
  recordCaseDiagnosis,
  issueCaseQuotation,
  decideCaseQuotation,
  transitionCaseStatus,
  transferCaseCustody,
  returnCaseDevice
} from '../api';
import {
  StaffUser,
  AdminOverviewStats,
  LeadRecord,
  LeadStatus,
  LeadPagination,
  LeadQueryParams,
  QuotationRecord,
  QuotationStatus,
  QuotationRevision,
  ProjectRecord,
  ProjectStatus,
  ProjectPriority,
  ProjectDeliverable,
  ProjectAssignment,
  ProjectActivity,
  CreateProjectPayload,
  ProjectQueryParams,
  ProjectPagination,
  AdminServiceRecord,
  AdminPortfolioRecord,
  AdminCourseRecord,
  AdminLessonRecord,
  MediaUploadRecord,
  ContentStatus,
  CreateServicePayload,
  CreatePortfolioPayload,
  CreateCoursePayload,
  CreateLessonPayload,
  MediaUploadPayload,
  RecoveryCaseRecord,
  RecoveryCaseStatus,
  PhysicalReceiptPayload,
  CaseDiagnosisPayload,
  CaseQuotationPayload,
  CaseQuotationDecisionPayload,
  CaseStatusTransitionPayload,
  CaseCustodyTransferPayload,
  CaseReturnPayload
} from '../types';
import { usePageSEO } from '../utils/seo';

export const AdminPage: React.FC = () => {
  usePageSEO({
    title: 'Operations Admin Portal | MarsNova',
    description: 'Internal operations administration console for MarsNova Studio.',
    canonicalPath: '/admin'
  });

  const [activeTab, setActiveTab] = useState<string>('overview');

  // Staff Authentication State
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginSubmitting, setLoginSubmitting] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [sessionVerifying, setSessionVerifying] = useState<boolean>(false);

  // Overview Telemetry & Statistics State
  const [overviewStats, setOverviewStats] = useState<AdminOverviewStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<string | null>(null);

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

  // Real Quotations & Revisions State
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [quotationsLoading, setQuotationsLoading] = useState<boolean>(false);
  const [quotationsError, setQuotationsError] = useState<string | null>(null);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationRecord | null>(null);
  const [quoteDetailsLoading, setQuoteDetailsLoading] = useState<boolean>(false);
  const [quoteSubmitting, setQuoteSubmitting] = useState<boolean>(false);
  const [quoteStatusUpdating, setQuoteStatusUpdating] = useState<boolean>(false);
  const [targetQuoteStatus, setTargetQuoteStatus] = useState<string>('');
  const [quoteStatusNote, setQuoteStatusNote] = useState<string>('');

  // Revisions Modal State
  const [newRevisionScope, setNewRevisionScope] = useState<string>('');
  const [newRevisionAmount, setNewRevisionAmount] = useState<string>('');
  const [newRevisionSummary, setNewRevisionSummary] = useState<string>('');
  const [revisionSubmitting, setRevisionSubmitting] = useState<boolean>(false);
  const [showRevisionForm, setShowRevisionForm] = useState<boolean>(false);

  // Real Projects State
  const [projectsList, setProjectsList] = useState<ProjectRecord[]>([]);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null);
  const [projectDetailsLoading, setProjectDetailsLoading] = useState<boolean>(false);
  const [projectSubmitting, setProjectSubmitting] = useState<boolean>(false);
  const [projectStatusUpdating, setProjectStatusUpdating] = useState<boolean>(false);
  const [targetProjStatus, setTargetProjStatus] = useState<string>('');
  const [projStatusNote, setProjStatusNote] = useState<string>('');

  // Project Creation Form State
  const [newProject, setNewProject] = useState({
    title: '',
    client_name: '',
    client_email: '',
    vertical: 'video_production',
    scope: '',
    priority: 'medium' as ProjectPriority,
    start_date: new Date().toISOString().slice(0, 10),
    target_delivery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    quotation_id: '',
    lead_id: '',
    drive_assets_url: '',
    notes: '',
    initial_deliverable: ''
  });

  // Project Filtering
  const [projectSearch, setProjectSearch] = useState<string>('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all');
  const [projectPriorityFilter, setProjectPriorityFilter] = useState<string>('all');

  // Staff Assignment State
  const [assignUserId, setAssignUserId] = useState<string>('');
  const [assignRole, setAssignRole] = useState<string>('video_editor');
  const [assigningStaff, setAssigningStaff] = useState<boolean>(false);

  // Deliverables State
  const [newDeliverableTitle, setNewDeliverableTitle] = useState<string>('');
  const [newDeliverableDueDate, setNewDeliverableDueDate] = useState<string>('');
  const [addingDeliverable, setAddingDeliverable] = useState<boolean>(false);

  // Content Management System (CMS) State
  const [cmsSubTab, setCmsSubTab] = useState<'services' | 'portfolio' | 'courses' | 'media'>('services');
  const [cmsServices, setCmsServices] = useState<AdminServiceRecord[]>([]);
  const [cmsPortfolio, setCmsPortfolio] = useState<AdminPortfolioRecord[]>([]);
  const [cmsCourses, setCmsCourses] = useState<AdminCourseRecord[]>([]);
  const [cmsLessons, setCmsLessons] = useState<AdminLessonRecord[]>([]);
  const [cmsMedia, setCmsMedia] = useState<MediaUploadRecord[]>([]);
  const [cmsLoading, setCmsLoading] = useState<boolean>(false);
  const [selectedCourseForLessons, setSelectedCourseForLessons] = useState<string>('crs-1');

  // New Content Creation Form States
  const [newServiceForm, setNewServiceForm] = useState<CreateServicePayload>({
    title: '',
    slug: '',
    category: 'Video',
    description: '',
    status: 'draft'
  });
  const [newPortfolioForm, setNewPortfolioForm] = useState<CreatePortfolioPayload>({
    title: '',
    slug: '',
    category: 'YouTube Videos',
    client_name: '',
    status: 'draft'
  });
  const [newCourseForm, setNewCourseForm] = useState<CreateCoursePayload>({
    title: '',
    slug: '',
    category: 'Creative Production',
    description: '',
    status: 'draft'
  });
  const [newLessonForm, setNewLessonForm] = useState<CreateLessonPayload>({
    title: '',
    slug: '',
    module_title: 'Module 1',
    lesson_order: 1,
    content_markdown: '',
    video_url: '',
    is_free_preview: false,
    is_private: true,
    status: 'draft'
  });
  const [newMediaForm, setNewMediaForm] = useState<MediaUploadPayload>({
    file_name: '',
    mime_type: 'image/webp',
    file_size_bytes: 102400,
    is_private: false
  });
  const [contentSubmitting, setContentSubmitting] = useState<boolean>(false);

  // Recovery Lab Cases State
  const [recoveryCases, setRecoveryCases] = useState<RecoveryCaseRecord[]>([]);
  const [recoveryLoading, setRecoveryLoading] = useState<boolean>(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryFilterStatus, setRecoveryFilterStatus] = useState<string>('all');
  const [recoverySearch, setRecoverySearch] = useState<string>('');
  const [selectedRecoveryCase, setSelectedRecoveryCase] = useState<RecoveryCaseRecord | null>(null);
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState<boolean>(false);
  const [recoveryActionSubmitting, setRecoveryActionSubmitting] = useState<boolean>(false);

  // Recovery Action Form Inputs
  const [receiptNotes, setReceiptNotes] = useState<string>('Anti-static inspection completed. Housing intact.');
  const [receiptCustody, setReceiptCustody] = useState<string>('Lab Intake Bay - Anti-Static Bin');
  const [diagComplexity, setDiagComplexity] = useState<'standard' | 'level2_chip_off' | 'level3_monolithic'>('standard');
  const [diagInternalNotes, setDiagInternalNotes] = useState<string>('');
  const [diagPublicSummary, setDiagPublicSummary] = useState<string>('');
  const [quoteAmount, setQuoteAmount] = useState<number>(4500);
  const [custodyTransferLocation, setCustodyTransferLocation] = useState<string>('Cleanroom Bench 4 - TSOP Rig');
  const [custodyTransferNotes, setCustodyTransferNotes] = useState<string>('');
  const [returnCarrier, setReturnCarrier] = useState<string>('BlueDart Express Courier');
  const [returnTracking, setReturnTracking] = useState<string>('');
  const [returnRecipient, setReturnRecipient] = useState<string>('');

  const loadRecoveryCases = useCallback(async (statusOverride?: string, searchOverride?: string) => {
    setRecoveryLoading(true);
    setRecoveryError(null);
    try {
      const res = await fetchAdminRecoveryCases({
        status: statusOverride !== undefined ? statusOverride : recoveryFilterStatus,
        search: searchOverride !== undefined ? searchOverride : recoverySearch
      });
      setRecoveryCases(res.cases || []);
    } catch (err: any) {
      setRecoveryError(err.message || 'Failed to load recovery cases');
    } finally {
      setRecoveryLoading(false);
    }
  }, [recoveryFilterStatus, recoverySearch]);

  const handleOpenCaseInspector = async (c: RecoveryCaseRecord) => {
    try {
      const fullCase = await getAdminRecoveryCase(c.case_reference || c.id);
      setSelectedRecoveryCase(fullCase);
      setDiagComplexity(fullCase.diagnostic_complexity || 'standard');
      setDiagInternalNotes(fullCase.internal_diagnostic_notes || '');
      setDiagPublicSummary(fullCase.public_diagnostic_summary || '');
      setQuoteAmount(fullCase.quotation_amount || 4500);
      setReturnRecipient(fullCase.customer_name || '');
      setRecoveryDialogOpen(true);
    } catch {
      setSelectedRecoveryCase(c);
      setRecoveryDialogOpen(true);
    }
  };

  const handleConfirmPhysicalReceiptAction = async () => {
    if (!selectedRecoveryCase) return;
    setRecoveryActionSubmitting(true);
    try {
      const updated = await confirmPhysicalReceipt(selectedRecoveryCase.case_reference || selectedRecoveryCase.id, {
        notes: receiptNotes,
        custody_location: receiptCustody
      });
      setSelectedRecoveryCase(updated);
      toast.success('Physical device receipt confirmed.');
      loadRecoveryCases();
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm receipt');
    } finally {
      setRecoveryActionSubmitting(false);
    }
  };

  const handleRecordDiagnosisAction = async () => {
    if (!selectedRecoveryCase) return;
    setRecoveryActionSubmitting(true);
    try {
      const updated = await recordCaseDiagnosis(selectedRecoveryCase.case_reference || selectedRecoveryCase.id, {
        complexity: diagComplexity,
        internal_notes: diagInternalNotes,
        public_summary: diagPublicSummary
      });
      setSelectedRecoveryCase(updated);
      toast.success('Diagnostic findings updated.');
      loadRecoveryCases();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record diagnosis');
    } finally {
      setRecoveryActionSubmitting(false);
    }
  };

  const handleIssueQuotationAction = async () => {
    if (!selectedRecoveryCase) return;
    setRecoveryActionSubmitting(true);
    try {
      const updated = await issueCaseQuotation(selectedRecoveryCase.case_reference || selectedRecoveryCase.id, {
        amount: quoteAmount
      });
      setSelectedRecoveryCase(updated);
      toast.success(`Quotation issued for ₹${quoteAmount.toLocaleString()}`);
      loadRecoveryCases();
    } catch (err: any) {
      toast.error(err.message || 'Failed to issue quotation');
    } finally {
      setRecoveryActionSubmitting(false);
    }
  };

  const handleDecideQuotationAction = async (decision: 'approved' | 'rejected') => {
    if (!selectedRecoveryCase) return;
    setRecoveryActionSubmitting(true);
    try {
      const updated = await decideCaseQuotation(selectedRecoveryCase.case_reference || selectedRecoveryCase.id, {
        decision,
        approved_by: `${currentUser?.full_name || 'Staff'} (Authorization Logged)`
      });
      setSelectedRecoveryCase(updated);
      toast.success(`Quotation decision recorded: ${decision}`);
      loadRecoveryCases();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record quotation decision');
    } finally {
      setRecoveryActionSubmitting(false);
    }
  };

  const handleTransitionStatusAction = async (targetStatus: RecoveryCaseStatus) => {
    if (!selectedRecoveryCase) return;
    setRecoveryActionSubmitting(true);
    try {
      const updated = await transitionCaseStatus(selectedRecoveryCase.case_reference || selectedRecoveryCase.id, {
        status: targetStatus,
        notes: `Advanced to ${targetStatus}`
      });
      setSelectedRecoveryCase(updated);
      toast.success(`Case transitioned to ${targetStatus}`);
      loadRecoveryCases();
    } catch (err: any) {
      toast.error(err.message || 'Invalid transition');
    } finally {
      setRecoveryActionSubmitting(false);
    }
  };

  const handleTransferCustodyAction = async () => {
    if (!selectedRecoveryCase) return;
    setRecoveryActionSubmitting(true);
    try {
      const updated = await transferCaseCustody(selectedRecoveryCase.case_reference || selectedRecoveryCase.id, {
        custody_location: custodyTransferLocation,
        notes: custodyTransferNotes
      });
      setSelectedRecoveryCase(updated);
      toast.success(`Custody updated to ${custodyTransferLocation}`);
      loadRecoveryCases();
    } catch (err: any) {
      toast.error(err.message || 'Failed to transfer custody');
    } finally {
      setRecoveryActionSubmitting(false);
    }
  };

  const handleReturnDeviceAction = async () => {
    if (!selectedRecoveryCase) return;
    setRecoveryActionSubmitting(true);
    try {
      const updated = await returnCaseDevice(selectedRecoveryCase.case_reference || selectedRecoveryCase.id, {
        return_carrier: returnCarrier,
        return_tracking_number: returnTracking,
        return_recipient_name: returnRecipient
      });
      setSelectedRecoveryCase(updated);
      toast.success('Device return recorded.');
      loadRecoveryCases();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record return');
    } finally {
      setRecoveryActionSubmitting(false);
    }
  };

  // Staff accounts directory for Super Admin
  const [staffAccounts] = useState<StaffUser[]>([
    {
      id: 'u-00000000-0001',
      email: 'admin@marsnova.in',
      full_name: 'Aditya Verma',
      role: 'super_admin',
      status: 'active'
    },
    {
      id: 'u-00000000-0002',
      email: 'manager@marsnova.in',
      full_name: 'Priya Sharma',
      role: 'agency_manager',
      status: 'active'
    },
    {
      id: 'u-00000000-0003',
      email: 'editor@marsnova.in',
      full_name: 'Rohan Das',
      role: 'editor',
      status: 'active'
    },
    {
      id: 'u-00000000-0004',
      email: 'suspended@marsnova.in',
      full_name: 'Suspended Operator',
      role: 'editor',
      status: 'suspended'
    }
  ]);

  // New quotation form state
  const [newQuote, setNewQuote] = useState({
    reference: '',
    lead_id: '',
    client_name: '',
    client_email: '',
    service_type: 'Video Creation & Editing',
    scope: '',
    total_amount_inr: '25000.00',
    currency: 'INR',
    terms: '50% advance on agreement, 50% on deliverable sign-off. Net 15 days.',
    valid_days: 14
  });

  // Fetch real overview statistics
  const loadOverviewStatistics = useCallback(async (signal?: AbortSignal) => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const stats = await getAdminOverview(signal);
      setOverviewStats(stats);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const errorMsg = err.message || 'Failed to load telemetry statistics from MarsNova backend';
      setStatsError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch leads with server-side pagination & filter combinations
  const loadLeads = useCallback(
    async (pageToLoad: number = leadPagination.page, signal?: AbortSignal) => {
      setLeadsLoading(true);
      setLeadsError(null);
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
        setLeads(result.data);
        setLeadPagination(result.pagination);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        const msg = err.message || 'Failed to load leads from server';
        setLeadsError(msg);
        toast.error(msg);
      } finally {
        setLeadsLoading(false);
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

  // Load Quotations List
  const loadQuotations = useCallback(async (signal?: AbortSignal) => {
    setQuotationsLoading(true);
    setQuotationsError(null);
    try {
      const res = await fetchQuotationsPaged({}, signal);
      setQuotations(res.data);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const msg = err.message || 'Failed to load quotations from server';
      setQuotationsError(msg);
    } finally {
      setQuotationsLoading(false);
    }
  }, []);

  // Load Single Quotation Details with Revisions
  const loadQuotationDetails = useCallback(async (idOrRef: string, signal?: AbortSignal) => {
    setQuoteDetailsLoading(true);
    try {
      const data = await getQuotationDetails(idOrRef, signal);
      setSelectedQuotation(data);
      setTargetQuoteStatus(data.status);
      setNewRevisionScope(data.scope);
      setNewRevisionAmount(data.amount);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      toast.error(err?.message || 'Failed to load quotation details');
    } finally {
      setQuoteDetailsLoading(false);
    }
  }, []);

  // Load Creative Projects List
  const loadProjects = useCallback(async (signal?: AbortSignal) => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const res = await fetchProjectsPaged({});
      setProjectsList(res.data);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const msg = err.message || 'Failed to load projects from server';
      setProjectsError(msg);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  // Load Single Project Details (Milestones, Staff Assignments, Audited Activities)
  const loadProjectDetails = useCallback(async (idOrCode: string) => {
    setProjectDetailsLoading(true);
    try {
      const data = await getProjectDetails(idOrCode);
      setSelectedProject(data);
      setTargetProjStatus(data.status);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load project details');
    } finally {
      setProjectDetailsLoading(false);
    }
  }, []);

  // Load Content Management System Data (Services, Portfolio, Courses, Lessons, Media)
  const loadCmsContent = useCallback(async () => {
    setCmsLoading(true);
    try {
      const [srv, port, crs, med] = await Promise.all([
        fetchAdminServices().catch(() => []),
        fetchAdminPortfolio().catch(() => []),
        fetchAdminCourses().catch(() => []),
        fetchAdminMedia().catch(() => [])
      ]);
      setCmsServices(srv);
      setCmsPortfolio(port);
      setCmsCourses(crs);
      setCmsMedia(med);
      const defaultCourseId = crs.length > 0 ? crs[0].id : 'crs-1';
      setSelectedCourseForLessons(defaultCourseId);
      const les = await fetchAdminLessons(defaultCourseId).catch(() => []);
      setCmsLessons(les);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load CMS content');
    } finally {
      setCmsLoading(false);
    }
  }, []);

  // Inspect session on mount
  useEffect(() => {
    const controller = new AbortController();
    inspectSession()
      .then((user) => {
        if (user && user.status === 'active') {
          setCurrentUser(user as StaffUser);
          loadOverviewStatistics(controller.signal);
          loadLeads(1, controller.signal);
          loadQuotations(controller.signal);
          loadProjects(controller.signal);
          loadCmsContent();
          loadRecoveryCases();
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
  }, [loadOverviewStatistics, loadLeads, loadQuotations, loadProjects, loadCmsContent, loadRecoveryCases]);

  // Re-fetch leads when filters or pagination page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > leadPagination.total_pages) return;
    loadLeads(newPage);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLeads(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setServiceFilter('all');
    setSourceFilter('all');
    setSortBy('created_at');
    setSortOrder('desc');
    loadLeads(1);
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
      loadOverviewStatistics();
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
      loadOverviewStatistics();
      loadLeads(1);
    } catch (err: any) {
      const msg = err.message || 'Staff authentication failed';
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutStaff();
      setCurrentUser(null);
      setOverviewStats(null);
      setLeads([]);
      toast.info('Staff session ended securely.');
    } catch (err: any) {
      toast.error('Logout error: ' + (err.message || 'Unknown error'));
      setCurrentUser(null);
    }
  };

  const handleVerifySession = async () => {
    setSessionVerifying(true);
    try {
      const user = await inspectSession();
      if (user && user.status === 'active') {
        setCurrentUser(user as StaffUser);
        toast.success(`Active session verified: ${user.email} [${user.role}]`);
        loadOverviewStatistics();
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

  const fillQuickCredentials = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setLoginError(null);
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check RBAC before creating quote
    if (currentUser?.role === 'editor') {
      toast.error('Permission Denied: Editors have read-only access to quotations.');
      return;
    }

    if (!newQuote.client_name.trim()) {
      toast.error('Client name is required');
      return;
    }

    setQuoteSubmitting(true);
    try {
      const validUntilDate = new Date(Date.now() + newQuote.valid_days * 86400000).toISOString().split('T')[0];
      const res = await createQuotation({
        reference: newQuote.reference.trim() || undefined,
        lead_id: newQuote.lead_id || undefined,
        client_name: newQuote.client_name.trim(),
        client_email: newQuote.client_email.trim() || undefined,
        service_type: newQuote.service_type,
        scope: newQuote.scope.trim() || `${newQuote.service_type} proposal for ${newQuote.client_name.trim()}`,
        amount: newQuote.total_amount_inr,
        currency: newQuote.currency,
        terms: newQuote.terms,
        valid_until: validUntilDate
      });

      toast.success(`Quotation ${res.data.reference} created successfully!`);
      loadQuotations();
      loadOverviewStatistics();
      setNewQuote({
        reference: '',
        lead_id: '',
        client_name: '',
        client_email: '',
        service_type: 'Video Creation & Editing',
        scope: '',
        total_amount_inr: '25000.00',
        currency: 'INR',
        terms: '50% advance on agreement, 50% on deliverable sign-off. Net 15 days.',
        valid_days: 14
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create quotation');
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const handleOpenQuotation = (idOrRef: string) => {
    setSelectedQuotationId(idOrRef);
    loadQuotationDetails(idOrRef);
    setShowRevisionForm(false);
  };

  const handleUpdateQuoteStatus = async () => {
    if (!selectedQuotation || !targetQuoteStatus) return;
    if (currentUser?.role === 'editor') {
      toast.error('Permission Denied: Editors have read-only access to quotations.');
      return;
    }

    setQuoteStatusUpdating(true);
    try {
      const res = await updateQuotationStatus(
        selectedQuotation.reference || selectedQuotation.id,
        targetQuoteStatus as QuotationStatus,
        quoteStatusNote.trim() || undefined
      );
      toast.success(res.message || 'Quotation status updated.');
      setSelectedQuotation(res.data);
      loadQuotations();
      loadOverviewStatistics();
      setQuoteStatusNote('');
    } catch (err: any) {
      toast.error(err?.message || 'Status transition failed');
    } finally {
      setQuoteStatusUpdating(false);
    }
  };

  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuotation) return;
    if (currentUser?.role === 'editor') {
      toast.error('Permission Denied: Editors cannot create revisions.');
      return;
    }

    setRevisionSubmitting(true);
    try {
      const res = await createQuotationRevision(selectedQuotation.reference || selectedQuotation.id, {
        scope: newRevisionScope.trim() || undefined,
        amount: newRevisionAmount ? String(newRevisionAmount) : undefined,
        change_summary: newRevisionSummary.trim() || 'Updated terms / pricing'
      });
      toast.success(`Revision v${res.data.revision_number} created successfully! Status reverted to Draft.`);
      setSelectedQuotation(res.data);
      setShowRevisionForm(false);
      setNewRevisionSummary('');
      loadQuotations();
      loadOverviewStatistics();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create quotation revision');
    } finally {
      setRevisionSubmitting(false);
    }
  };

  const getQuotationStatusBadgeVariant = (status: QuotationStatus | string) => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'sent':
        return 'cyan';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'destructive';
      case 'expired':
        return 'outline';
      case 'cancelled':
      default:
        return 'secondary';
    }
  };

  const getAllowedQuotationTransitions = (current: QuotationStatus | string): QuotationStatus[] => {
    switch (current) {
      case 'draft':
        return ['sent', 'cancelled'];
      case 'sent':
        return ['approved', 'rejected', 'expired', 'cancelled'];
      case 'approved':
        return ['cancelled'];
      case 'rejected':
        return ['draft', 'cancelled'];
      case 'expired':
        return ['draft', 'cancelled'];
      case 'cancelled':
      default:
        return [];
    }
  };

  const handleOpenProject = (idOrCode: string) => {
    setSelectedProjectId(idOrCode);
    loadProjectDetails(idOrCode);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentUser?.role === 'editor') {
      toast.error('Permission Denied: Editors cannot create projects.');
      return;
    }

    if (!newProject.title.trim()) {
      toast.error('Project title is required.');
      return;
    }

    if (!newProject.client_name.trim()) {
      toast.error('Client name is required.');
      return;
    }

    if (new Date(newProject.target_delivery) < new Date(newProject.start_date)) {
      toast.error(`Invalid dates: Target delivery (${newProject.target_delivery}) cannot precede start date (${newProject.start_date}).`);
      return;
    }

    setProjectSubmitting(true);
    try {
      const payload: CreateProjectPayload = {
        title: newProject.title.trim(),
        client_name: newProject.client_name.trim(),
        client_email: newProject.client_email.trim() || undefined,
        vertical: newProject.vertical,
        scope: newProject.scope.trim() || `${newProject.title.trim()} production scope`,
        priority: newProject.priority,
        start_date: newProject.start_date,
        target_delivery: newProject.target_delivery,
        quotation_id: newProject.quotation_id || undefined,
        lead_id: newProject.lead_id || undefined,
        drive_assets_url: newProject.drive_assets_url.trim() || undefined,
        notes: newProject.notes.trim() || undefined
      };

      if (newProject.initial_deliverable.trim()) {
        payload.deliverables = [
          {
            title: newProject.initial_deliverable.trim(),
            due_date: newProject.target_delivery,
            status: 'pending',
            completed: false
          }
        ];
      }

      const res = await createProject(payload);
      toast.success(`Project ${res.data.project_code} successfully launched into Kickoff stage!`);
      loadProjects();
      loadOverviewStatistics();

      // Reset form
      setNewProject({
        title: '',
        client_name: '',
        client_email: '',
        vertical: 'video_production',
        scope: '',
        priority: 'medium',
        start_date: new Date().toISOString().slice(0, 10),
        target_delivery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        quotation_id: '',
        lead_id: '',
        drive_assets_url: '',
        notes: '',
        initial_deliverable: ''
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create project');
    } finally {
      setProjectSubmitting(false);
    }
  };

  const handleUpdateProjectStatus = async () => {
    if (!selectedProject || !targetProjStatus) return;
    if (currentUser?.role === 'editor') {
      toast.error('Permission Denied: Editors cannot transition project stages.');
      return;
    }

    setProjectStatusUpdating(true);
    try {
      const res = await updateProjectStatus(
        selectedProject.id,
        targetProjStatus as ProjectStatus,
        projStatusNote.trim() || undefined
      );
      toast.success(res.message || `Project transitioned to ${targetProjStatus}`);
      setSelectedProject(res.data);
      loadProjects();
      loadOverviewStatistics();
      setProjStatusNote('');
    } catch (err: any) {
      toast.error(err?.message || 'Stage transition failed');
    } finally {
      setProjectStatusUpdating(false);
    }
  };

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !assignUserId) {
      toast.error('Please select an active team member');
      return;
    }
    if (currentUser?.role === 'editor') {
      toast.error('Permission Denied: Editors cannot assign team members.');
      return;
    }

    setAssigningStaff(true);
    try {
      const res = await assignProjectStaff(selectedProject.id, {
        user_id: assignUserId,
        role_in_project: assignRole
      });
      toast.success(res.message || 'Staff assigned to project team.');
      setSelectedProject(res.data);
      loadProjects();
      setAssignUserId('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign staff member');
    } finally {
      setAssigningStaff(false);
    }
  };

  const handleRemoveStaff = async (assignmentRef: string) => {
    if (!selectedProject) return;
    if (currentUser?.role === 'editor') {
      toast.error('Permission Denied: Editors cannot remove team members.');
      return;
    }

    try {
      const res = await removeProjectStaff(selectedProject.id, assignmentRef);
      toast.success(res.message || 'Staff assignment removed.');
      setSelectedProject(res.data);
      loadProjects();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove staff assignment');
    }
  };

  const handleAddDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newDeliverableTitle.trim()) {
      toast.error('Deliverable title is required');
      return;
    }

    setAddingDeliverable(true);
    try {
      const res = await updateProjectDeliverables(selectedProject.id, {
        title: newDeliverableTitle.trim(),
        due_date: newDeliverableDueDate || selectedProject.target_delivery,
        status: 'pending',
        completed: false
      });
      toast.success(res.message || 'Milestone deliverable added.');
      setSelectedProject(res.data);
      loadProjects();
      setNewDeliverableTitle('');
      setNewDeliverableDueDate('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add deliverable');
    } finally {
      setAddingDeliverable(false);
    }
  };

  const getAllowedProjectTransitions = (current: string): ProjectStatus[] => {
    switch (current) {
      case 'kickoff': return ['pre_production', 'on_hold', 'cancelled'];
      case 'pre_production': return ['production', 'on_hold', 'cancelled'];
      case 'production': return ['post_editing', 'on_hold', 'cancelled'];
      case 'post_editing': return ['client_review', 'on_hold', 'cancelled'];
      case 'client_review': return ['final_delivery', 'post_editing', 'on_hold', 'cancelled'];
      case 'final_delivery': return ['completed', 'client_review', 'cancelled'];
      case 'on_hold': return ['kickoff', 'pre_production', 'production', 'post_editing', 'client_review', 'final_delivery', 'cancelled'];
      case 'completed': return [];
      case 'cancelled': return [];
      default: return [];
    }
  };

  const getProjectStatusBadgeVariant = (status: ProjectStatus | string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'final_delivery': return 'purple';
      case 'client_review': return 'outline';
      case 'post_editing': return 'cyan';
      case 'production': return 'purple';
      case 'pre_production': return 'cyan';
      case 'kickoff': return 'secondary';
      case 'on_hold': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getProjectPriorityBadgeVariant = (priority: ProjectPriority | string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'purple';
      case 'medium': return 'cyan';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getContentStatusBadgeVariant = (status: ContentStatus | string) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'secondary';
      case 'archived': return 'outline';
      default: return 'secondary';
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceForm.title.trim() || !newServiceForm.slug.trim()) {
      toast.error('Service title and unique slug are required');
      return;
    }
    setContentSubmitting(true);
    try {
      const created = await createAdminService(newServiceForm);
      toast.success(`Service '${created.title}' created (${created.status})!`);
      setNewServiceForm({ title: '', slug: '', category: 'Video', description: '', status: 'draft' });
      loadCmsContent();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create service');
    } finally {
      setContentSubmitting(false);
    }
  };

  const handlePublishService = async (id: string) => {
    try {
      await publishAdminService(id);
      toast.success('Service successfully published to public catalog');
      loadCmsContent();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to publish service');
    }
  };

  const handleArchiveService = async (id: string) => {
    try {
      await archiveAdminService(id);
      toast.info('Service moved to archived state');
      loadCmsContent();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to archive service');
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await deleteAdminService(id);
      toast.success('Service deleted');
      loadCmsContent();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete service');
    }
  };

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioForm.title.trim() || !newPortfolioForm.slug.trim()) {
      toast.error('Portfolio title and unique slug are required');
      return;
    }
    setContentSubmitting(true);
    try {
      const created = await createAdminPortfolio(newPortfolioForm);
      toast.success(`Portfolio item '${created.title}' created (${created.status})!`);
      setNewPortfolioForm({ title: '', slug: '', category: 'YouTube Videos', client_name: '', status: 'draft' });
      loadCmsContent();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create portfolio item');
    } finally {
      setContentSubmitting(false);
    }
  };

  const handlePublishPortfolio = async (id: string) => {
    try {
      await publishAdminPortfolio(id);
      toast.success('Portfolio item published to public gallery');
      loadCmsContent();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to publish portfolio item');
    }
  };

  const handleArchivePortfolio = async (id: string) => {
    try {
      await archiveAdminPortfolio(id);
      toast.info('Portfolio item archived');
      loadCmsContent();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to archive portfolio item');
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    try {
      await deleteAdminPortfolio(id);
      toast.success('Portfolio item deleted');
      loadCmsContent();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete portfolio item');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseForm.title.trim() || !newCourseForm.slug.trim()) {
      toast.error('Course title and unique slug are required');
      return;
    }
    setContentSubmitting(true);
    try {
      const created = await createAdminCourse(newCourseForm);
      toast.success(`Course '${created.title}' created (${created.status})!`);
      setNewCourseForm({ title: '', slug: '', category: 'Creative Production', description: '', status: 'draft' });
      loadCmsContent();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create course');
    } finally {
      setContentSubmitting(false);
    }
  };

  const handlePublishCourse = async (id: string) => {
    try {
      await publishAdminCourse(id);
      toast.success('Course published to MarsNova Lab curriculum');
      loadCmsContent();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to publish course');
    }
  };

  const handleArchiveCourse = async (id: string) => {
    try {
      await archiveAdminCourse(id);
      toast.info('Course archived');
      loadCmsContent();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to archive course');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await deleteAdminCourse(id);
      toast.success('Course deleted');
      loadCmsContent();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete course');
    }
  };

  const handleCourseSelectForLessons = async (courseId: string) => {
    setSelectedCourseForLessons(courseId);
    try {
      const les = await fetchAdminLessons(courseId);
      setCmsLessons(les);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load lessons for course');
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForLessons) {
      toast.error('Please select a course for this lesson');
      return;
    }
    if (!newLessonForm.title.trim() || !newLessonForm.slug.trim()) {
      toast.error('Lesson title and unique slug are required');
      return;
    }
    setContentSubmitting(true);
    try {
      const created = await createAdminLesson(selectedCourseForLessons, newLessonForm);
      toast.success(`Lesson '${created.title}' added to curriculum (${created.status})!`);
      setNewLessonForm({
        title: '',
        slug: '',
        module_title: 'Module 1',
        lesson_order: (cmsLessons.length + 1),
        content_markdown: '',
        video_url: '',
        is_free_preview: false,
        is_private: true,
        status: 'draft'
      });
      const updated = await fetchAdminLessons(selectedCourseForLessons);
      setCmsLessons(updated);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add lesson');
    } finally {
      setContentSubmitting(false);
    }
  };

  const handlePublishLesson = async (id: string) => {
    try {
      await publishAdminLesson(id);
      toast.success('Lesson published');
      const updated = await fetchAdminLessons(selectedCourseForLessons);
      setCmsLessons(updated);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to publish lesson');
    }
  };

  const handleArchiveLesson = async (id: string) => {
    try {
      await archiveAdminLesson(id);
      toast.info('Lesson archived');
      const updated = await fetchAdminLessons(selectedCourseForLessons);
      setCmsLessons(updated);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to archive lesson');
    }
  };

  const handleDeleteLesson = async (id: string) => {
    try {
      await deleteAdminLesson(id);
      toast.success('Lesson deleted');
      const updated = await fetchAdminLessons(selectedCourseForLessons);
      setCmsLessons(updated);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete lesson');
    }
  };

  const handleUploadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaForm.file_name.trim()) {
      toast.error('File name is required');
      return;
    }
    setContentSubmitting(true);
    try {
      const res = await uploadMedia(newMediaForm);
      toast.success(`Media asset '${res.file_name}' uploaded successfully to ${res.storage_provider}!`);
      setNewMediaForm({ file_name: '', mime_type: 'image/webp', file_size_bytes: 102400, is_private: false });
      const med = await fetchAdminMedia();
      setCmsMedia(med);
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setContentSubmitting(false);
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

  // 2. Unauthenticated State (Login Portal)
  if (!currentUser) {
    return (
      <div style={{ padding: '60px 0 100px', minHeight: '80vh' }}>
        <Container>
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div className="eyebrow-tag" style={{ margin: '0 auto 12px' }}>
                <Lock size={14} />
                <span>Restricted Access</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
                MarsNova <span className="gradient-text">Staff Operations</span>
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>
                Authorized studio staff login with secure HTTP-only cookies and role-based permissions.
              </p>
            </div>

            <Card className="contact-card" style={{ padding: '32px' }}>
              {loginError && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="contact-form">
                <Input
                  id="staff-email"
                  label="Staff Email"
                  type="email"
                  required
                  placeholder="name@marsnova.in"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />

                <Input
                  id="staff-password"
                  label="Password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  leftIcon={<KeyRound size={16} />}
                  disabled={loginSubmitting}
                >
                  {loginSubmitting ? 'Authenticating...' : 'Sign In to Operations'}
                </Button>
              </form>

              <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-muted)' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', display: 'block', marginBottom: '12px' }}>
                  Quick Fill Test Credentials
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillQuickCredentials('admin@marsnova.in', 'Admin@2026!')}
                    style={{ fontSize: '11px', padding: '6px 4px' }}
                  >
                    Super Admin
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillQuickCredentials('manager@marsnova.in', 'Manager@2026!')}
                    style={{ fontSize: '11px', padding: '6px 4px' }}
                  >
                    Manager
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillQuickCredentials('editor@marsnova.in', 'Editor@2026!')}
                    style={{ fontSize: '11px', padding: '6px 4px' }}
                  >
                    Editor
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </Container>
      </div>
    );
  }

  // 3. Authenticated Workspace Shell
  const isSuperAdmin = currentUser.role === 'super_admin';
  const canManageQuotes = currentUser.role === 'super_admin' || currentUser.role === 'agency_manager';
  const isEditor = currentUser.role === 'editor';

  return (
    <PageTransition>
      <SidebarProvider defaultOpen={true}>
      <div style={{ padding: '40px 0 80px' }}>
        <Container>
          {/* Header Bar with Staff Profile & Telemetry Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '32px',
              paddingBottom: '20px',
              borderBottom: '1px solid var(--border-muted)'
            }}
          >
            <div>
              <div className="eyebrow-tag" style={{ marginBottom: '8px' }}>
                <ShieldCheck size={14} />
                <span>Protected Admin Shell</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>
                MarsNova <span className="gradient-text">Operations Center</span>
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                Lead management, status transitions, follow-up notes, and activity auditing.
              </p>
            </div>

            {/* Authenticated Staff Card & Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div
                style={{
                  background: 'var(--bg-deep)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ background: 'rgba(0, 240, 255, 0.1)', padding: '6px', borderRadius: '8px' }}>
                  <UserCheck size={16} style={{ color: 'var(--cyan-accent)' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      {currentUser.full_name}
                    </span>
                    <Badge variant={getRoleBadgeVariant(currentUser.role)}>
                      {currentUser.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    {currentUser.email} • Status: Active
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleVerifySession}
                disabled={sessionVerifying || statsLoading || leadsLoading}
                title="Inspect session & reload real-time data"
              >
                <RefreshCw size={14} className={sessionVerifying || statsLoading || leadsLoading ? 'animate-spin' : ''} />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut size={14} />}
              >
                Sign Out
              </Button>

              <SidebarTrigger className="md:hidden" />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) 1fr', gap: '24px', alignItems: 'start' }}>
              {/* Studio Admin Navigation Sidebar */}
              <Sidebar className="rounded-xl border border-[var(--border-muted)] h-fit">
                <SidebarHeader>
                  <div style={{ padding: '8px 4px 12px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
                      Workspace Nav
                    </span>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Studio Ops</h3>
                  </div>
                </SidebarHeader>
                <SidebarContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeTab === 'overview'}
                        onClick={() => setActiveTab('overview')}
                      >
                        <BarChart3 size={16} />
                        <span>Telemetry Overview</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeTab === 'enquiries'}
                        onClick={() => setActiveTab('enquiries')}
                      >
                        <Users size={16} />
                        <span>Leads & Inquiries ({leadPagination.total})</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeTab === 'quotations'}
                        onClick={() => setActiveTab('quotations')}
                      >
                        <FileText size={16} />
                        <span>Quotations ({quotations.length})</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeTab === 'projects'}
                        onClick={() => setActiveTab('projects')}
                      >
                        <Briefcase size={16} />
                        <span>Projects ({projectsList.length})</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeTab === 'content'}
                        onClick={() => setActiveTab('content')}
                      >
                        <Layers size={16} />
                        <span>Content CMS ({cmsServices.length + cmsPortfolio.length + cmsCourses.length})</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeTab === 'recovery'}
                        onClick={() => setActiveTab('recovery')}
                      >
                        <HardDrive size={16} />
                        <span>Recovery Lab ({recoveryCases.length})</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {isSuperAdmin && (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={activeTab === 'team'}
                          onClick={() => setActiveTab('team')}
                        >
                          <ShieldAlert size={16} />
                          <span>Staff & RBAC ({staffAccounts.length})</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarContent>
              </Sidebar>

              {/* Main Workspace Pane */}
              <div style={{ minWidth: 0 }}>
                {/* Responsive Quick Navigation Tabs */}
                <TabsList className={`grid w-full mb-6 ${isSuperAdmin ? 'grid-cols-7' : 'grid-cols-6'}`}>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="enquiries">Leads</TabsTrigger>
                  <TabsTrigger value="quotations">Quotations</TabsTrigger>
                  <TabsTrigger value="projects">Projects</TabsTrigger>
                  <TabsTrigger value="content">Content CMS</TabsTrigger>
                  <TabsTrigger value="recovery">Recovery</TabsTrigger>
                  {isSuperAdmin && <TabsTrigger value="team">Staff RBAC</TabsTrigger>}
                </TabsList>

                {/* Tab 1: Telemetry Overview & Real API Statistics */}
                <TabsContent value="overview">
                  {statsLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        {[1, 2, 3, 4].map((i) => (
                          <Card key={i} className="contact-card" style={{ padding: '20px' }}>
                            <Skeleton className="h-4 w-24 mb-3" />
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-3 w-32" />
                          </Card>
                        ))}
                      </div>
                      <Card className="contact-card" style={{ padding: '24px' }}>
                        <Skeleton className="h-6 w-48 mb-4" />
                        <Skeleton className="h-40 w-full" />
                      </Card>
                    </div>
                  ) : statsError ? (
                    <ErrorState
                      title="Failed to Load Overview Statistics"
                      message={statsError}
                      onRetry={() => loadOverviewStatistics()}
                    />
                  ) : !overviewStats ? (
                    <EmptyState
                      title="No Overview Telemetry Available"
                      description="Connect to the MarsNova Drogon backend to inspect live system telemetry and client inquiries."
                      action={{
                        label: 'Reload Telemetry',
                        onClick: () => loadOverviewStatistics()
                      }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Status Banner */}
                      <div
                        style={{
                          background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.08), rgba(168, 85, 247, 0.08))',
                          border: '1px solid var(--border-muted)',
                          borderRadius: '12px',
                          padding: '14px 20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                          <strong style={{ color: '#fff', fontSize: '13px' }}>System Status: Operational</strong>
                          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>• Drogon C++ Engine Active</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <Clock size={13} />
                          <span>Last Synced: {new Date(overviewStats.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      {/* 4 Core Stat Cards with Real Counts */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <Card className="contact-card" style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Inquiries & Leads
                            </span>
                            <div style={{ background: 'rgba(0, 240, 255, 0.1)', padding: '6px', borderRadius: '8px', color: 'var(--cyan-accent)' }}>
                              <Users size={18} />
                            </div>
                          </div>
                          <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', margin: '8px 0 4px' }}>
                            {overviewStats.counts.leads_count}
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                            {overviewStats.conversion_metrics.new_leads_count} pending triage • {overviewStats.conversion_metrics.contacted_leads_count} contacted
                          </span>
                        </Card>

                        <Card className="contact-card" style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Production Catalog
                            </span>
                            <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '6px', borderRadius: '8px', color: 'var(--purple-glow)' }}>
                              <Briefcase size={18} />
                            </div>
                          </div>
                          <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', margin: '8px 0 4px' }}>
                            {overviewStats.counts.services_count}
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                            {overviewStats.counts.portfolio_count} case studies • {overviewStats.counts.courses_count} Lab courses
                          </span>
                        </Card>

                        <Card className="contact-card" style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Recovery Lab Cases
                            </span>
                            <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '6px', borderRadius: '8px', color: '#38bdf8' }}>
                              <HardDrive size={18} />
                            </div>
                          </div>
                          <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', margin: '8px 0 4px' }}>
                            {overviewStats.counts.recovery_cases_count}
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                            NAND flash reconstruction active
                          </span>
                        </Card>

                        <Card className="contact-card" style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Quotation Pipeline
                            </span>
                            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '6px', borderRadius: '8px', color: '#22c55e' }}>
                              <FileText size={18} />
                            </div>
                          </div>
                          {overviewStats.financials ? (
                            <>
                              <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: '8px 0 4px' }}>
                                ₹{overviewStats.financials.total_quotation_value_inr.toLocaleString('en-IN')}
                              </div>
                              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                                {overviewStats.counts.quotations_count} quotation issued • Avg ₹{overviewStats.financials.average_quote_value_inr.toLocaleString('en-IN')}
                              </span>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-muted)', margin: '14px 0 4px' }}>
                                Protected (Editor)
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                Financial data restricted by RBAC
                              </span>
                            </>
                          )}
                        </Card>
                      </div>

                      {/* Charts Section */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                        <Card className="contact-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                              <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>
                                Client Inquiry Distribution
                              </h3>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                Real distribution of customer service interests
                              </span>
                            </div>
                            <Layers size={18} style={{ color: 'var(--cyan-accent)' }} />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {overviewStats.service_distribution.map((item, idx) => (
                              <div key={idx}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                                  <span style={{ color: '#fff', fontWeight: 500 }}>{item.category}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <strong style={{ color: 'var(--cyan-accent)' }}>{item.count}</strong>
                                    <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>({item.percentage.toFixed(1)}%)</span>
                                  </div>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: 'var(--bg-deep)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      width: `${item.percentage}%`,
                                      height: '100%',
                                      background: idx === 0
                                        ? 'linear-gradient(90deg, #00f0ff, #38bdf8)'
                                        : idx === 1
                                        ? 'linear-gradient(90deg, #a855f7, #c084fc)'
                                        : idx === 2
                                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                                        : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                                      borderRadius: '4px',
                                      transition: 'width 0.6s ease'
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>

                        <Card className="contact-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                              <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>
                                Lead Conversion Efficiency
                              </h3>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                Calculated conversion from contact to quotation
                              </span>
                            </div>
                            <TrendingUp size={18} style={{ color: 'var(--purple-glow)' }} />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div
                              style={{
                                background: 'var(--bg-deep)',
                                border: '1px solid var(--border-muted)',
                                borderRadius: '12px',
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <div>
                                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>
                                  Contacted Conversion Ratio
                                </span>
                                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--cyan-accent)', marginTop: '2px' }}>
                                  {overviewStats.conversion_metrics.conversion_rate_percent.toFixed(1)}%
                                </div>
                              </div>
                              <Badge variant="cyan">Calculated Ratio</Badge>
                            </div>

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Initial Intake (New Inquiries)</span>
                                <span style={{ color: '#fff', fontWeight: 600 }}>{overviewStats.conversion_metrics.new_leads_count} Leads</span>
                              </div>
                              <ProgressBar
                                value={overviewStats.counts.leads_count > 0 ? (overviewStats.conversion_metrics.new_leads_count / overviewStats.counts.leads_count) * 100 : 0}
                              />
                            </div>

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Active Consultation (Contacted)</span>
                                <span style={{ color: '#fff', fontWeight: 600 }}>{overviewStats.conversion_metrics.contacted_leads_count} Leads</span>
                              </div>
                              <ProgressBar
                                value={overviewStats.counts.leads_count > 0 ? (overviewStats.conversion_metrics.contacted_leads_count / overviewStats.counts.leads_count) * 100 : 0}
                              />
                            </div>
                          </div>
                        </Card>
                      </div>

                      {/* Recent Activity Telemetry */}
                      <Card className="contact-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <div>
                            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>
                              Real-Time Studio Activity Feed
                            </h3>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              Audited events from lead capture, recovery diagnostics and quotations
                            </span>
                          </div>
                          <Activity size={18} style={{ color: '#10b981' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {overviewStats.recent_activity.map((act) => (
                            <div
                              key={act.id}
                              style={{
                                background: 'var(--bg-deep)',
                                border: '1px solid var(--border-muted)',
                                borderRadius: '10px',
                                padding: '14px 18px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '8px', borderRadius: '8px' }}>
                                  {act.type === 'lead_received' ? (
                                    <Users size={16} style={{ color: 'var(--cyan-accent)' }} />
                                  ) : act.type === 'recovery_progress' ? (
                                    <HardDrive size={16} style={{ color: '#38bdf8' }} />
                                  ) : (
                                    <FileText size={16} style={{ color: 'var(--purple-glow)' }} />
                                  )}
                                </div>
                                <div>
                                  <strong style={{ color: '#fff', fontSize: '14px', display: 'block' }}>{act.title}</strong>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{act.detail}</span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                  {new Date(act.timestamp).toLocaleDateString()} {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <Badge variant="secondary">{act.status}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 2: Leads & Inquiries Management (Search, Filters, Pagination, Notes, Status Changes) */}
                <TabsContent value="enquiries">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Search & Filter Bar */}
                    <Card className="contact-card" style={{ padding: '20px' }}>
                      <form onSubmit={handleSearchSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
                          {/* Search Input */}
                          <div>
                            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12px' }}>
                              Search Keywords
                            </label>
                            <Input
                              placeholder="Name, email, phone, note..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>

                          {/* Status Filter */}
                          <div>
                            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12px' }}>
                              Status Filter
                            </label>
                            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                              <SelectTrigger>
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
                            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12px' }}>
                              Service Domain
                            </label>
                            <Select value={serviceFilter} onValueChange={(val) => setServiceFilter(val)}>
                              <SelectTrigger>
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
                            <Button type="submit" variant="primary" leftIcon={<Filter size={14} />} style={{ flex: 1 }}>
                              Apply Filters
                            </Button>
                            <Button type="button" variant="outline" onClick={handleClearFilters} title="Reset filters">
                              Reset
                            </Button>
                          </div>
                        </div>
                      </form>
                    </Card>

                    {/* Leads Results Table */}
                    <Card className="contact-card">
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                          marginBottom: '20px'
                        }}
                      >
                        <div>
                          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>
                            Client Inquiries & Leads Register
                          </h3>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Showing page {leadPagination.page} of {leadPagination.total_pages} ({leadPagination.total} total matching leads)
                          </span>
                        </div>

                        {/* Page Size & Refresh Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Per page:</span>
                          <Select
                            value={String(leadPagination.limit)}
                            onValueChange={(val) => {
                              setLeadPagination({ ...leadPagination, limit: Number(val) });
                              loadLeads(1);
                            }}
                          >
                            <SelectTrigger style={{ width: '80px', height: '32px' }}>
                              <SelectValue placeholder="10" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="25">25</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button variant="outline" size="sm" onClick={() => loadLeads()} disabled={leadsLoading}>
                            <RefreshCw size={13} className={leadsLoading ? 'animate-spin' : ''} />
                          </Button>
                        </div>
                      </div>

                      {leadsLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-12 w-full" />
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
                        <div style={{ border: '1px solid var(--border-muted)', borderRadius: '12px', overflow: 'hidden' }}>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Lead ID</TableHead>
                                <TableHead>Contact Info</TableHead>
                                <TableHead>Service Requested</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead style={{ textAlign: 'right' }}>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {leads.map((l) => (
                                <TableRow key={l.id}>
                                  <TableCell style={{ fontWeight: 700, color: 'var(--cyan-accent)', fontSize: '12px' }}>
                                    {l.id}
                                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 400 }}>
                                      v{l.version}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>{l.full_name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{l.email}</div>
                                    {l.phone && <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{l.phone}</div>}
                                  </TableCell>
                                  <TableCell>
                                    <span style={{ fontSize: '13px', color: '#fff' }}>{l.service_requested}</span>
                                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Source: {l.source}</div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={getLeadStatusBadgeVariant(l.status)}>
                                      {l.status.replace('_', ' ')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <span style={{ fontWeight: 700, color: l.lead_score >= 80 ? '#10b981' : l.lead_score >= 60 ? 'var(--cyan-accent)' : 'var(--text-dim)' }}>
                                      {l.lead_score}
                                    </span>
                                  </TableCell>
                                  <TableCell style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                    {new Date(l.created_at).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell style={{ textAlign: 'right' }}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenLead(l.id)}
                                      leftIcon={<ExternalLink size={12} />}
                                    >
                                      Inspect
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
                            marginTop: '20px',
                            paddingTop: '16px',
                            borderTop: '1px solid var(--border-muted)',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                        >
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Page {leadPagination.page} of {leadPagination.total_pages}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(leadPagination.page - 1)}
                              disabled={!leadPagination.has_prev || leadsLoading}
                              leftIcon={<ChevronLeft size={14} />}
                            >
                              Previous
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(leadPagination.page + 1)}
                              disabled={!leadPagination.has_next || leadsLoading}
                              rightIcon={<ChevronRight size={14} />}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                </TabsContent>


                {/* Tab 3: Quotations */}
                <TabsContent value="quotations">
                  <div style={{ display: 'grid', gridTemplateColumns: canManageQuotes ? '1.2fr 0.8fr' : '1fr', gap: '24px' }}>
                    <Card className="contact-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>
                            Issued Quotations Register
                          </h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0' }}>
                            Operational studio records • Explicitly no payment gateways, checkout, or webhooks
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<RefreshCw size={13} className={quotationsLoading ? 'animate-spin' : ''} />}
                            onClick={() => loadQuotations()}
                            disabled={quotationsLoading}
                          >
                            Refresh
                          </Button>
                          {!canManageQuotes && (
                            <Badge variant="secondary">Read-Only View (Editor)</Badge>
                          )}
                        </div>
                      </div>

                      {quotationsLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      ) : quotationsError ? (
                        <ErrorState title="Error Loading Quotations" message={quotationsError} onRetry={() => loadQuotations()} />
                      ) : quotations.length === 0 ? (
                        <EmptyState title="No Quotations Found" description="Create your first manual quotation on the right panel." />
                      ) : (
                        <div style={{ border: '1px solid var(--border-muted)', borderRadius: '12px', overflow: 'hidden' }}>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Reference</TableHead>
                                <TableHead>Client & Service</TableHead>
                                <TableHead>Amount & Currency</TableHead>
                                <TableHead style={{ textAlign: 'right' }}>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {quotations.map((q) => (
                                <TableRow
                                  key={q.id}
                                  onClick={() => handleOpenQuotation(q.reference || q.id)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <TableCell style={{ fontWeight: 700, color: 'var(--cyan-accent)', fontSize: '13px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>{q.reference || q.id}</span>
                                      <Badge variant="outline" style={{ fontSize: '10px', padding: '0 4px' }}>
                                        v{q.revision_number}
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>{q.client_name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{q.service_type}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                      <span>Valid until: {q.valid_until}</span>
                                      {q.is_expired && (
                                        <Badge variant="destructive" style={{ fontSize: '9px', padding: '0 4px' }}>
                                          EXPIRED
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell style={{ fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                                    {q.currency} {Number(q.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell style={{ textAlign: 'right' }}>
                                    <Badge variant={getQuotationStatusBadgeVariant(q.status)}>
                                      {q.status.toUpperCase()}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </Card>

                    {canManageQuotes ? (
                      <Card className="contact-card">
                        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                          Create Manual Quotation
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '20px' }}>
                          Record-only quote with exact decimal monetary precision and audit revisions.
                        </p>
                        <form onSubmit={handleCreateQuotation} className="contact-form">
                          <Input
                            id="quote-ref"
                            label="Quotation Reference (Optional custom code)"
                            placeholder="e.g. MN-QT-2026-005 (auto-generated if empty)"
                            value={newQuote.reference}
                            onChange={(e) => setNewQuote({ ...newQuote, reference: e.target.value })}
                          />

                          <Input
                            id="quote-client"
                            label="Client Name"
                            required
                            placeholder="e.g. Horizon Labs"
                            value={newQuote.client_name}
                            onChange={(e) => setNewQuote({ ...newQuote, client_name: e.target.value })}
                          />

                          <Input
                            id="quote-email"
                            label="Client Email (Optional)"
                            type="email"
                            placeholder="e.g. billing@horizonlabs.com"
                            value={newQuote.client_email}
                            onChange={(e) => setNewQuote({ ...newQuote, client_email: e.target.value })}
                          />

                          <div style={{ marginBottom: '16px' }}>
                            <label htmlFor="quote-service-select" className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                              Service Type <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <Select
                              value={newQuote.service_type}
                              onValueChange={(val) => setNewQuote({ ...newQuote, service_type: val })}
                            >
                              <SelectTrigger id="quote-service-select">
                                <SelectValue placeholder="Select Service" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Video Creation & Editing">Video Creation & Editing</SelectItem>
                                <SelectItem value="Topic to Video + Shorts Package">Topic to Video + Shorts Package</SelectItem>
                                <SelectItem value="Pen Drive Physical Data Recovery">Pen Drive Physical Data Recovery</SelectItem>
                                <SelectItem value="AI Tools & Automation Consulting">AI Tools & Automation Consulting</SelectItem>
                                <SelectItem value="Business Brand Promotion">Business Brand Promotion</SelectItem>
                                <SelectItem value="Brand Identity & Design System">Brand Identity & Design System</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div style={{ marginBottom: '16px' }}>
                            <label htmlFor="quote-scope" className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                              Scope of Work & Deliverables <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <Textarea
                              id="quote-scope"
                              placeholder="Detail the deliverables, video runtimes, revision rounds, motion design assets..."
                              value={newQuote.scope}
                              onChange={(e) => setNewQuote({ ...newQuote, scope: e.target.value })}
                              rows={3}
                              required
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <Input
                              id="quote-amount"
                              label="Amount (Decimal)"
                              placeholder="45000.00"
                              required
                              value={newQuote.total_amount_inr}
                              onChange={(e) => setNewQuote({ ...newQuote, total_amount_inr: e.target.value })}
                            />

                            <div style={{ marginBottom: '16px' }}>
                              <label htmlFor="quote-currency-select" className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                                Currency
                              </label>
                              <Select
                                value={newQuote.currency}
                                onValueChange={(val) => setNewQuote({ ...newQuote, currency: val })}
                              >
                                <SelectTrigger id="quote-currency-select">
                                  <SelectValue placeholder="Select Currency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="INR">INR (₹)</SelectItem>
                                  <SelectItem value="USD">USD ($)</SelectItem>
                                  <SelectItem value="EUR">EUR (€)</SelectItem>
                                  <SelectItem value="GBP">GBP (£)</SelectItem>
                                  <SelectItem value="AED">AED (د.إ)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div style={{ marginBottom: '16px' }}>
                            <label htmlFor="quote-terms" className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                              Payment Milestones & Terms
                            </label>
                            <Input
                              id="quote-terms"
                              placeholder="e.g. 50% upfront, 50% on deliverable sign-off"
                              value={newQuote.terms}
                              onChange={(e) => setNewQuote({ ...newQuote, terms: e.target.value })}
                            />
                          </div>

                          <Button
                            type="submit"
                            variant="primary"
                            leftIcon={<Plus size={16} />}
                            disabled={quoteSubmitting}
                            fullWidth
                          >
                            {quoteSubmitting ? 'Creating Quotation...' : 'Issue Manual Quotation'}
                          </Button>
                        </form>
                      </Card>
                    ) : (
                      <Card className="contact-card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                          <Lock size={32} style={{ color: 'var(--text-dim)', margin: '0 auto 12px' }} />
                          <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>
                            Quotation Creation Restricted
                          </h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px', lineHeight: 1.5 }}>
                            Your assigned role is <strong>Editor</strong>. Pricing generation and formal client quotations require <strong>Agency Manager</strong> or <strong>Super Admin</strong> authorization.
                          </p>
                        </div>
                      </Card>
                    )}
                  </div>
                </TabsContent>


                {/* Tab 4: Projects (Creative Studio Operations & Deliverables) */}
                <TabsContent value="projects">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                    {/* Left Column: Projects Directory & Progress Tracking */}
                    <Card className="contact-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>
                            Creative Studio Projects ({projectsList.length})
                          </h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                            Milestone deliveries, stage progression, and manual staff team assignments.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadProjects()}
                          disabled={projectsLoading}
                          title="Refresh projects list"
                        >
                          <RefreshCw size={13} className={projectsLoading ? 'animate-spin' : ''} />
                        </Button>
                      </div>

                      {/* Filters & Search */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ position: 'relative' }}>
                          <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-dim)' }} />
                          <Input
                            placeholder="Search projects..."
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            style={{ paddingLeft: '32px' }}
                          />
                        </div>

                        <div>
                          <Select value={projectStatusFilter} onValueChange={(val) => setProjectStatusFilter(val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="All Stages" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Stages</SelectItem>
                              <SelectItem value="kickoff">Kickoff</SelectItem>
                              <SelectItem value="pre_production">Pre-Production</SelectItem>
                              <SelectItem value="production">Production</SelectItem>
                              <SelectItem value="post_editing">Post-Editing</SelectItem>
                              <SelectItem value="client_review">Client Review</SelectItem>
                              <SelectItem value="final_delivery">Final Delivery</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Select value={projectPriorityFilter} onValueChange={(val) => setProjectPriorityFilter(val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="All Priorities" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Priorities</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {projectsLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <Skeleton className="h-28 w-full" />
                          <Skeleton className="h-28 w-full" />
                          <Skeleton className="h-28 w-full" />
                        </div>
                      ) : projectsError ? (
                        <ErrorState
                          title="Failed to Load Projects"
                          message={projectsError}
                          onRetry={() => loadProjects()}
                        />
                      ) : projectsList.length === 0 ? (
                        <EmptyState
                          title="No Creative Projects Yet"
                          description="Initiate a project from an accepted quotation or qualified lead using the form on the right."
                        />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {projectsList
                            .filter((p) => {
                              if (projectSearch.trim()) {
                                const q = projectSearch.toLowerCase();
                                const match =
                                  p.project_code.toLowerCase().includes(q) ||
                                  p.title.toLowerCase().includes(q) ||
                                  p.client_name.toLowerCase().includes(q);
                                if (!match) return false;
                              }
                              if (projectStatusFilter !== 'all' && p.status !== projectStatusFilter) return false;
                              if (projectPriorityFilter !== 'all' && p.priority !== projectPriorityFilter) return false;
                              return true;
                            })
                            .map((p) => {
                              const completedDeliverables = (p.deliverables || []).filter((d) => d.completed).length;
                              const totalDeliverables = (p.deliverables || []).length;

                              return (
                                <div
                                  key={p.id}
                                  onClick={() => handleOpenProject(p.project_code || p.id)}
                                  style={{
                                    background: 'var(--bg-deep)',
                                    border: '1px solid var(--border-muted)',
                                    borderRadius: '12px',
                                    padding: '16px 18px',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.2s ease, transform 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--cyan-accent)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border-muted)';
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--cyan-accent)', fontWeight: 700 }}>
                                          {p.project_code}
                                        </span>
                                        <Badge variant={getProjectPriorityBadgeVariant(p.priority)}>
                                          {p.priority.toUpperCase()}
                                        </Badge>
                                        <Badge variant={getProjectStatusBadgeVariant(p.status)}>
                                          {p.status.replace('_', ' ').toUpperCase()}
                                        </Badge>
                                      </div>
                                      <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: '2px 0 4px' }}>
                                        {p.title}
                                      </h4>
                                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        Client: <strong style={{ color: '#fff' }}>{p.client_name}</strong>
                                        {p.client_email && ` (${p.client_email})`}
                                      </span>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>
                                        Target: {p.target_delivery}
                                      </span>
                                      <span style={{ fontSize: '11px', color: 'var(--cyan-accent)', fontWeight: 600 }}>
                                        {p.progress_percentage}% completed
                                      </span>
                                    </div>
                                  </div>

                                  <div style={{ marginTop: '12px' }}>
                                    <ProgressBar value={p.progress_percentage} showPercentage={false} />
                                  </div>

                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      marginTop: '12px',
                                      paddingTop: '10px',
                                      borderTop: '1px solid rgba(255,255,255,0.06)',
                                      fontSize: '11px',
                                      color: 'var(--text-dim)'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <span>
                                        🎯 Deliverables: <strong style={{ color: '#fff' }}>{completedDeliverables}/{totalDeliverables}</strong>
                                      </span>
                                      <span>
                                        👥 Team: <strong style={{ color: '#fff' }}>{(p.assignments || []).length}</strong>
                                      </span>
                                    </div>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenProject(p.project_code || p.id);
                                      }}
                                      style={{ height: '24px', fontSize: '11px', color: 'var(--cyan-accent)' }}
                                      rightIcon={<ExternalLink size={11} />}
                                    >
                                      Inspect Project
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </Card>

                    {/* Right Column: Project Initiation Form or Role Restriction */}
                    {canManageQuotes ? (
                      <Card className="contact-card">
                        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                          Initiate Studio Project
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '18px' }}>
                          Launch a new production project from an approved quotation, qualified lead, or direct agreement.
                        </p>

                        <form onSubmit={handleCreateProject} className="contact-form">
                          {/* Quick Convert from Approved Quotation */}
                          <div style={{ marginBottom: '14px', background: 'rgba(0, 240, 255, 0.04)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '10px', padding: '12px' }}>
                            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: 'var(--cyan-accent)', fontWeight: 700 }}>
                              Optional: Convert from Approved Quotation
                            </label>
                            <Select
                              value={newProject.quotation_id}
                              onValueChange={(val) => {
                                if (!val || val === 'none') {
                                  setNewProject((prev) => ({ ...prev, quotation_id: '' }));
                                  return;
                                }
                                const selectedQ = quotations.find((q) => q.id === val || q.reference === val);
                                if (selectedQ) {
                                  setNewProject((prev) => ({
                                    ...prev,
                                    quotation_id: selectedQ.id,
                                    client_name: selectedQ.client_name,
                                    client_email: selectedQ.client_email || prev.client_email,
                                    title: `${selectedQ.service_type} - ${selectedQ.client_name}`,
                                    scope: selectedQ.scope,
                                    priority: 'high'
                                  }));
                                  toast.info(`Pre-filled project scope from Quotation ${selectedQ.reference}`);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select an approved quote to convert..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-- Direct Launch (No Quote Link) --</SelectItem>
                                {quotations
                                  .filter((q) => q.status === 'approved')
                                  .map((q) => (
                                    <SelectItem key={q.id} value={q.id}>
                                      {q.reference} • {q.client_name} ({q.currency} {q.amount})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Input
                            id="proj-title"
                            label="Project Title"
                            required
                            placeholder="e.g. YouTube AI Series Production & Motion Branding"
                            value={newProject.title}
                            onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                          />

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <Input
                              id="proj-client"
                              label="Client Name"
                              required
                              placeholder="e.g. Quantum Leap Labs"
                              value={newProject.client_name}
                              onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
                            />
                            <Input
                              id="proj-email"
                              label="Client Email (Optional)"
                              type="email"
                              placeholder="e.g. director@quantumleap.com"
                              value={newProject.client_email}
                              onChange={(e) => setNewProject({ ...newProject, client_email: e.target.value })}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                            <div style={{ marginBottom: '14px' }}>
                              <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                                Vertical / Creative Domain
                              </label>
                              <Select
                                value={newProject.vertical}
                                onValueChange={(val) => setNewProject({ ...newProject, vertical: val })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Vertical" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="video_production">Video Creation & Editing</SelectItem>
                                  <SelectItem value="shorts_reels">Topic to Video + Shorts Package</SelectItem>
                                  <SelectItem value="data_recovery">Pen Drive Physical Recovery</SelectItem>
                                  <SelectItem value="ai_consulting">AI Tools & Automation Consulting</SelectItem>
                                  <SelectItem value="branding">Brand Identity & Promotion</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                              <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                                Priority Level
                              </label>
                              <Select
                                value={newProject.priority}
                                onValueChange={(val) => setNewProject({ ...newProject, priority: val as ProjectPriority })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low Priority</SelectItem>
                                  <SelectItem value="medium">Medium Priority</SelectItem>
                                  <SelectItem value="high">High Priority</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Date Range Selection (Enforces target_delivery >= start_date) */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                            <div>
                              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>
                                Start Date <span style={{ color: '#ef4444' }}>*</span>
                              </label>
                              <Input
                                type="date"
                                required
                                value={newProject.start_date}
                                onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                              />
                            </div>

                            <div>
                              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>
                                Target Delivery Date <span style={{ color: '#ef4444' }}>*</span>
                              </label>
                              <Input
                                type="date"
                                required
                                min={newProject.start_date}
                                value={newProject.target_delivery}
                                onChange={(e) => setNewProject({ ...newProject, target_delivery: e.target.value })}
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: '14px' }}>
                            <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                              Initial Milestone Deliverable (Optional)
                            </label>
                            <Input
                              placeholder="e.g. Full rough cut timeline & raw assembly"
                              value={newProject.initial_deliverable}
                              onChange={(e) => setNewProject({ ...newProject, initial_deliverable: e.target.value })}
                            />
                          </div>

                          <div style={{ marginBottom: '14px' }}>
                            <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                              Scope of Work & Deliverables <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <Textarea
                              placeholder="Describe deliverables, technical specs (4K, ProRes, aspect ratios, revisions)..."
                              value={newProject.scope}
                              onChange={(e) => setNewProject({ ...newProject, scope: e.target.value })}
                              rows={3}
                              required
                            />
                          </div>

                          <div style={{ marginBottom: '16px' }}>
                            <Input
                              label="Google Drive / Assets URL (Optional)"
                              placeholder="https://drive.google.com/drive/folders/..."
                              value={newProject.drive_assets_url}
                              onChange={(e) => setNewProject({ ...newProject, drive_assets_url: e.target.value })}
                            />
                          </div>

                          <Button
                            type="submit"
                            variant="primary"
                            leftIcon={<Plus size={16} />}
                            disabled={projectSubmitting}
                            fullWidth
                          >
                            {projectSubmitting ? 'Launching Project...' : 'Launch Studio Project'}
                          </Button>
                        </form>
                      </Card>
                    ) : (
                      <Card className="contact-card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                          <Lock size={32} style={{ color: 'var(--text-dim)', margin: '0 auto 12px' }} />
                          <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>
                            Project Initiation Restricted
                          </h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px', lineHeight: 1.5 }}>
                            Your assigned role is <strong>Editor</strong>. Project initiation, team assignments, and stage transitions require <strong>Agency Manager</strong> or <strong>Super Admin</strong> authorization.
                          </p>
                        </div>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Tab: Protected Content Management System (CMS) & Media Storage */}
                <TabsContent value="content">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* CMS Header & Sub-Tab Navigation */}
                    <Card className="contact-card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 800 }}>
                            Studio Content Management & Media Storage
                          </h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
                            Draft, Published, and Archived lifecycle • Unique slug enforcement • Private curriculum protection • Validated media uploads
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadCmsContent()}
                          disabled={cmsLoading}
                          title="Refresh content directory"
                        >
                          <RefreshCw size={14} className={cmsLoading ? 'animate-spin' : ''} />
                        </Button>
                      </div>

                      {/* Sub-Tabs Pill Selector */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <Button
                          variant={cmsSubTab === 'services' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => setCmsSubTab('services')}
                          leftIcon={<Briefcase size={14} />}
                        >
                          Services ({cmsServices.length})
                        </Button>
                        <Button
                          variant={cmsSubTab === 'portfolio' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => setCmsSubTab('portfolio')}
                          leftIcon={<Video size={14} />}
                        >
                          Portfolio ({cmsPortfolio.length})
                        </Button>
                        <Button
                          variant={cmsSubTab === 'courses' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => setCmsSubTab('courses')}
                          leftIcon={<BookOpen size={14} />}
                        >
                          Courses ({cmsCourses.length})
                        </Button>
                        <Button
                          variant={cmsSubTab === 'media' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => setCmsSubTab('media')}
                          leftIcon={<UploadCloud size={14} />}
                        >
                          Media Storage ({cmsMedia.length})
                        </Button>
                      </div>
                    </Card>

                    {/* Sub-Tab 1: Services Management */}
                    {cmsSubTab === 'services' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                        <Card className="contact-card">
                          <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>
                            Services Directory ({cmsServices.length})
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {cmsServices.map((s) => (
                              <div
                                key={s.id}
                                style={{
                                  background: 'var(--bg-deep)',
                                  border: '1px solid var(--border-muted)',
                                  borderRadius: '10px',
                                  padding: '14px 16px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: '12px'
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <strong style={{ color: '#fff', fontSize: '14px' }}>{s.title}</strong>
                                    <Badge variant={getContentStatusBadgeVariant(s.status)}>
                                      {s.status.toUpperCase()}
                                    </Badge>
                                    <Badge variant="outline">{s.category}</Badge>
                                  </div>
                                  <span style={{ fontSize: '11px', color: 'var(--cyan-accent)', fontFamily: 'monospace' }}>
                                    /services/{s.slug}
                                  </span>
                                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0' }}>
                                    {s.description.slice(0, 90)}...
                                  </p>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {s.status !== 'published' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handlePublishService(s.id)}
                                      style={{ height: '28px', fontSize: '11px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                                    >
                                      Publish
                                    </Button>
                                  )}
                                  {s.status !== 'archived' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleArchiveService(s.id)}
                                      style={{ height: '28px', fontSize: '11px' }}
                                    >
                                      Archive
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteService(s.id)}
                                    style={{ height: '28px', fontSize: '11px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>

                        {/* Create Service Form */}
                        <Card className="contact-card">
                          <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                            Add Service Offering
                          </h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>
                            Unique slug enforced. New services can start in Draft mode before release.
                          </p>
                          <form onSubmit={handleCreateService} className="contact-form">
                            <Input
                              label="Service Title"
                              required
                              placeholder="e.g. 4K Drone Aerial Videography"
                              value={newServiceForm.title}
                              onChange={(e) => {
                                const title = e.target.value;
                                const generatedSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                setNewServiceForm({
                                  ...newServiceForm,
                                  title,
                                  slug: newServiceForm.slug ? newServiceForm.slug : generatedSlug
                                });
                              }}
                            />

                            <Input
                              label="Unique Slug (URL path)"
                              required
                              placeholder="e.g. drone-aerial-videography"
                              value={newServiceForm.slug}
                              onChange={(e) => setNewServiceForm({ ...newServiceForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div style={{ marginBottom: '14px' }}>
                                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>
                                  Category
                                </label>
                                <Select
                                  value={newServiceForm.category}
                                  onValueChange={(val) => setNewServiceForm({ ...newServiceForm, category: val })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Video">Video</SelectItem>
                                    <SelectItem value="Social Media">Social Media</SelectItem>
                                    <SelectItem value="Promotion">Promotion</SelectItem>
                                    <SelectItem value="Tech">Tech</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div style={{ marginBottom: '14px' }}>
                                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>
                                  Lifecycle Status
                                </label>
                                <Select
                                  value={newServiceForm.status || 'draft'}
                                  onValueChange={(val) => setNewServiceForm({ ...newServiceForm, status: val as ContentStatus })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="draft">Draft (Protected)</SelectItem>
                                    <SelectItem value="published">Published (Live)</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <Textarea
                              label="Service Description"
                              required
                              placeholder="Detailed service scope, turnaround times, and client deliverables..."
                              value={newServiceForm.description}
                              onChange={(e) => setNewServiceForm({ ...newServiceForm, description: e.target.value })}
                              rows={3}
                            />

                            <Button
                              type="submit"
                              variant="primary"
                              disabled={contentSubmitting}
                              fullWidth
                            >
                              {contentSubmitting ? 'Saving Service...' : 'Create Service Offering'}
                            </Button>
                          </form>
                        </Card>
                      </div>
                    )}

                    {/* Sub-Tab 2: Portfolio Management */}
                    {cmsSubTab === 'portfolio' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                        <Card className="contact-card">
                          <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>
                            Portfolio Projects ({cmsPortfolio.length})
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {cmsPortfolio.map((p) => (
                              <div
                                key={p.id}
                                style={{
                                  background: 'var(--bg-deep)',
                                  border: '1px solid var(--border-muted)',
                                  borderRadius: '10px',
                                  padding: '14px 16px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: '12px'
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <strong style={{ color: '#fff', fontSize: '14px' }}>{p.title}</strong>
                                    <Badge variant={getContentStatusBadgeVariant(p.status)}>
                                      {p.status.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <span style={{ fontSize: '11px', color: 'var(--cyan-accent)', fontFamily: 'monospace' }}>
                                    /portfolio/{p.slug}
                                  </span>
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                                    Client: {p.client_name || 'Studio Original'} • {p.category}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {p.status !== 'published' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handlePublishPortfolio(p.id)}
                                      style={{ height: '28px', fontSize: '11px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                                    >
                                      Publish
                                    </Button>
                                  )}
                                  {p.status !== 'archived' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleArchivePortfolio(p.id)}
                                      style={{ height: '28px', fontSize: '11px' }}
                                    >
                                      Archive
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeletePortfolio(p.id)}
                                    style={{ height: '28px', fontSize: '11px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>

                        {/* Create Portfolio Form */}
                        <Card className="contact-card">
                          <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                            Add Portfolio Item
                          </h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>
                            Showcase case study with metrics, video embed link, and unique slug.
                          </p>
                          <form onSubmit={handleCreatePortfolio} className="contact-form">
                            <Input
                              label="Case Study Title"
                              required
                              placeholder="e.g. Fintech Explainer Series Launch"
                              value={newPortfolioForm.title}
                              onChange={(e) => {
                                const title = e.target.value;
                                const generatedSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                setNewPortfolioForm({
                                  ...newPortfolioForm,
                                  title,
                                  slug: newPortfolioForm.slug ? newPortfolioForm.slug : generatedSlug
                                });
                              }}
                            />

                            <Input
                              label="Unique Slug"
                              required
                              placeholder="e.g. fintech-explainer-series-launch"
                              value={newPortfolioForm.slug}
                              onChange={(e) => setNewPortfolioForm({ ...newPortfolioForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <Input
                                label="Client Name"
                                placeholder="e.g. Apex FinTech"
                                value={newPortfolioForm.client_name || ''}
                                onChange={(e) => setNewPortfolioForm({ ...newPortfolioForm, client_name: e.target.value })}
                              />

                              <div style={{ marginBottom: '14px' }}>
                                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>
                                  Category
                                </label>
                                <Select
                                  value={newPortfolioForm.category}
                                  onValueChange={(val) => setNewPortfolioForm({ ...newPortfolioForm, category: val })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="YouTube Videos">YouTube Videos</SelectItem>
                                    <SelectItem value="Shorts">Shorts & Reels</SelectItem>
                                    <SelectItem value="Business Promotion">Business Promotion</SelectItem>
                                    <SelectItem value="Social Media">Social Media</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>
                                Lifecycle Status
                              </label>
                              <Select
                                value={newPortfolioForm.status || 'draft'}
                                onValueChange={(val) => setNewPortfolioForm({ ...newPortfolioForm, status: val as ContentStatus })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft (Protected)</SelectItem>
                                  <SelectItem value="published">Published (Live)</SelectItem>
                                  <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <Button
                              type="submit"
                              variant="primary"
                              disabled={contentSubmitting}
                              fullWidth
                            >
                              {contentSubmitting ? 'Saving Portfolio...' : 'Add Portfolio Item'}
                            </Button>
                          </form>
                        </Card>
                      </div>
                    )}

                    {/* Sub-Tab 3: Courses & Lessons Management */}
                    {cmsSubTab === 'courses' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                        <Card className="contact-card">
                          <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>
                            MarsNova Lab Courses ({cmsCourses.length})
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {cmsCourses.map((c) => (
                              <div
                                key={c.id}
                                style={{
                                  background: 'var(--bg-deep)',
                                  border: selectedCourseForLessons === c.id ? '1px solid var(--cyan-accent)' : '1px solid var(--border-muted)',
                                  borderRadius: '10px',
                                  padding: '14px 16px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: '12px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleCourseSelectForLessons(c.id)}
                              >
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <strong style={{ color: '#fff', fontSize: '14px' }}>{c.title}</strong>
                                    <Badge variant={getContentStatusBadgeVariant(c.status)}>
                                      {c.status.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <span style={{ fontSize: '11px', color: 'var(--cyan-accent)', fontFamily: 'monospace' }}>
                                    /courses/{c.slug}
                                  </span>
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                                    {c.category} • {c.duration || '6 Weeks'}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                                  {c.status !== 'published' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handlePublishCourse(c.id)}
                                      style={{ height: '28px', fontSize: '11px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                                    >
                                      Publish
                                    </Button>
                                  )}
                                  {c.status !== 'archived' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleArchiveCourse(c.id)}
                                      style={{ height: '28px', fontSize: '11px' }}
                                    >
                                      Archive
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteCourse(c.id)}
                                    style={{ height: '28px', fontSize: '11px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Selected Course's Lessons Section */}
                          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <h5 style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>
                                Curriculum Lessons ({cmsLessons.length})
                              </h5>
                              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                Private lessons protected from unauthorized public access
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                              {cmsLessons.map((l) => (
                                <div
                                  key={l.id}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid var(--border-muted)',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '10px'
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700 }}>#{l.lesson_order}</span>
                                      <strong style={{ color: '#fff', fontSize: '13px' }}>{l.title}</strong>
                                      <Badge variant={getContentStatusBadgeVariant(l.status)}>
                                        {l.status.toUpperCase()}
                                      </Badge>
                                      <Badge variant={l.is_free_preview ? 'cyan' : 'purple'}>
                                        {l.is_free_preview ? 'FREE PREVIEW' : 'PRIVATE CONTENT'}
                                      </Badge>
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                                      Slug: {l.slug} • Duration: {l.duration_minutes}m
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {l.status !== 'published' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePublishLesson(l.id)}
                                        style={{ height: '24px', fontSize: '10px', color: '#10b981' }}
                                      >
                                        Publish
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteLesson(l.id)}
                                      style={{ height: '24px', fontSize: '10px', color: '#ef4444' }}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Add Lesson Form */}
                            <form onSubmit={handleCreateLesson} style={{ background: 'rgba(0, 240, 255, 0.03)', border: '1px solid rgba(0, 240, 255, 0.15)', borderRadius: '10px', padding: '14px' }}>
                              <h6 style={{ color: 'var(--cyan-accent)', fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>
                                Add Lesson to Selected Course
                              </h6>
                              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                <Input
                                  placeholder="Lesson Title"
                                  value={newLessonForm.title}
                                  onChange={(e) => {
                                    const title = e.target.value;
                                    const generatedSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                    setNewLessonForm({
                                      ...newLessonForm,
                                      title,
                                      slug: newLessonForm.slug ? newLessonForm.slug : generatedSlug
                                    });
                                  }}
                                  required
                                />
                                <Input
                                  placeholder="Unique Lesson Slug"
                                  value={newLessonForm.slug}
                                  onChange={(e) => setNewLessonForm({ ...newLessonForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                  required
                                />
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                <Select
                                  value={newLessonForm.is_free_preview ? 'free' : 'private'}
                                  onValueChange={(val) => setNewLessonForm({
                                    ...newLessonForm,
                                    is_free_preview: val === 'free',
                                    is_private: val === 'private'
                                  })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Access Permission" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="private">Private (Restricted to Staff/Learner)</SelectItem>
                                    <SelectItem value="free">Free Preview (Public Access)</SelectItem>
                                  </SelectContent>
                                </Select>

                                <Select
                                  value={newLessonForm.status || 'draft'}
                                  onValueChange={(val) => setNewLessonForm({ ...newLessonForm, status: val as ContentStatus })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="published">Published</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <Input
                                placeholder="Video Streaming URL (Optional)"
                                value={newLessonForm.video_url || ''}
                                onChange={(e) => setNewLessonForm({ ...newLessonForm, video_url: e.target.value })}
                                style={{ marginBottom: '10px' }}
                              />

                              <Textarea
                                placeholder="Lesson Content Markdown (Notes, code samples, exercises)..."
                                value={newLessonForm.content_markdown || ''}
                                onChange={(e) => setNewLessonForm({ ...newLessonForm, content_markdown: e.target.value })}
                                rows={2}
                                style={{ marginBottom: '10px' }}
                              />

                              <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                                disabled={contentSubmitting}
                                fullWidth
                              >
                                {contentSubmitting ? 'Adding Lesson...' : 'Add Lesson to Course'}
                              </Button>
                            </form>
                          </div>
                        </Card>

                        {/* Create Course Form */}
                        <Card className="contact-card">
                          <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                            Add New Course
                          </h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>
                            Create a MarsNova Lab masterclass with custom category, level, and unique URL slug.
                          </p>
                          <form onSubmit={handleCreateCourse} className="contact-form">
                            <Input
                              label="Course Title"
                              required
                              placeholder="e.g. AI Prompting & Video Automation"
                              value={newCourseForm.title}
                              onChange={(e) => {
                                const title = e.target.value;
                                const generatedSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                setNewCourseForm({
                                  ...newCourseForm,
                                  title,
                                  slug: newCourseForm.slug ? newCourseForm.slug : generatedSlug
                                });
                              }}
                            />

                            <Input
                              label="Unique Slug"
                              required
                              placeholder="e.g. ai-prompting-video-automation"
                              value={newCourseForm.slug}
                              onChange={(e) => setNewCourseForm({ ...newCourseForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div style={{ marginBottom: '14px' }}>
                                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>
                                  Category
                                </label>
                                <Select
                                  value={newCourseForm.category}
                                  onValueChange={(val) => setNewCourseForm({ ...newCourseForm, category: val })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Creative Production">Creative Production</SelectItem>
                                    <SelectItem value="AI & Tech">AI & Tech</SelectItem>
                                    <SelectItem value="Foundations">Foundations</SelectItem>
                                    <SelectItem value="Design & Branding">Design & Branding</SelectItem>
                                    <SelectItem value="Marketing & Growth">Marketing & Growth</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div style={{ marginBottom: '14px' }}>
                                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>
                                  Lifecycle Status
                                </label>
                                <Select
                                  value={newCourseForm.status || 'draft'}
                                  onValueChange={(val) => setNewCourseForm({ ...newCourseForm, status: val as ContentStatus })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="draft">Draft (Protected)</SelectItem>
                                    <SelectItem value="published">Published (Live)</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <Textarea
                              label="Course Overview & Description"
                              required
                              placeholder="Hands-on learning outcomes, prerequisites, and software stack..."
                              value={newCourseForm.description}
                              onChange={(e) => setNewCourseForm({ ...newCourseForm, description: e.target.value })}
                              rows={3}
                            />

                            <Button
                              type="submit"
                              variant="primary"
                              disabled={contentSubmitting}
                              fullWidth
                            >
                              {contentSubmitting ? 'Creating Course...' : 'Create Course'}
                            </Button>
                          </form>
                        </Card>
                      </div>
                    )}

                    {/* Sub-Tab 4: Media Storage & Uploads */}
                    {cmsSubTab === 'media' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                        <Card className="contact-card">
                          <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>
                            Media Storage Directory ({cmsMedia.length})
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {cmsMedia.length === 0 ? (
                              <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                                No media files uploaded yet. Upload a media asset using the form on the right.
                              </p>
                            ) : (
                              cmsMedia.map((m) => (
                                <div
                                  key={m.id}
                                  style={{
                                    background: 'var(--bg-deep)',
                                    border: '1px solid var(--border-muted)',
                                    borderRadius: '10px',
                                    padding: '14px 16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '12px'
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                      <strong style={{ color: '#fff', fontSize: '13px' }}>{m.file_name}</strong>
                                      <Badge variant={m.is_private ? 'purple' : 'cyan'}>
                                        {m.is_private ? 'PRIVATE' : 'PUBLIC'}
                                      </Badge>
                                      <Badge variant="outline">{m.storage_provider}</Badge>
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                      {(m.file_size_bytes / 1024).toFixed(1)} KB • {m.mime_type} • By {m.uploaded_by}
                                    </span>
                                  </div>

                                  <a
                                    href={m.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--cyan-accent)', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <span>Access Asset</span>
                                    <ExternalLink size={12} />
                                  </a>
                                </div>
                              ))
                            )}
                          </div>
                        </Card>

                        {/* Upload Media Asset Form */}
                        <Card className="contact-card">
                          <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                            Upload Media Asset
                          </h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>
                            Configured storage with validated file formats (JPEG, PNG, WebP, SVG, MP4, WebM, PDF). Executable and unsafe files strictly rejected.
                          </p>
                          <form onSubmit={handleUploadMedia} className="contact-form">
                            <Input
                              label="File Name"
                              required
                              placeholder="e.g. masterclass_intro_reel.mp4"
                              value={newMediaForm.file_name}
                              onChange={(e) => setNewMediaForm({ ...newMediaForm, file_name: e.target.value })}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div style={{ marginBottom: '14px' }}>
                                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>
                                  MIME Type
                                </label>
                                <Select
                                  value={newMediaForm.mime_type}
                                  onValueChange={(val) => setNewMediaForm({ ...newMediaForm, mime_type: val })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select MIME" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="video/mp4">video/mp4</SelectItem>
                                    <SelectItem value="video/webm">video/webm</SelectItem>
                                    <SelectItem value="image/webp">image/webp</SelectItem>
                                    <SelectItem value="image/png">image/png</SelectItem>
                                    <SelectItem value="image/jpeg">image/jpeg</SelectItem>
                                    <SelectItem value="application/pdf">application/pdf</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <Input
                                label="File Size (Bytes)"
                                type="number"
                                required
                                value={String(newMediaForm.file_size_bytes)}
                                onChange={(e) => setNewMediaForm({ ...newMediaForm, file_size_bytes: Number(e.target.value) || 0 })}
                              />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>
                                Access Permission
                              </label>
                              <Select
                                value={newMediaForm.is_private ? 'private' : 'public'}
                                onValueChange={(val) => setNewMediaForm({ ...newMediaForm, is_private: val === 'private' })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Access Scope" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="public">Public Asset (Public Gallery / Thumbnails)</SelectItem>
                                  <SelectItem value="private">Private Asset (Restricted to Authenticated Staff)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <Button
                              type="submit"
                              variant="primary"
                              leftIcon={<UploadCloud size={16} />}
                              disabled={contentSubmitting}
                              fullWidth
                            >
                              {contentSubmitting ? 'Uploading Asset...' : 'Upload Media to Cloud Storage'}
                            </Button>
                          </form>
                        </Card>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 5: Recovery Lab Cases (Protected Forensic Dashboard) */}
                <TabsContent value="recovery">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Header & Metric Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <Card className="contact-card" style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Tracked Cases</span>
                        <h4 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                          {recoveryCases.length}
                        </h4>
                      </Card>

                      <Card className="contact-card" style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--yellow-accent, #ffaa00)' }}>Awaiting Physical Receipt</span>
                        <h4 style={{ fontSize: '24px', fontWeight: 800, color: '#ffaa00', marginTop: '4px' }}>
                          {recoveryCases.filter((c) => !c.physical_receipt_confirmed).length}
                        </h4>
                      </Card>

                      <Card className="contact-card" style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--cyan-accent)' }}>In Active Recovery</span>
                        <h4 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--cyan-accent)', marginTop: '4px' }}>
                          {recoveryCases.filter((c) => c.recovery_status === 'in_recovery').length}
                        </h4>
                      </Card>

                      <Card className="contact-card" style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--green-accent, #00ffaa)' }}>Completed / Returned</span>
                        <h4 style={{ fontSize: '24px', fontWeight: 800, color: '#00ffaa', marginTop: '4px' }}>
                          {recoveryCases.filter((c) => c.recovery_status === 'recovery_completed' || c.recovery_status === 'device_returned').length}
                        </h4>
                      </Card>
                    </div>

                    {/* Filter & Search Toolbar */}
                    <Card className="contact-card" style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
                          <Input
                            placeholder="Search by case ref, customer, or brand..."
                            value={recoverySearch}
                            onChange={(e) => {
                              setRecoverySearch(e.target.value);
                              loadRecoveryCases(recoveryFilterStatus, e.target.value);
                            }}
                            style={{ maxWidth: '320px' }}
                          />

                          <select
                            value={recoveryFilterStatus}
                            onChange={(e) => {
                              setRecoveryFilterStatus(e.target.value);
                              loadRecoveryCases(e.target.value, recoverySearch);
                            }}
                            style={{
                              padding: '10px 14px',
                              background: 'var(--bg-deep)',
                              border: '1px solid var(--border-muted)',
                              borderRadius: '8px',
                              color: '#fff',
                              fontSize: '13px'
                            }}
                          >
                            <option value="all">All Recovery Stages</option>
                            <option value="intake_submitted">Intake Submitted</option>
                            <option value="device_received">Device Received</option>
                            <option value="diagnosing">Diagnosing</option>
                            <option value="quote_pending">Quote Pending</option>
                            <option value="quote_approved">Quote Approved</option>
                            <option value="in_recovery">In Recovery</option>
                            <option value="recovery_completed">Recovery Completed</option>
                            <option value="device_returned">Device Returned</option>
                          </select>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadRecoveryCases()}
                          disabled={recoveryLoading}
                        >
                          <RefreshCw className={recoveryLoading ? 'animate-spin' : ''} size={14} style={{ marginRight: '6px' }} />
                          Refresh Cases
                        </Button>
                      </div>
                    </Card>

                    {/* Cases List */}
                    <Card className="contact-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>
                            Pen-Drive & Flash Forensic Case Directory
                          </h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                            Physical custody tracking, protected diagnostics, and quotation approval gates.
                          </p>
                        </div>
                        <Badge variant="cyan">{recoveryCases.length} Cases</Badge>
                      </div>

                      {recoveryLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-20 w-full" />
                          ))}
                        </div>
                      ) : recoveryCases.length === 0 ? (
                        <EmptyState
                          title="No Recovery Cases Found"
                          description="No cases match your filter criteria. Intakes submitted by clients will appear here automatically."
                        />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {recoveryCases.map((rc) => (
                            <div
                              key={rc.case_reference || rc.id}
                              style={{
                                background: 'var(--bg-deep)',
                                border: '1px solid var(--border-muted)',
                                borderRadius: '12px',
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '16px'
                              }}
                            >
                              <div style={{ maxWidth: '420px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '12px', color: 'var(--cyan-accent)', fontWeight: 800, letterSpacing: '0.5px' }}>
                                    {rc.case_reference || rc.case_id}
                                  </span>
                                  {rc.physical_receipt_confirmed ? (
                                    <Badge variant="success">Physical Receipt Confirmed</Badge>
                                  ) : (
                                    <Badge variant="secondary">Awaiting Physical Arrival</Badge>
                                  )}
                                  <Badge variant="purple">{rc.recovery_status.replace(/_/g, ' ')}</Badge>
                                </div>

                                <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: '2px 0' }}>
                                  {rc.device_brand} {rc.device_model || ''} ({rc.capacity_gb}GB)
                                </h4>

                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                                  <span>Customer: <strong style={{ color: '#fff' }}>{rc.customer_name}</strong></span>
                                  <span>Custody: <strong style={{ color: 'var(--cyan-accent)' }}>{rc.current_custody_location}</strong></span>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                <div style={{ fontSize: '13px', color: 'var(--text-white)' }}>
                                  <strong>{rc.files_recovered_count || 0}</strong> files recovered
                                </div>
                                <div style={{ width: '160px' }}>
                                  <ProgressBar value={rc.progress_percentage || 0} showPercentage={false} />
                                </div>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleOpenCaseInspector(rc)}
                                >
                                  Inspect Case & Custody
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* Case Inspector Dialog */}
                  <Dialog open={recoveryDialogOpen} onOpenChange={setRecoveryDialogOpen}>
                    <DialogContent style={{ maxWidth: '850px', maxHeight: '85vh', overflowY: 'auto' }}>
                      {selectedRecoveryCase && (
                        <div>
                          <DialogHeader>
                            <DialogTitle style={{ fontSize: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span>Case: {selectedRecoveryCase.case_reference || selectedRecoveryCase.case_id}</span>
                              <Badge variant="cyan">{selectedRecoveryCase.recovery_status.replace(/_/g, ' ')}</Badge>
                            </DialogTitle>
                            <DialogDescription style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                              Physical Custody Location: <strong>{selectedRecoveryCase.current_custody_location}</strong>
                            </DialogDescription>
                          </DialogHeader>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '20px' }}>
                            {/* Device & Customer Metadata */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: 'var(--bg-deep)', padding: '16px', borderRadius: '10px' }}>
                              <div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Customer</span>
                                <strong style={{ display: 'block', fontSize: '13px', color: '#fff' }}>
                                  {selectedRecoveryCase.customer_name}
                                </strong>
                                {selectedRecoveryCase.customer_phone && (
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {selectedRecoveryCase.customer_phone}
                                  </span>
                                )}
                              </div>

                              <div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Device Specs</span>
                                <strong style={{ display: 'block', fontSize: '13px', color: '#fff' }}>
                                  {selectedRecoveryCase.device_brand} ({selectedRecoveryCase.capacity_gb}GB)
                                </strong>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  FS: {selectedRecoveryCase.file_system || 'FAT32'}
                                </span>
                              </div>

                              <div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Failure Classification</span>
                                <strong style={{ display: 'block', fontSize: '13px', color: '#fff' }}>
                                  {selectedRecoveryCase.damage_type}
                                </strong>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  Delivery: {selectedRecoveryCase.delivery_method}
                                </span>
                              </div>

                              <div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quotation Status</span>
                                <strong style={{ display: 'block', fontSize: '13px', color: 'var(--cyan-accent)' }}>
                                  ₹{selectedRecoveryCase.quotation_amount?.toLocaleString() || '0'} ({selectedRecoveryCase.quotation_status})
                                </strong>
                              </div>
                            </div>

                            {/* Action 1: Physical Receipt Confirmation */}
                            <div style={{ border: '1px solid var(--border-muted)', borderRadius: '10px', padding: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                                  1. Actual Physical Device Receipt
                                </h4>
                                {selectedRecoveryCase.physical_receipt_confirmed ? (
                                  <Badge variant="success">Verified & In Custody</Badge>
                                ) : (
                                  <Badge variant="secondary">Not Received</Badge>
                                )}
                              </div>

                              {selectedRecoveryCase.physical_receipt_confirmed ? (
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                                  Received by <strong>{selectedRecoveryCase.received_by || 'Staff'}</strong> at {selectedRecoveryCase.received_at ? new Date(selectedRecoveryCase.received_at).toLocaleString() : 'N/A'}.
                                  <br />
                                  Condition Note: {selectedRecoveryCase.received_condition_notes || 'Anti-static logged.'}
                                </p>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                                    Confirm that the physical USB media has arrived at the counter or via courier parcel.
                                  </p>
                                  <Input
                                    placeholder="Intake condition note (e.g. Broken connector, scorch marks, clean)..."
                                    value={receiptNotes}
                                    onChange={(e) => setReceiptNotes(e.target.value)}
                                  />
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleConfirmPhysicalReceiptAction}
                                    disabled={recoveryActionSubmitting}
                                  >
                                    Confirm Physical Arrival & Log Anti-Static Custody
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Action 2: Diagnostic Assessment & Protected Internal Notes */}
                            <div style={{ border: '1px solid var(--border-muted)', borderRadius: '10px', padding: '16px' }}>
                              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                                2. Diagnostic Assessment (Protected Findings)
                              </h4>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                                    Diagnostic Complexity Level:
                                  </label>
                                  <select
                                    value={diagComplexity}
                                    onChange={(e) => setDiagComplexity(e.target.value as any)}
                                    style={{
                                      padding: '8px 12px',
                                      background: 'var(--bg-deep)',
                                      border: '1px solid var(--border-muted)',
                                      borderRadius: '6px',
                                      color: '#fff',
                                      fontSize: '13px'
                                    }}
                                  >
                                    <option value="standard">Standard Logical Rebuild</option>
                                    <option value="level2_chip_off">Level 2 Chip-Off NAND Desoldering</option>
                                    <option value="level3_monolithic">Level 3 Monolithic Micro-Soldering</option>
                                  </select>
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--purple-glow)', marginBottom: '4px' }}>
                                    Internal Diagnostic Notes (PROTECTED: Staff Only, Redacted from Client):
                                  </label>
                                  <Textarea
                                    rows={2}
                                    placeholder="NAND flash controller model, bad block counts, voltage rail readouts, pinout anomalies..."
                                    value={diagInternalNotes}
                                    onChange={(e) => setDiagInternalNotes(e.target.value)}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--cyan-accent)', marginBottom: '4px' }}>
                                    Public Diagnostic Summary (Safe for Client Tracking):
                                  </label>
                                  <Input
                                    placeholder="Client-facing overview of findings and recommended procedure..."
                                    value={diagPublicSummary}
                                    onChange={(e) => setDiagPublicSummary(e.target.value)}
                                  />
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleRecordDiagnosisAction}
                                  disabled={recoveryActionSubmitting}
                                >
                                  Save Diagnostic Findings
                                </Button>
                              </div>
                            </div>

                            {/* Action 3: Manual Quotation & Approval Gate */}
                            <div style={{ border: '1px solid var(--border-muted)', borderRadius: '10px', padding: '16px' }}>
                              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                                3. Manual Quotation & Approval Gate
                              </h4>
                              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                Strict Gate: Moving to 'In Recovery' is strictly locked by the backend until a quotation is issued and approved.
                              </p>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '13px', color: 'var(--text-white)' }}>Amount (₹):</span>
                                  <Input
                                    type="number"
                                    value={quoteAmount}
                                    onChange={(e) => setQuoteAmount(parseFloat(e.target.value) || 0)}
                                    style={{ width: '120px' }}
                                  />
                                </div>

                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={handleIssueQuotationAction}
                                  disabled={recoveryActionSubmitting}
                                >
                                  Issue Manual Quote
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDecideQuotationAction('approved')}
                                  disabled={recoveryActionSubmitting}
                                  style={{ borderColor: 'var(--green-accent, #00ffaa)', color: '#00ffaa' }}
                                >
                                  Client Approved
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDecideQuotationAction('rejected')}
                                  disabled={recoveryActionSubmitting}
                                  style={{ borderColor: '#ff4d4d', color: '#ff4d4d' }}
                                >
                                  Client Rejected
                                </Button>
                              </div>
                            </div>

                            {/* Action 4: Stage Transition Controls */}
                            <div style={{ border: '1px solid var(--border-muted)', borderRadius: '10px', padding: '16px' }}>
                              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                                4. Workflow Stage Transitions
                              </h4>

                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTransitionStatusAction('diagnosing')}
                                  disabled={recoveryActionSubmitting}
                                >
                                  Set: Diagnosing
                                </Button>

                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleTransitionStatusAction('in_recovery')}
                                  disabled={recoveryActionSubmitting}
                                >
                                  Begin Recovery Attempt (Gated)
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTransitionStatusAction('recovery_completed')}
                                  disabled={recoveryActionSubmitting}
                                  style={{ borderColor: 'var(--green-accent, #00ffaa)', color: '#00ffaa' }}
                                >
                                  Mark Recovery Completed
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTransitionStatusAction('recovery_unrecoverable')}
                                  disabled={recoveryActionSubmitting}
                                  style={{ borderColor: '#ff4d4d', color: '#ff4d4d' }}
                                >
                                  Mark Unrecoverable
                                </Button>
                              </div>
                            </div>

                            {/* Action 5: Custody Transfer */}
                            <div style={{ border: '1px solid var(--border-muted)', borderRadius: '10px', padding: '16px' }}>
                              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                                5. Physical Custody Transfer
                              </h4>
                              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <Input
                                  placeholder="New custody location (e.g. Cleanroom Solder Rig, Vault 02)..."
                                  value={custodyTransferLocation}
                                  onChange={(e) => setCustodyTransferLocation(e.target.value)}
                                  style={{ flex: 1, minWidth: '240px' }}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleTransferCustodyAction}
                                  disabled={recoveryActionSubmitting}
                                >
                                  Transfer Custody
                                </Button>
                              </div>
                            </div>

                            {/* Action 6: Device Return Handover */}
                            <div style={{ border: '1px solid var(--border-muted)', borderRadius: '10px', padding: '16px' }}>
                              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                                6. Physical Return & Courier Dispatch
                              </h4>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                                <Input
                                  placeholder="Courier / Handover mode..."
                                  value={returnCarrier}
                                  onChange={(e) => setReturnCarrier(e.target.value)}
                                />
                                <Input
                                  placeholder="Consignment / Tracking #..."
                                  value={returnTracking}
                                  onChange={(e) => setReturnTracking(e.target.value)}
                                />
                                <Input
                                  placeholder="Recipient name..."
                                  value={returnRecipient}
                                  onChange={(e) => setReturnRecipient(e.target.value)}
                                />
                              </div>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={handleReturnDeviceAction}
                                disabled={recoveryActionSubmitting}
                              >
                                Dispatch / Return Media to Client
                              </Button>
                            </div>

                            {/* Action 7: Full Audit History & Timeline */}
                            <div>
                              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
                                Full Custody & Event Ledger
                              </h4>
                              {selectedRecoveryCase.timeline && selectedRecoveryCase.timeline.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  {selectedRecoveryCase.timeline.map((ev, i) => (
                                    <div
                                      key={i}
                                      style={{
                                        background: 'var(--bg-deep)',
                                        border: '1px solid var(--border-muted)',
                                        borderRadius: '8px',
                                        padding: '10px 14px',
                                        fontSize: '13px'
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff' }}>
                                        <strong>{ev.status_title || ev.event_type}</strong>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                          {new Date(ev.recorded_at || ev.created_at).toLocaleString()}
                                        </span>
                                      </div>
                                      <p style={{ color: 'var(--text-muted)', margin: '4px 0' }}>
                                        {ev.status_description || ev.public_notes}
                                      </p>
                                      {ev.internal_diagnostic_notes && (
                                        <p style={{ color: 'var(--purple-glow)', fontSize: '12px', margin: '2px 0' }}>
                                          Staff Note: {ev.internal_diagnostic_notes}
                                        </p>
                                      )}
                                      {ev.custody_location && (
                                        <span style={{ fontSize: '11px', color: 'var(--cyan-accent)' }}>
                                          Custody: {ev.custody_location} (by {ev.actor_name})
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>No events recorded.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </TabsContent>

                {/* Tab 6: Staff & RBAC (Super Admin Exclusive) */}
                {isSuperAdmin && (
                  <TabsContent value="team">
                    <Card className="contact-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>
                            Staff Directory & RBAC Security Matrix
                          </h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                            Super Admin privilege controls, role assignments, and live status verification.
                          </p>
                        </div>
                        <Badge variant="purple">Super Admin Only</Badge>
                      </div>

                      <div style={{ border: '1px solid var(--border-muted)', borderRadius: '12px', overflow: 'hidden' }}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Staff Name</TableHead>
                              <TableHead>Email Address</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead style={{ textAlign: 'right' }}>Security Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {staffAccounts.map((account) => (
                              <TableRow key={account.id}>
                                <TableCell style={{ fontWeight: 600, color: '#fff' }}>
                                  {account.full_name}
                                </TableCell>
                                <TableCell style={{ color: 'var(--cyan-accent)', fontSize: '13px' }}>
                                  {account.email}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getRoleBadgeVariant(account.role)}>
                                    {account.role.replace('_', ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {account.status === 'active' ? (
                                    <Badge variant="success">Active</Badge>
                                  ) : account.status === 'suspended' ? (
                                    <Badge variant="destructive">Suspended</Badge>
                                  ) : (
                                    <Badge variant="secondary">{account.status}</Badge>
                                  )}
                                </TableCell>
                                <TableCell style={{ textAlign: 'right' }}>
                                  {account.status === 'active' ? (
                                    <span style={{ fontSize: '12px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <CheckCircle2 size={13} /> Authorized
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '12px', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <AlertCircle size={13} /> Login Denied
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </TabsContent>
                )}
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

          {/* Quotation Details & Revisions Dialog */}
          <Dialog open={!!selectedQuotationId} onOpenChange={(open) => !open && setSelectedQuotationId(null)}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <DialogTitle style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>
                    {selectedQuotation ? `Quotation ${selectedQuotation.reference}` : 'Quotation Details'}
                  </DialogTitle>
                  {selectedQuotation && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge variant={getQuotationStatusBadgeVariant(selectedQuotation.status)}>
                        {selectedQuotation.status.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">v{selectedQuotation.revision_number}</Badge>
                      {selectedQuotation.is_expired && (
                        <Badge variant="destructive">EXPIRED</Badge>
                      )}
                    </div>
                  )}
                </div>
                <DialogDescription style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Studio operational quotation record • No checkout, payment webhooks, or gateways.
                </DialogDescription>
              </DialogHeader>

              {quoteDetailsLoading ? (
                <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : selectedQuotation ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '12px' }}>
                  {/* Expiry Alert Banner */}
                  {selectedQuotation.is_expired && (
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                      <div style={{ fontSize: '13px', color: '#fff' }}>
                        <strong>Quotation Expired:</strong> Validity period expired on {selectedQuotation.valid_until}. Please issue a new revision with current scope & pricing to reactivate into Draft.
                      </div>
                    </div>
                  )}

                  {/* Metadata Grid */}
                  <div
                    style={{
                      background: 'var(--bg-deep)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '16px'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                        Client Name
                      </span>
                      <strong style={{ color: '#fff', fontSize: '14px', marginTop: '4px', display: 'block' }}>
                        {selectedQuotation.client_name}
                      </strong>
                      {selectedQuotation.client_email && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedQuotation.client_email}</span>
                      )}
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                        Service Type
                      </span>
                      <span style={{ color: 'var(--cyan-accent)', fontSize: '13px', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                        {selectedQuotation.service_type}
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                        Monetary Amount
                      </span>
                      <strong style={{ color: '#fff', fontSize: '16px', marginTop: '4px', display: 'block' }}>
                        {selectedQuotation.currency} {Number(selectedQuotation.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                        Validity Expiration
                      </span>
                      <span style={{ color: selectedQuotation.is_expired ? '#ef4444' : '#fff', fontSize: '13px', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                        {selectedQuotation.valid_until}
                      </span>
                    </div>
                  </div>

                  {/* Scope of Work */}
                  <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-muted)', borderRadius: '12px', padding: '16px 20px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
                      Scope of Work & Deliverables
                    </span>
                    <p style={{ color: '#fff', fontSize: '13px', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {selectedQuotation.scope}
                    </p>
                  </div>

                  {/* Terms & Payment Milestones */}
                  {selectedQuotation.terms && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-muted)', borderRadius: '10px', padding: '14px 18px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                        Payment Terms & Milestones
                      </span>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                        {selectedQuotation.terms}
                      </p>
                    </div>
                  )}

                  {/* Status Workflow Transition */}
                  {canManageQuotes && (
                    <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-muted)', borderRadius: '12px', padding: '18px 20px' }}>
                      <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
                        Status Workflow Transition
                      </h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '14px' }}>
                        Current status: <strong style={{ color: 'var(--cyan-accent)' }}>{selectedQuotation.status}</strong>. Valid transitions enforced by Drogon state machine.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr auto', gap: '12px', alignItems: 'end' }}>
                        <div>
                          <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                            Next Target Status
                          </label>
                          <Select value={targetQuoteStatus} onValueChange={(val) => setTargetQuoteStatus(val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={selectedQuotation.status}>No Change ({selectedQuotation.status})</SelectItem>
                              {getAllowedQuotationTransitions(selectedQuotation.status).map((nxt) => (
                                <SelectItem key={nxt} value={nxt}>
                                  {nxt.toUpperCase()}
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
                            placeholder="Reason for status change..."
                            value={quoteStatusNote}
                            onChange={(e) => setQuoteStatusNote(e.target.value)}
                          />
                        </div>

                        <Button
                          variant="primary"
                          onClick={handleUpdateQuoteStatus}
                          disabled={quoteStatusUpdating || targetQuoteStatus === selectedQuotation.status}
                        >
                          {quoteStatusUpdating ? 'Updating...' : 'Update Status'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Revisions History Timeline */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <History size={16} style={{ color: 'var(--cyan-accent)' }} />
                        <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: 0 }}>
                          Quotation Revisions History ({selectedQuotation.revisions?.length || 1})
                        </h4>
                      </div>
                      {canManageQuotes && selectedQuotation.status !== 'cancelled' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRevisionForm(!showRevisionForm)}
                        >
                          {showRevisionForm ? 'Cancel Revision' : 'Issue New Revision'}
                        </Button>
                      )}
                    </div>

                    {/* New Revision Form */}
                    {showRevisionForm && canManageQuotes && (
                      <form
                        onSubmit={handleCreateRevision}
                        style={{
                          background: 'rgba(0, 240, 255, 0.03)',
                          border: '1px solid rgba(0, 240, 255, 0.2)',
                          borderRadius: '12px',
                          padding: '16px 20px',
                          marginBottom: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <h5 style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: 0 }}>
                          Draft Revision v{selectedQuotation.revision_number + 1}
                        </h5>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>
                          Issuing a revision resets status to Draft and archives the current revision into history.
                        </p>

                        <div>
                          <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                            Updated Scope
                          </label>
                          <Textarea
                            value={newRevisionScope}
                            onChange={(e) => setNewRevisionScope(e.target.value)}
                            rows={3}
                            required
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <Input
                            label="Updated Amount (Decimal)"
                            value={newRevisionAmount}
                            onChange={(e) => setNewRevisionAmount(e.target.value)}
                            required
                          />
                          <Input
                            label="Change Summary"
                            placeholder="e.g. Scope expanded per client request"
                            value={newRevisionSummary}
                            onChange={(e) => setNewRevisionSummary(e.target.value)}
                            required
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowRevisionForm(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={revisionSubmitting}
                          >
                            {revisionSubmitting ? 'Saving Revision...' : 'Save & Issue Revision'}
                          </Button>
                        </div>
                      </form>
                    )}

                    {selectedQuotation.revisions && selectedQuotation.revisions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {selectedQuotation.revisions.map((rev) => (
                          <div
                            key={rev.id}
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
                                <Badge variant="outline">v{rev.revision_number}</Badge>
                                <strong style={{ color: '#fff', fontSize: '13px' }}>
                                  {rev.currency} {Number(rev.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </strong>
                              </div>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                {rev.change_summary || rev.scope.slice(0, 80) + '...'}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                                Created by: {rev.created_by || 'Staff'} • Until: {rev.valid_until}
                              </span>
                            </div>

                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {new Date(rev.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Initial revision v1.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>

          {/* Creative Project Details, Milestones & Staff Assignments Dialog */}
          <Dialog open={!!selectedProjectId} onOpenChange={(open) => !open && setSelectedProjectId(null)}>
            <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
              <DialogHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <DialogTitle style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>
                      {selectedProject ? `${selectedProject.project_code} • ${selectedProject.title}` : 'Project Details'}
                    </DialogTitle>
                    <DialogDescription style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
                      Studio production milestones, staff assignments, and verified audit history.
                    </DialogDescription>
                  </div>

                  {selectedProject && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge variant={getProjectPriorityBadgeVariant(selectedProject.priority)}>
                        {selectedProject.priority.toUpperCase()} PRIORITY
                      </Badge>
                      <Badge variant={getProjectStatusBadgeVariant(selectedProject.status)}>
                        {selectedProject.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  )}
                </div>
              </DialogHeader>

              {projectDetailsLoading ? (
                <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : selectedProject ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '12px' }}>
                  {/* Overview Grid */}
                  <div
                    style={{
                      background: 'var(--bg-deep)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '16px'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                        Client Details
                      </span>
                      <strong style={{ color: '#fff', fontSize: '14px', marginTop: '4px', display: 'block' }}>
                        {selectedProject.client_name}
                      </strong>
                      {selectedProject.client_email && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedProject.client_email}</span>
                      )}
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                        Vertical & References
                      </span>
                      <span style={{ color: 'var(--cyan-accent)', fontSize: '13px', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                        {selectedProject.vertical.replace('_', ' ')}
                      </span>
                      {selectedProject.quotation_id && (
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>
                          Quote Ref: {selectedProject.quotation_id}
                        </span>
                      )}
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                        Timeline Range
                      </span>
                      <strong style={{ color: '#fff', fontSize: '13px', marginTop: '4px', display: 'block' }}>
                        {selectedProject.start_date} → {selectedProject.target_delivery}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block' }}>
                        Stage Progress
                      </span>
                      <div style={{ marginTop: '4px' }}>
                        <ProgressBar value={selectedProject.progress_percentage} showPercentage={true} />
                      </div>
                    </div>
                  </div>

                  {/* Scope of Work */}
                  <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-muted)', borderRadius: '12px', padding: '16px 20px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
                      Scope of Production & Deliverables
                    </span>
                    <p style={{ color: '#fff', fontSize: '13px', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {selectedProject.scope}
                    </p>
                    {selectedProject.drive_assets_url && (
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <a
                          href={selectedProject.drive_assets_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--cyan-accent)', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <HardDrive size={13} />
                          Open Project Cloud Assets Folder
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Stage Workflow Transition Manager */}
                  <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-muted)', borderRadius: '12px', padding: '16px 20px' }}>
                    <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
                      Stage Workflow Progression
                    </h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '14px' }}>
                      Current stage: <strong style={{ color: 'var(--cyan-accent)' }}>{selectedProject.status.replace('_', ' ').toUpperCase()}</strong>. Transitions strictly enforced by Drogon backend state machine.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr auto', gap: '12px', alignItems: 'end' }}>
                      <div>
                        <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                          Next Stage
                        </label>
                        <Select value={targetProjStatus} onValueChange={(val) => setTargetProjStatus(val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Next Stage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={selectedProject.status}>No Change ({selectedProject.status})</SelectItem>
                            {getAllowedProjectTransitions(selectedProject.status).map((nxt) => (
                              <SelectItem key={nxt} value={nxt}>
                                {nxt.replace('_', ' ').toUpperCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                          Audit Transition Note (Optional)
                        </label>
                        <Input
                          placeholder="e.g. Color grading locked, proceeding to client review..."
                          value={projStatusNote}
                          onChange={(e) => setProjStatusNote(e.target.value)}
                        />
                      </div>

                      <Button
                        variant="primary"
                        onClick={handleUpdateProjectStatus}
                        disabled={projectStatusUpdating || targetProjStatus === selectedProject.status || currentUser?.role === 'editor'}
                      >
                        {projectStatusUpdating ? 'Updating...' : 'Transition Stage'}
                      </Button>
                    </div>

                    {currentUser?.role === 'editor' && (
                      <p style={{ color: 'var(--text-dim)', fontSize: '11px', marginTop: '10px' }}>
                        * Notice: Editors have read-only inspection access. Stage progression requires Agency Manager or Super Admin role.
                      </p>
                    )}
                  </div>

                  {/* Deliverables Milestones Section */}
                  <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-muted)', borderRadius: '12px', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>
                        Milestone Deliverables ({(selectedProject.deliverables || []).length})
                      </h4>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                      {(selectedProject.deliverables || []).map((d) => (
                        <div
                          key={d.id}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--border-muted)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CheckSquare size={16} style={{ color: d.completed ? '#10b981' : 'var(--text-dim)' }} />
                            <div>
                              <strong style={{ color: d.completed ? '#10b981' : '#fff', fontSize: '13px' }}>
                                {d.title}
                              </strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>
                                Due Date: {d.due_date}
                              </span>
                            </div>
                          </div>

                          <Badge variant={d.completed ? 'success' : 'outline'}>
                            {d.completed ? 'COMPLETED' : d.status.toUpperCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {/* Add Milestone Deliverable Form */}
                    {canManageQuotes && (
                      <form onSubmit={handleAddDeliverable} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr auto', gap: '10px', alignItems: 'end', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div>
                          <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                            New Deliverable Title
                          </label>
                          <Input
                            placeholder="e.g. 9:16 Vertical Cutdowns for Reels"
                            value={newDeliverableTitle}
                            onChange={(e) => setNewDeliverableTitle(e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                            Milestone Due Date
                          </label>
                          <Input
                            type="date"
                            value={newDeliverableDueDate}
                            onChange={(e) => setNewDeliverableDueDate(e.target.value)}
                          />
                        </div>

                        <Button
                          type="submit"
                          variant="secondary"
                          disabled={addingDeliverable || !newDeliverableTitle.trim()}
                        >
                          {addingDeliverable ? 'Adding...' : 'Add Deliverable'}
                        </Button>
                      </form>
                    )}
                  </div>

                  {/* Manual Staff Assignments Section */}
                  <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-muted)', borderRadius: '12px', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>
                        Manual Team Staff Assignments ({(selectedProject.assignments || []).length})
                      </h4>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                      {(selectedProject.assignments || []).map((asgn) => (
                        <div
                          key={asgn.id}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--border-muted)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '6px', borderRadius: '6px' }}>
                              <Users size={15} style={{ color: 'var(--purple-glow)' }} />
                            </div>
                            <div>
                              <strong style={{ color: '#fff', fontSize: '13px' }}>
                                {asgn.assigned_user_name}
                              </strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                                {asgn.assigned_user_email} • Assigned {new Date(asgn.assigned_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Badge variant="purple">
                              {asgn.role_in_project.replace('_', ' ').toUpperCase()}
                            </Badge>

                            {canManageQuotes && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveStaff(asgn.id || asgn.assigned_user_id)}
                                style={{ height: '26px', fontSize: '11px', padding: '0 8px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                                title="Remove team member"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Assign Staff Form (Validates against active staff accounts, rejecting suspended users) */}
                    {canManageQuotes && (
                      <form onSubmit={handleAssignStaff} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '10px', alignItems: 'end', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div>
                          <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                            Assign Active Team Member
                          </label>
                          <Select value={assignUserId} onValueChange={(val) => setAssignUserId(val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select active staff user..." />
                            </SelectTrigger>
                            <SelectContent>
                              {staffAccounts
                                .filter((s) => s.status === 'active')
                                .map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.full_name} ({s.email}) - {s.role.replace('_', ' ')}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                            Role in Project
                          </label>
                          <Select value={assignRole} onValueChange={(val) => setAssignRole(val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lead_editor">Lead Video Editor</SelectItem>
                              <SelectItem value="video_editor">Video Editor</SelectItem>
                              <SelectItem value="motion_designer">Motion Designer</SelectItem>
                              <SelectItem value="colorist">Colorist</SelectItem>
                              <SelectItem value="sound_engineer">Sound Engineer</SelectItem>
                              <SelectItem value="creative_director">Creative Director</SelectItem>
                              <SelectItem value="project_manager">Project Manager</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="submit"
                          variant="primary"
                          disabled={assigningStaff || !assignUserId}
                        >
                          {assigningStaff ? 'Assigning...' : 'Assign Staff'}
                        </Button>
                      </form>
                    )}
                  </div>

                  {/* Audited Project Activity Timeline */}
                  <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-muted)', borderRadius: '12px', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <History size={16} style={{ color: 'var(--cyan-accent)' }} />
                      <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>
                        Audited Project Changes History
                      </h4>
                    </div>

                    {(selectedProject.activities || []).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {(selectedProject.activities || []).map((act) => (
                          <div
                            key={act.id}
                            style={{
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid var(--border-muted)',
                              borderRadius: '8px',
                              padding: '10px 14px',
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
                                <Badge variant={act.activity_type === 'status_change' ? 'cyan' : act.activity_type === 'staff_assigned' ? 'purple' : 'secondary'}>
                                  {act.activity_type.replace('_', ' ')}
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
                      <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>No recorded changes yet.</p>
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
