import {
  EnquiryPayload,
  RecoveryCase,
  ServiceItem,
  CourseItem,
  WorkItem,
  PaginationMeta,
  StaffUser,
  AuthSession,
  LoginCredentials,
  AdminOverviewStats,
  LeadRecord,
  LeadPagination,
  LeadQueryParams,
  LeadActivity,
  LeadSubmissionResult,
  LeadNotificationRecord,
  QuotationRecord,
  QuotationStatus,
  QuotationRevision,
  CreateQuotationPayload,
  CreateRevisionPayload,
  QuotationQueryParams,
  QuotationPagination,
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
  CreateServicePayload,
  CreatePortfolioPayload,
  CreateCoursePayload,
  CreateLessonPayload,
  MediaUploadPayload,
  ContentStatus,
  RecoveryCaseRecord,
  RecoveryIntakePayload,
  PhysicalReceiptPayload,
  CaseDiagnosisPayload,
  CaseQuotationPayload,
  CaseQuotationDecisionPayload,
  CaseStatusTransitionPayload,
  CaseCustodyTransferPayload,
  CaseReturnPayload
} from './types';
import { servicesData, workPortfolioData, coursesData } from './data';

// =============================================================================
// 1. Environment Configuration & Base URL
// =============================================================================
// Prioritizes VITE_API_BASE_URL as required, then VITE_API_BASE, then the same-origin path /api/v1.
// The same-origin default is right behind the nginx gateway in production and through the Vite
// dev proxy locally. It used to fall back to http://localhost:8080/api/v1, which the Docker build
// baked into the production bundle (its build arg defaults to ""), so every visitor's browser
// tried to call its own machine.
const RAW_API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  '/api/v1';

export const API_BASE_URL = RAW_API_BASE.replace(/\/+$/, '');
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '917208591595';

// =============================================================================
// 2. Typed Error Hierarchy
// =============================================================================
export class ApiError extends Error {
  public status: number;
  public code: string;
  public requestId?: string;

  constructor(message: string, status = 500, code = 'API_ERROR', requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Network connection failed. Backend server may be offline.') {
    super(message, 0, 'NETWORK_ERROR');
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Requested resource was not found.') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class MalformedResponseError extends ApiError {
  constructor(message = 'Server returned an invalid or malformed response.') {
    super(message, 502, 'MALFORMED_RESPONSE');
    this.name = 'MalformedResponseError';
    Object.setPrototypeOf(this, MalformedResponseError.prototype);
  }
}

// =============================================================================
// 3. API Types & Request Options
// =============================================================================
export interface ApiResponse<T> {
  status: 'ok' | 'error';
  data: T;
  pagination?: PaginationMeta;
  request_id?: string;
  error?: string;
  code?: string;
}

export interface QueryCatalogParams {
  category?: string;
  page?: number;
  limit?: number;
}

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface EnquirySubmissionResult {
  success: boolean;
  status: 'saved_to_server' | 'offline_queued';
  message: string;
  whatsappUrl: string;
  enquiryId?: string;
}

// =============================================================================
// 4. Safe Request Engine (Never silently falls back to mock data in production)
// =============================================================================
async function safeFetch<T>(
  endpoint: string,
  options: RequestOptions & { method?: string; body?: any } = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  let res: Response;

  try {
    res = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal
    });
  } catch (err: any) {
    if (err.name === 'AbortError' || options.signal?.aborted) {
      throw err; // Re-throw abort signal to prevent unhandled rejection
    }
    // Network failure: Backend unreachable, DNS failure, or CORS block
    throw new NetworkError(
      `Network request failed to ${endpoint}. Is the MarsNova Drogon backend running on ${API_BASE_URL}?`
    );
  }

  // Handle 404
  if (res.status === 404) {
    let notFoundMsg = `Resource at ${endpoint} was not found.`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.error) notFoundMsg = errJson.error;
    } catch {
      // ignore
    }
    throw new NotFoundError(notFoundMsg);
  }

  // Parse JSON response safely
  let json: any;
  try {
    json = await res.json();
  } catch (parseErr: any) {
    throw new MalformedResponseError(
      `Server returned invalid JSON response for ${endpoint} (HTTP ${res.status}).`
    );
  }

  // Handle non-2xx status codes
  if (!res.ok) {
    const errorMsg = json?.error || `Request failed with HTTP status ${res.status}`;
    const errorCode = json?.code || 'SERVER_ERROR';
    const requestId = json?.request_id || res.headers.get('X-Request-Id') || undefined;
    throw new ApiError(errorMsg, res.status, errorCode, requestId);
  }

  // Validate envelope structure: must have 'data' property
  if (!json || typeof json !== 'object' || !('data' in json)) {
    throw new MalformedResponseError(
      `Malformed API response from ${endpoint}: missing 'data' envelope.`
    );
  }

  return json as ApiResponse<T>;
}

