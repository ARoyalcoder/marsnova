export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ServiceItem {
  id: string;
  slug?: string;
  title: string;
  category: 'Video' | 'Social Media' | 'Promotion' | 'Tech';
  description: string;
  icon: string;
  badge?: string;
  is_active?: boolean;
  longDescription?: string;
  features?: string[];
  deliverables?: string[];
  idealFor?: string;
  turnaroundTime?: string;
}

export interface CourseCurriculumModule {
  moduleTitle: string;
  topics: string[];
}

export interface CourseItem {
  id: string;
  slug?: string;
  title: string;
  category: string;
  description: string;
  icon: string;
  level: string;
  badge?: string;
  is_published?: boolean;
  duration?: string;
  format?: string;
  overview?: string;
  learningOutcomes?: string[];
  curriculum?: CourseCurriculumModule[];
  prerequisites?: string;
  targetAudience?: string;
}

export interface WorkItem {
  id: string;
  slug?: string;
  title: string;
  category: 'YouTube Videos' | 'Shorts' | 'Business Promotion' | 'Social Media';
  thumbnailUrl: string;
  videoUrl?: string;
  tag: string;
  format?: string;
  client?: string;
  client_industry?: string;
  summary?: string;
  challenge?: string;
  approach?: string;
  outcome?: string;
  metrics?: Array<{ label: string; value: string }>;
  deliverables?: string[];
  tools?: string[];
  is_published?: boolean;
}

export interface RecoveryCase {
  case_id: string;
  customer_name: string;
  device_type: string;
  issue_type: string;
  current_stage: string;
  stage_title: string;
  progress_percentage: number;
  files_recovered_count: number;
  data_size_recovered_mb: number;
  diagnostic_notes: string;
  created_at: string;
  updated_at: string;
  timeline?: Array<{
    stage: string;
    status_title: string;
    status_description: string;
    recorded_at: string;
  }>;
}

export interface EnquiryPayload {
  name: string;
  email: string;
  phone?: string;
  service: string;
  message: string;
  consent?: boolean;
  reference_id?: string;
}

export interface LeadPayload {
  name: string;
  email: string;
  phone?: string;
  service: string;
  message?: string;
  source?: string;
  reference_id?: string;
  consent: boolean;
}

export type NotificationStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'fallback_click_to_chat';

export interface LeadNotificationRecord {
  id: string;
  channel: 'whatsapp';
  status: NotificationStatus;
  attempts: number;
  max_attempts: number;
  provider_message_id?: string;
  safe_error_details?: string;
  whatsapp_url?: string;
  click_to_chat_url?: string;
  created_at?: string;
}

export interface LeadSubmissionResult {
  success: boolean;
  status: 'saved_to_server' | 'offline_queued';
  lead_id?: string;
  reference?: string;
  activity_id?: string;
  message: string;
  whatsappUrl: string;
  notification?: LeadNotificationRecord;
}

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal_sent'
  | 'converted'
  | 'lost'
  | 'archived';

export interface LeadActivity {
  id: string;
  lead_id: string;
  type: string;
  summary: string;
  created_by: string;
  created_at: string;
}

export interface LeadRecord {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  service_requested: string;
  source: string;
  status: LeadStatus;
  lead_score: number;
  notes?: string;
  version: number;
  created_at: string;
  updated_at: string;
  activities?: LeadActivity[];
  notifications?: LeadNotificationRecord[];
}

export interface LeadPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface LeadQueryParams {
  q?: string;
  status?: string;
  service?: string;
  source?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  order?: 'asc' | 'desc';
}

export type StaffRole = 'super_admin' | 'agency_manager' | 'editor';

export interface StaffUser {
  id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  permissions?: Record<string, boolean>;
}