// =============================================================================
// 5. Catalog Normalizers (Merges backend core data with client rich assets)
// =============================================================================
function normalizeService(s: any): ServiceItem {
  const slug = s.slug || s.id;
  // Enrich with detailed client-side metadata if available
  const localMatch = servicesData.find((item) => item.id === slug || item.id === s.id);

  return {
    id: s.id || slug,
    slug: slug,
    title: s.title || localMatch?.title || 'Service',
    category: s.category || localMatch?.category || 'Video',
    description: s.description || localMatch?.description || '',
    icon: s.icon || localMatch?.icon || 'Video',
    badge: s.badge || localMatch?.badge,
    is_active: s.is_active !== undefined ? s.is_active : true,
    longDescription: localMatch?.longDescription,
    features: localMatch?.features,
    deliverables: localMatch?.deliverables,
    idealFor: localMatch?.idealFor,
    turnaroundTime: localMatch?.turnaroundTime
  };
}

function normalizeWorkItem(w: any): WorkItem {
  const slug = w.slug || w.id;
  const localMatch = workPortfolioData.find((item) => item.id === slug || item.id === w.id);

  return {
    id: w.id || slug,
    slug: slug,
    title: w.title || localMatch?.title || 'Project',
    category: w.category || localMatch?.category || 'YouTube Videos',
    thumbnailUrl: w.thumbnail_url || w.thumbnailUrl || localMatch?.thumbnailUrl || '',
    videoUrl: w.videoUrl || localMatch?.videoUrl,
    tag: w.format || w.tag || localMatch?.tag || 'Case Study',
    format: w.format || localMatch?.tag,
    client: w.client_industry || w.client || localMatch?.client,
    client_industry: w.client_industry,
    summary: w.description || localMatch?.summary,
    challenge: localMatch?.challenge,
    approach: localMatch?.approach,
    outcome: localMatch?.outcome,
    metrics: localMatch?.metrics,
    deliverables: localMatch?.deliverables,
    tools: localMatch?.tools,
    is_published: w.is_published !== undefined ? w.is_published : true
  };
}

function normalizeCourse(c: any): CourseItem {
  const slug = c.slug || c.id;
  const localMatch = coursesData.find(
    (item) => item.id === slug || item.id === c.id || item.id.replace(/-course$/, '') === slug
  );

  return {
    id: c.id || slug,
    slug: slug,
    title: c.title || localMatch?.title || 'Course',
    category: c.category || localMatch?.category || 'Foundations',
    description: c.description || localMatch?.description || '',
    icon: c.icon || localMatch?.icon || 'Monitor',
    level: c.badge || localMatch?.level || 'Beginner',
    badge: c.badge || localMatch?.level,
    duration: c.duration || localMatch?.duration,
    format: localMatch?.format,
    overview: localMatch?.overview || c.description,
    learningOutcomes: localMatch?.learningOutcomes,
    curriculum: localMatch?.curriculum,
    prerequisites: localMatch?.prerequisites,
    targetAudience: localMatch?.targetAudience,
    is_published: c.is_published !== undefined ? c.is_published : true
  };
}

// =============================================================================
// 6. Typed API Client Methods
// =============================================================================
export const apiClient = {
  /**
   * GET /api/v1/services
   */
  async getServices(
    params?: QueryCatalogParams,
    options?: RequestOptions
  ): Promise<{ data: ServiceItem[]; pagination: PaginationMeta }> {
    const q = new URLSearchParams();
    if (params?.category && params.category !== 'All') q.set('category', params.category);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    const res = await safeFetch<any[]>(`/services${queryStr}`, options);

    const items = Array.isArray(res.data) ? res.data.map(normalizeService) : [];
    const pagination: PaginationMeta = res.pagination || {
      page: params?.page || 1,
      limit: params?.limit || items.length,
      total: items.length,
      total_pages: 1
    };

    return { data: items, pagination };
  },

  /**
   * GET /api/v1/services/:slug
   */
  async getServiceBySlug(slug: string, options?: RequestOptions): Promise<ServiceItem> {
    const cleanSlug = encodeURIComponent(slug.trim());
    const res = await safeFetch<any>(`/services/${cleanSlug}`, options);
    return normalizeService(res.data);
  },

  /**
   * GET /api/v1/portfolio
   */
  async getPortfolio(
    params?: QueryCatalogParams,
    options?: RequestOptions
  ): Promise<{ data: WorkItem[]; pagination: PaginationMeta }> {
    const q = new URLSearchParams();
    if (params?.category && params.category !== 'All') q.set('category', params.category);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    const res = await safeFetch<any[]>(`/portfolio${queryStr}`, options);

    const items = Array.isArray(res.data) ? res.data.map(normalizeWorkItem) : [];
    const pagination: PaginationMeta = res.pagination || {
      page: params?.page || 1,
      limit: params?.limit || items.length,
      total: items.length,
      total_pages: 1
    };

    return { data: items, pagination };
  },

  /**
   * GET /api/v1/courses
   */
  async getCourses(
    params?: QueryCatalogParams,
    options?: RequestOptions
  ): Promise<{ data: CourseItem[]; pagination: PaginationMeta }> {
    const q = new URLSearchParams();
    if (params?.category && params.category !== 'All') q.set('category', params.category);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    const res = await safeFetch<any[]>(`/courses${queryStr}`, options);

    const items = Array.isArray(res.data) ? res.data.map(normalizeCourse) : [];
    const pagination: PaginationMeta = res.pagination || {
      page: params?.page || 1,
      limit: params?.limit || items.length,
      total: items.length,
      total_pages: 1
    };

    return { data: items, pagination };
  },

  /**
   * GET /api/v1/courses/:slug
   */
  async getCourseBySlug(slug: string, options?: RequestOptions): Promise<CourseItem> {
    const cleanSlug = encodeURIComponent(slug.trim());
    const res = await safeFetch<any>(`/courses/${cleanSlug}`, options);
    return normalizeCourse(res.data);
  },

  /**
   * POST /api/v1/enquiries
   */
  submitEnquiry,

  /**
   * GET /api/v1/recovery/:caseId
   */
  trackRecoveryCase
};

// =============================================================================
// 7. Standalone Helper Exports (Direct imports)
// =============================================================================
export const getServices = apiClient.getServices;
export const getServiceBySlug = apiClient.getServiceBySlug;
export const getPortfolio = apiClient.getPortfolio;
export const getCourses = apiClient.getCourses;
export const getCourseBySlug = apiClient.getCourseBySlug;

/**
 * Validates enquiry fields according to MarsNova requirements
 */