export interface AuthSession {
  session_id: string;
  csrf_token: string;
  user: StaffUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AdminCounts {
  leads_count: number;
  services_count: number;
  portfolio_count: number;
  courses_count: number;
  staff_count: number;
  active_sessions_count: number;
  recovery_cases_count: number;
  quotations_count: number;
}

export interface AdminFinancials {
  total_quotation_value_inr: number;
  average_quote_value_inr: number;
  quotes_by_status: Record<string, number>;
}

export interface ServiceDistributionItem {
  category: string;
  count: number;
  percentage: number;
}

export interface ConversionMetrics {
  new_leads_count: number;
  contacted_leads_count: number;
  conversion_rate_percent: number;
}

export interface AdminActivityItem {
  id: string;
  type: string;
  title: string;
  detail: string;
  timestamp: string;
  status: string;
}

export interface AdminOverviewStats {
  system_status: string;
  timestamp: string;
  authenticated_role: StaffRole;
  staff_user: string;
  enquiries_count?: number;
  active_projects_count?: number;
  recovery_cases_count?: number;
  counts: AdminCounts;
  financials?: AdminFinancials | null;
  service_distribution: ServiceDistributionItem[];
  conversion_metrics: ConversionMetrics;
  recent_activity: AdminActivityItem[];
}

// =============================================================================
// Manual Quotations & Revisions (Records Only — No Checkout/Gateways/Webhooks)
// =============================================================================
export type QuotationStatus =
  | 'draft'
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export type QuotationCurrency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export interface QuotationRevision {
  id: string;
  quotation_id: string;
  revision_number: number;
  scope: string;
  amount: string; // Formatted decimal monetary representation e.g. "45000.00"
  currency: QuotationCurrency | string;
  terms?: string;
  valid_until: string;
  change_summary?: string;
  created_by?: string;
  created_at: string;
}

export interface QuotationRecord {
  id: string;
  reference: string;
  lead_id?: string;
  client_name: string;
  client_email?: string;
  service_type: string;
  scope: string;
  amount: string; // Formatted decimal monetary representation e.g. "45000.00"
  currency: QuotationCurrency | string;
  terms?: string;
  valid_until: string;
  status: QuotationStatus;
  revision_number: number;
  is_expired?: boolean;
  is_record_only?: boolean;
  idempotency_key?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  revisions?: QuotationRevision[];
}

export interface CreateQuotationPayload {
  reference?: string;
  lead_id?: string;
  client_name: string;
  client_email?: string;
  service_type: string;
  scope: string;
  amount: string | number;
  currency?: QuotationCurrency | string;
  terms?: string;
  valid_until: string;
  idempotency_key?: string;
}

export interface CreateRevisionPayload {
  scope?: string;
  amount?: string | number;
  currency?: QuotationCurrency | string;
  terms?: string;
  valid_until?: string;
  change_summary?: string;
}

export interface QuotationQueryParams {
  status?: QuotationStatus | 'all';
  lead_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface QuotationPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// =============================================================================
// Studio Client Projects, Deliverables & Manual Staff Assignments
// =============================================================================
export type ProjectStatus =
  | 'kickoff'
  | 'pre_production'
  | 'production'
  | 'post_editing'
  | 'client_review'
  | 'final_delivery'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ProjectDeliverable {
  id: string;
  title: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'review_ready' | 'approved' | 'delivered';
  completed: boolean;
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  assigned_user_id: string;
  assigned_user_email: string;
  assigned_user_name: string;
  role_in_project: string;
  status: string;
  assigned_at: string;
}

export interface ProjectActivity {
  id: string;
  project_id: string;
  activity_type: string;
  summary: string;
  created_by: string;
  created_at: string;
}

export interface ProjectRecord {
  id: string;
  project_code: string;
  title: string;
  lead_id?: string;
  quotation_id?: string;
  client_name: string;
  client_email?: string;
  vertical: string;
  scope?: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  progress_percentage: number;
  start_date?: string;
  target_delivery?: string;
  drive_assets_url?: string;
  notes?: string;
  assigned_count?: number;
  assignments?: ProjectAssignment[];
  deliverables?: ProjectDeliverable[];
  activities?: ProjectActivity[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectPayload {
  title: string;
  client_name: string;
  client_email?: string;
  vertical: string;
  scope?: string;
  priority?: ProjectPriority;
  start_date?: string;
  target_delivery?: string;
  lead_id?: string;
  lead_status?: string;
  quotation_id?: string;
  quotation_status?: string;
  project_code?: string;
  drive_assets_url?: string;
  notes?: string;
  assignments?: Array<{ user_id?: string; email?: string; role_in_project: string }>;
  deliverables?: Array<{ title: string; due_date?: string; status?: string; completed?: boolean }>;
}

export interface ProjectQueryParams {
  status?: ProjectStatus | 'all';
  priority?: ProjectPriority | 'all';
  vertical?: string | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProjectPaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ProjectPagination {
  status: string;
  count: number;
  data: ProjectRecord[];
  pagination: ProjectPaginationMeta;
}

// =============================================================================
// Protected Content Management & Media Storage Models
// =============================================================================
export type ContentStatus = 'draft' | 'published' | 'archived';

export interface AdminServiceRecord {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  icon?: string;
  badge?: string;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface AdminPortfolioRecord {
  id: string;
  slug: string;
  title: string;
  category: string;
  client_name?: string;
  thumbnail_url?: string;
  video_url?: string;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface AdminCourseRecord {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  level?: string;
  duration?: string;
  icon?: string;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface AdminLessonRecord {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  module_title: string;
  lesson_order: number;
  content_markdown?: string;
  video_url?: string;
  duration_minutes: number;
  is_free_preview: boolean;
  is_private: boolean;
  status: ContentStatus;
  access_level?: 'authorized' | 'free_preview' | 'restricted';
  requires_authentication?: boolean;
  preview_notice?: string;
  created_at: string;
  updated_at: string;
}

export interface MediaUploadRecord {
  id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number;
  mime_type: string;
  storage_provider: string;
  is_private: boolean;
  uploaded_by: string;
  created_at: string;
}

export interface CreateServicePayload {
  title: string;
  slug: string;
  category: string;
  description: string;
  icon?: string;
  badge?: string;
  status?: ContentStatus;
}

export interface CreatePortfolioPayload {
  title: string;
  slug: string;
  category: string;
  client_name?: string;
  thumbnail_url?: string;
  status?: ContentStatus;
}

export interface CreateCoursePayload {
  title: string;
  slug: string;
  category: string;
  description: string;
  level?: string;
  duration?: string;
  icon?: string;
  status?: ContentStatus;
}

export interface CreateLessonPayload {
  title: string;
  slug: string;
  module_title?: string;
  lesson_order?: number;
  content_markdown?: string;
  video_url?: string;
  duration_minutes?: number;
  is_free_preview?: boolean;
  is_private?: boolean;
  status?: ContentStatus;
}

export interface MediaUploadPayload {
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  is_private?: boolean;
}

// =============================================================================
// Pen-Drive Data Recovery, Physical Custody & Lifecycle Types
// =============================================================================

export type RecoveryCaseStatus =
  | 'intake_submitted'
  | 'device_received'
  | 'diagnosing'
  | 'quote_pending'
  | 'quote_approved'
  | 'quote_rejected'
  | 'in_recovery'
  | 'recovery_completed'
  | 'recovery_unrecoverable'
  | 'device_returned';

export type RecoveryDeliveryMethod = 'counter_dropoff' | 'insured_courier';
export type RecoveryDamageType = 'physical' | 'electronic_controller' | 'logical_format' | 'liquid_heat' | 'nand_degradation';
export type RecoveryComplexity = 'standard' | 'level2_chip_off' | 'level3_monolithic';

export interface RecoveryCaseEventRecord {
  id: string;
  case_reference: string;
  event_type: string;
  stage?: string;
  from_status?: string;
  to_status?: string;
  status_title?: string;
  status_description?: string;
  actor_type: string;
  actor_name: string;
  custody_location?: string;
  public_notes?: string;
  internal_diagnostic_notes?: string; // Protected: only present for staff
  created_at: string;
  recorded_at?: string;
}

export interface RecoveryCaseRecord {
  id: string;
  case_id: string;
  case_reference: string;
  customer_name: string;
  customer_phone?: string; // Protected
  customer_email?: string; // Protected
  device_brand: string;
  device_model: string;
  device_serial?: string;
  device_type: string;
  capacity_gb: number;
  file_system?: string;
  damage_type: RecoveryDamageType;
  symptoms: string;
  critical_files_description?: string;
  consent_diagnostic: boolean;
  consent_nand_risk: boolean;
  terms_accepted: boolean;
  delivery_method: RecoveryDeliveryMethod;
  physical_receipt_confirmed: boolean;
  received_at?: string;
  received_by?: string;
  received_condition_notes?: string;
  current_custody_location: string;
  diagnosis_status: 'pending' | 'in_progress' | 'completed' | 'unrecoverable';
  diagnostic_complexity: RecoveryComplexity;
  internal_diagnostic_notes?: string; // Protected: only present for staff
  public_diagnostic_summary?: string;
  quotation_amount: number;
  quotation_status: 'none' | 'issued' | 'approved' | 'rejected';
  quotation_approved_at?: string;
  quotation_approved_by?: string;
  recovery_status: RecoveryCaseStatus;
  current_stage: string;
  stage_title: string;
  progress_percentage: number;
  files_recovered_count: number;
  data_size_recovered_mb: number;
  return_dispatched_at?: string;
  return_tracking_number?: string;
  return_carrier?: string;
  return_recipient_name?: string;
  created_at: string;
  updated_at: string;
  timeline?: RecoveryCaseEventRecord[];
}

export interface RecoveryIntakePayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  device_brand: string;
  device_model?: string;
  capacity_gb: number;
  file_system?: string;
  damage_type?: RecoveryDamageType;
  symptoms: string;
  critical_files_description?: string;
  consent_diagnostic: boolean;
  consent_nand_risk?: boolean;
  terms_accepted: boolean;
  delivery_method?: RecoveryDeliveryMethod;
}

export interface PhysicalReceiptPayload {
  notes: string;
  custody_location?: string;
}

export interface CaseDiagnosisPayload {
  complexity: RecoveryComplexity;
  internal_notes: string;
  public_summary: string;
}

export interface CaseQuotationPayload {
  amount: number;
}

export interface CaseQuotationDecisionPayload {
  decision: 'approved' | 'rejected';
  approved_by?: string;
}

export interface CaseStatusTransitionPayload {
  status: RecoveryCaseStatus;
  notes?: string;
  files_recovered_count?: number;
  data_size_recovered_mb?: number;
}

export interface CaseCustodyTransferPayload {
  custody_location: string;
  notes?: string;
}

export interface CaseReturnPayload {
  return_carrier: string;
  return_tracking_number?: string;
  return_recipient_name?: string;
  notes?: string;
}

// =============================================================================
// MarsNova Lab Student Learning Platform Models
// =============================================================================
export interface StudentProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'student';
  avatar_url?: string;
}

export interface StudentAuthResponse {
  status: string;
  message: string;
  student: StudentProfile;
  csrf_token: string;
}

export interface StudentRegisterPayload {
  email: string;
  password: string;
  full_name: string;
}

export interface StudentLoginPayload {
  email: string;
  password: string;
}

export interface CourseEnrolment {
  id: string;
  course_slug: string;
  status: 'active' | 'completed' | 'dropped' | 'suspended';
  enrolled_at: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
}

export interface MyEnrolmentsResponse {
  status: string;
  student_id: string;
  data: CourseEnrolment[];
}

export interface LessonContent {
  id: string;
  course_slug: string;
  module_title: string;
  title: string;
  lesson_order: number;
  duration_minutes: number;
  is_free_preview: boolean;
  content_markdown: string;
  video_url?: string;
}

export interface LessonProgressPayload {
  completed: boolean;
  position_seconds?: number;
}

export interface LessonProgressResponse {
  status: string;
  message: string;
  progress: {
    student_id: string;
    lesson_id: string;
    completed: boolean;
    position_seconds: number;
  };
}