export function validateEnquiryPayload(payload: EnquiryPayload): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const trimmedName = (payload.name || '').trim();
  if (!trimmedName || trimmedName.length < 2) {
    errors.name = 'Please enter your name (at least 2 characters).';
  } else if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
    errors.name = 'Name should only contain letters, spaces, hyphens, or periods.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const trimmedEmail = (payload.email || '').trim();
  if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
    errors.email = 'Please provide a valid email address (e.g. name@domain.com).';
  }

  if (payload.phone && payload.phone.trim().length > 0) {
    const phoneDigits = payload.phone.replace(/[\s\-()]/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(phoneDigits)) {
      errors.phone = 'Please enter a valid phone number (at least 10 digits).';
    }
  }

  if (!payload.service || payload.service.trim() === '') {
    errors.service = 'Please select a service or course interest.';
  }

  const trimmedMessage = (payload.message || '').trim();
  if (!trimmedMessage || trimmedMessage.length < 10) {
    errors.message = 'Please provide details about your project or enquiry (at least 10 characters).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Builds formatted WhatsApp deep link URL with user message and encoded parameters
 */
export function buildWhatsAppUrl(
  payload: EnquiryPayload,
  whatsappNumber: string = WHATSAPP_NUMBER
): string {
  const waText = `Hi MarsNova, I'm ${payload.name.trim()}. Email: ${payload.email.trim()}${
    payload.phone && payload.phone.trim() ? ` | Phone: ${payload.phone.trim()}` : ''
  }. I'm interested in *${payload.service.trim()}*. Message: "${payload.message.trim()}".`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waText)}`;
}

/**
 * Submits a new prospective lead to POST /api/v1/leads with consent, references,
 * rate limit handling, and database persistence verification.
 * NEVER confirms a failed save.
 */
export async function submitLead(payload: {
  name: string;
  email: string;
  phone?: string;
  service: string;
  message?: string;
  source?: string;
  reference_id?: string;
  consent: boolean;
}): Promise<LeadSubmissionResult> {
  const validation = validateEnquiryPayload({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    service: payload.service,
    message: payload.message || 'General project discussion'
  });

  if (!validation.valid) {
    const firstErrorMessage = Object.values(validation.errors)[0];
    throw new Error(firstErrorMessage);
  }

  if (!payload.consent) {
    throw new Error('Explicit consent is required to process your request.');
  }

  const whatsappUrl = buildWhatsAppUrl({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    service: payload.service,
    message: payload.message || ''
  }, WHATSAPP_NUMBER);

  const res = await fetch(`${API_BASE_URL}/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: payload.name.trim(),
      email: payload.email.trim(),
      phone: payload.phone ? payload.phone.trim() : undefined,
      service: payload.service.trim(),
      message: (payload.message || '').trim(),
      source: payload.source || 'website_contact',
      reference_id: payload.reference_id,
      consent: payload.consent
    })
  });

  if (res.ok) {
    const data = await res.json();
    return {
      success: true,
      status: 'saved_to_server',
      lead_id: data.lead_id,
      reference: data.reference,
      activity_id: data.activity_id,
      notification: data.notification,
      message: data.message || `Lead recorded successfully (Ref: ${data.reference || data.lead_id}).`,
      whatsappUrl: data.whatsapp_url || data.notification?.whatsapp_url || whatsappUrl
    };
  }

  let serverErrMessage = `Server responded with status ${res.status}`;
  try {
    const errJson = await res.json();
    if (errJson && errJson.error) {
      serverErrMessage = errJson.error;
    }
  } catch {
    // fallback
  }
  // NEVER confirm a failed save
  throw new Error(`Lead submission failed: ${serverErrMessage}`);
}

/**
 * Validates enquiry and saves it in database before generating the WhatsApp notification link.
 * Never fakes server confirmations: returns real server response or transparent offline queue status.
 */
export async function submitEnquiry(payload: EnquiryPayload): Promise<EnquirySubmissionResult> {
  const validation = validateEnquiryPayload(payload);
  if (!validation.valid) {
    const firstErrorMessage = Object.values(validation.errors)[0];
    throw new Error(firstErrorMessage);
  }

  const whatsappUrl = buildWhatsAppUrl(payload, WHATSAPP_NUMBER);
  let enquiryId: string | undefined;

  try {
    // Connect directly to /leads endpoint with full lead & activity persistence
    const res = await fetch(`${API_BASE_URL}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: payload.name.trim(),
        email: payload.email.trim(),
        phone: payload.phone ? payload.phone.trim() : undefined,
        service: payload.service.trim(),
        message: payload.message.trim(),
        source: 'website_contact',
        reference_id: payload.reference_id,
        consent: payload.consent !== undefined ? payload.consent : true
      })
    });

    if (res.ok) {
      const data = await res.json();
      enquiryId = data.reference || data.lead_id || data.enquiry_id;
      return {
        success: true,
        status: 'saved_to_server',
        message: `Your enquiry was successfully recorded (ID: ${enquiryId}).`,
        whatsappUrl,
        enquiryId
      };
    } else {
      let serverErrMessage = `Server responded with status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) {
          serverErrMessage = errJson.error;
        }
      } catch {
        // fallback
      }
      throw new Error(`Enquiry submission failed: ${serverErrMessage}`);
    }
  } catch (err: any) {
    if (err.message && err.message.startsWith('Enquiry submission failed:')) {
      throw err;
    }

    console.warn('MarsNova API backend is unreachable; saving enquiry to local queue:', err);
    const localId = `LOCAL-${Date.now()}`;
    try {
      const local = JSON.parse(localStorage.getItem('marsnova_enquiries') || '[]');
      local.push({
        ...payload,
        id: localId,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('marsnova_enquiries', JSON.stringify(local));
      enquiryId = localId;
    } catch {
      enquiryId = localId;
    }

    return {
      success: true,
      status: 'offline_queued',
      message: `Backend server is currently offline. Your enquiry is queued locally (#${enquiryId}) and pre-formatted for direct WhatsApp handoff.`,
      whatsappUrl,
      enquiryId
    };
  }
}

/**
 * Parameterized retrieval of Pen Drive data recovery case status
 */
export async function trackRecoveryCase(caseId: string): Promise<RecoveryCase> {
  const cleanId = caseId.trim().toUpperCase();
  if (!cleanId) {
    throw new Error('Please enter a valid Case ID.');
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/recovery/${encodeURIComponent(cleanId)}`);
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/recovery/track/${encodeURIComponent(cleanId)}`);
    }
  } catch (err: any) {
    throw new NetworkError(
      `Network request failed to recovery case tracker. Is the MarsNova Drogon backend running on ${API_BASE_URL}?`
    );
  }

  if (res.status === 404) {
    throw new NotFoundError(`Case #${cleanId} was not found in our diagnostic records.`);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || `Unable to load case record #${cleanId}`, res.status, json.code || 'CASE_ERROR');
  }

  return (json.data || json) as RecoveryCase;
}

// =============================================================================
// 8. Staff Authentication & Session Management
// =============================================================================

/**
 * Authenticates staff member with email and password.
 * Receives HttpOnly session cookie, CSRF token, and user permissions.
 */
export async function loginStaff(credentials: LoginCredentials): Promise<AuthSession> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password
      })
    });
  } catch (err: any) {
    throw new NetworkError(err?.message || 'Failed to connect to authentication server');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || 'Authentication failed', res.status, json.code || 'AUTH_ERROR');
  }

  // Store CSRF token in memory/sessionStorage for subsequent state-changing requests
  if (json.session && json.session.csrf_token) {
    sessionStorage.setItem('marsnova_csrf_token', json.session.csrf_token);
  }

  return json.session;
}

/**
 * Destroys current staff session and clears authentication cookies.
 */
export async function logoutStaff(): Promise<void> {
  const csrfToken = sessionStorage.getItem('marsnova_csrf_token') || '';
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include'
    });
  } finally {
    sessionStorage.removeItem('marsnova_csrf_token');
  }
}

/**
 * Inspects current active session, verifying user role, status, and permissions.
 */
export async function inspectSession(): Promise<StaffUser | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/session`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      credentials: 'include'
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    if (json.csrf_token) {
      sessionStorage.setItem('marsnova_csrf_token', json.csrf_token);
    }
    return json.user;
  } catch {
    return null;
  }
}

/**
 * Retrieves active leads and inquiries from backend database.
 */
export async function fetchAdminLeads(signal?: AbortSignal): Promise<any[]> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/leads`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      credentials: 'include',
      signal
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    throw new NetworkError(err?.message || 'Failed to fetch leads from server');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || 'Failed to fetch leads', res.status, json.code || 'FETCH_LEADS_ERROR');
  }
  return (json.data || []) as any[];
}

/**
 * Retrieves paginated leads with optional search, filtering, and sorting.
 */
export async function fetchLeadsPaged(
  params: LeadQueryParams = {},
  signal?: AbortSignal
): Promise<{ data: LeadRecord[]; pagination: LeadPagination }> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q.trim());
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.service && params.service !== 'all') query.set('service', params.service);
  if (params.source && params.source !== 'all') query.set('source', params.source);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.sort_by) query.set('sort_by', params.sort_by);
  if (params.order) query.set('order', params.order);

  const qs = query.toString();
  const url = `${API_BASE_URL}/leads${qs ? `?${qs}` : ''}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      credentials: 'include',
      signal
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    throw new NetworkError(err?.message || 'Failed to fetch leads');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || 'Failed to list leads', res.status, json.code || 'LEADS_ERROR');
  }

  return {
    data: (json.data || []) as LeadRecord[],
    pagination: (json.pagination || {
      page: params.page || 1,
      limit: params.limit || 10,
      total: (json.data || []).length,
      total_pages: 1,
      has_next: false,
      has_prev: false
    }) as LeadPagination
  };
}

/**
 * Retrieves complete lead details and audited activity timeline.
 */
export async function getLeadDetails(id: string, signal?: AbortSignal): Promise<LeadRecord> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/leads/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      credentials: 'include',
      signal
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    throw new NetworkError(err?.message || 'Failed to fetch lead details');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || 'Failed to load lead details', res.status, json.code || 'LEAD_NOT_FOUND');
  }

  return json.data as LeadRecord;
}

/**
 * Adds an audited follow-up note to a lead.
 */
export async function addLeadNote(
  id: string,
  note: string
): Promise<{ status: string; message: string; version: number; activity: LeadActivity }> {
  const csrfToken = sessionStorage.getItem('marsnova_csrf_token') || '';
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/leads/${encodeURIComponent(id)}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify({ note })
    });
  } catch (err: any) {
    throw new NetworkError(err?.message || 'Failed to record follow-up note');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || 'Failed to save note', res.status, json.code || 'NOTE_ERROR');
  }

  return json;
}

/**
 * Updates lead status with state transition validation, RBAC, and optimistic concurrency check.
 */
export async function updateLeadStatus(
  id: string,
  newStatus: string,
  note?: string,
  expectedVersion?: number,
  expectedStatus?: string
): Promise<{ status: string; message: string; lead: LeadRecord }> {
  const csrfToken = sessionStorage.getItem('marsnova_csrf_token') || '';
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/leads/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify({
        status: newStatus,
        note,
        expected_version: expectedVersion,
        expected_status: expectedStatus
      })
    });
  } catch (err: any) {
    throw new NetworkError(err?.message || 'Failed to update lead status');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || 'Status transition failed', res.status, json.code || 'TRANSITION_ERROR');
  }

  return json;
}

// =============================================================================
// 10. Manual Quotations & Revisions (Records Only — No Checkout/Gateways/Webhooks)
// =============================================================================

// =============================================================================
// 9. Creative Projects API (Milestones, Staff Assignments & Audit Trail)
// =============================================================================

// =============================================================================
// 10. Protected Content Management & Media Storage API
// =============================================================================

// --- Services Management ---
// --- Portfolio Management ---
// --- Courses & Lessons Management ---
// --- Media Storage & Upload ---
// =============================================================================
// Pen-Drive Data Recovery, Physical Custody & Lifecycle Client API
// =============================================================================

export async function submitRecoveryIntake(payload: RecoveryIntakePayload): Promise<{
  success: boolean;
  status: string;
  case_id: string;
  case_reference: string;
  recovery_status: string;
  message: string;
  tracking_url: string;
}> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/recovery/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err: any) {
    throw new NetworkError(err?.message || 'Network error submitting recovery intake');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || 'Recovery intake submission failed', res.status, json.code || 'INTAKE_ERROR');
  }
  return json;
}

export async function trackPublicRecoveryCase(caseIdOrRef: string): Promise<RecoveryCaseRecord> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/recovery/track/${encodeURIComponent(caseIdOrRef)}`);
  } catch (err: any) {
    throw new NetworkError(err?.message || 'Network error querying recovery case');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || 'Recovery case not found', res.status, json.code || 'NOT_FOUND');
  }
  return json;
}

// =============================================================================
// MarsNova Lab Student Learning Platform Client APIs
// =============================================================================

export async function registerStudent(payload: {
  email: string;
  password: string;
  full_name: string;
}): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/lab/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
  } catch (err: any) {
    throw new NetworkError(err?.message || 'Network error registering student account');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || 'Registration failed', res.status, json.code || 'REGISTRATION_ERROR');
  }
  if (json.csrf_token) {
    sessionStorage.setItem('marsnova_student_csrf_token', json.csrf_token);
  }
  return json;
}

export async function loginStudent(payload: {
  email: string;
  password: string;
}): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/lab/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
  } catch (err: any) {
    throw new NetworkError(err?.message || 'Network error logging into student portal');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || 'Login failed', res.status, json.code || 'LOGIN_ERROR');
  }
  if (json.csrf_token) {
    sessionStorage.setItem('marsnova_student_csrf_token', json.csrf_token);
  }
  return json;
}

export async function logoutStudent(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/lab/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch {}
  sessionStorage.removeItem('marsnova_student_csrf_token');
}

export async function getStudentProfile(): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/lab/auth/me`, { credentials: 'include' });
  } catch (err: any) {
    throw new NetworkError(err?.message || 'Network error fetching student profile');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || 'Failed to fetch student profile', res.status, json.code || 'AUTH_ERROR');
  }
  return json.student;
}

export async function enrollInCourse(slug: string): Promise<any> {
  const csrfToken = sessionStorage.getItem('marsnova_student_csrf_token') || '';
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/lab/courses/${encodeURIComponent(slug)}/enroll`, {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
      credentials: 'include'
    });
  } catch (err: any) {
    throw new NetworkError(err?.message || 'Network error enrolling in course');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || 'Enrolment failed', res.status, json.code || 'ENROL_ERROR');
  }
  return json.enrolment;
}

export async function fetchMyEnrolments(): Promise<any[]> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/lab/my-enrolments`, { credentials: 'include' });
  } catch (err: any) {
    throw new NetworkError(err?.message || 'Network error fetching enrolments');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || 'Failed to fetch enrolments', res.status, json.code || 'FETCH_ERROR');
  }
  return json.data || [];
}

export async function fetchLessonContent(slug: string, lessonId: string): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/lab/courses/${encodeURIComponent(slug)}/lessons/${encodeURIComponent(lessonId)}`, {
      credentials: 'include'
    });
  } catch (err: any) {
    throw new NetworkError(err?.message || 'Network error fetching lesson content');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || 'Failed to load lesson', res.status, json.code || 'LESSON_ERROR');
  }
  return json.data;
}

export async function recordLessonProgress(
  lessonId: string,
  payload: { completed: boolean; position_seconds?: number }
): Promise<any> {
  const csrfToken = sessionStorage.getItem('marsnova_student_csrf_token') || '';
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/lab/lessons/${encodeURIComponent(lessonId)}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
  } catch (err: any) {
    throw new NetworkError(err?.message || 'Network error recording progress');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || 'Failed to record progress', res.status, json.code || 'PROGRESS_ERROR');
  }
  return json.progress;
}

