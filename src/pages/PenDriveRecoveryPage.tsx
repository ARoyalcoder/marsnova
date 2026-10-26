import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  HardDrive,
  ShieldCheck,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Package,
  Truck,
  FileText,
  Search,
  Lock,
  RefreshCw,
  Building2,
  Check,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { PageTransition } from '../components/animations/PageTransition';
import { fadeInUp, tabContentVariants } from '../animations/variants';
import {
  Container,
  Card,
  Button,
  Badge,
  Input,
  Textarea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ProgressBar,
  toast
} from '../components/ui';
import { submitRecoveryIntake, trackPublicRecoveryCase } from '../api';
import { RecoveryCaseRecord, RecoveryIntakePayload, RecoveryDamageType, RecoveryDeliveryMethod } from '../types';
import { usePageSEO } from '../utils/seo';

interface PenDriveRecoveryPageProps {
  onOpenRecoveryTracker?: () => void;
}

export const PenDriveRecoveryPage: React.FC<PenDriveRecoveryPageProps> = ({ onOpenRecoveryTracker }) => {
  usePageSEO({
    title: 'Pen Drive & USB Flash Data Recovery Services | MarsNova',
    description:
      'Forensic data recovery for corrupted, formatted, or physically damaged pen drives, USB flash sticks, SD cards, and NAND flash storage.',
    canonicalPath: '/services/pen-drive-data-recovery',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Pen Drive Data Recovery',
      description:
        'Forensic hardware diagnostics and logical file recovery for pen drives, USB flash drives, and SD memory cards.',
      provider: {
        '@type': 'Organization',
        name: 'MarsNova',
        url: 'https://marsnova.in'
      },
      serviceType: 'Data Recovery',
      areaServed: 'IN'
    }
  });

  const [searchParams] = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const [activeTab, setActiveTab] = useState<'intake' | 'tracker'>(initialRef ? 'tracker' : 'intake');

  // Intake Form State
  const [formData, setFormData] = useState<RecoveryIntakePayload>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    device_brand: 'SanDisk',
    device_model: '',
    capacity_gb: 32,
    file_system: 'FAT32',
    damage_type: 'logical_format',
    symptoms: '',
    critical_files_description: '',
    // Authorizations and terms must be ticked by the customer; none of them start ticked.
    consent_diagnostic: false,
    consent_nand_risk: false,
    terms_accepted: false,
    delivery_method: 'counter_dropoff'
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCase, setSubmittedCase] = useState<{
    case_reference: string;
    message: string;
    delivery_method: string;
  } | null>(null);

  // Tracker State
  const [trackRef, setTrackRef] = useState(initialRef || 'MN-REC-8291');
  const [isTracking, setIsTracking] = useState(false);
  const [trackedCase, setTrackedCase] = useState<RecoveryCaseRecord | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRef) {
      setTrackRef(initialRef);
      handleTrackQuery(initialRef);
    }
  }, [initialRef]);

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.customer_name.trim() || formData.customer_name.trim().length < 2) {
      errs.customer_name = 'Full name is required (minimum 2 characters)';
    }
    if (!formData.customer_phone.trim() || formData.customer_phone.trim().length < 7) {
      errs.customer_phone = 'A valid contact phone number is required';
    }
    if (!formData.device_brand.trim()) {
      errs.device_brand = 'Device brand/manufacturer is required';
    }
    if (!formData.capacity_gb || formData.capacity_gb <= 0) {
      errs.capacity_gb = 'Drive capacity must be greater than 0 GB';
    }
    if (!formData.symptoms.trim()) {
      errs.symptoms = 'Please describe the failure symptoms or error observed';
    }
    if (!formData.consent_diagnostic) {
      errs.consent_diagnostic = 'Diagnostic inspection authorization is mandatory';
    }
    if (!formData.terms_accepted) {
      errs.terms_accepted = 'You must accept the laboratory service terms to register an intake';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please complete all required fields and authorizations.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitRecoveryIntake(formData);
      setSubmittedCase({
        case_reference: res.case_reference || res.case_id,
        message: res.message,
        delivery_method: formData.delivery_method || 'counter_dropoff'
      });
      toast.success(`Intake created: ${res.case_reference || res.case_id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit recovery intake');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackQuery = async (refToSearch: string) => {
    const ref = refToSearch.trim();
    if (!ref) {
      setTrackError('Please enter a valid Case Reference ID');
      return;
    }
    setIsTracking(true);
    setTrackError(null);
    try {
      const data = await trackPublicRecoveryCase(ref);
      setTrackedCase(data);
    } catch (err: any) {
      setTrackError(err.message || 'Case not found. Please check your reference code.');
      setTrackedCase(null);
    } finally {
      setIsTracking(false);
    }
  };

  const copyRefToClipboard = (ref: string) => {
    navigator.clipboard.writeText(ref);
    toast.success('Case reference copied to clipboard!');
  };

  const shouldReduceMotion = useReducedMotion();

  return (
    <PageTransition>
      <div style={{ padding: '40px 0 80px', minHeight: '85vh', background: 'var(--bg-dark)' }}>
      <Container>
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
          <Link to="/services" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Services
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--text-white)' }}>Pen-Drive & Flash Recovery</span>
        </div>

        {/* Page Hero */}
        <div style={{ maxWidth: '900px', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.25)', marginBottom: '16px' }}>
            <HardDrive size={16} color="var(--cyan-accent)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cyan-accent)' }}>
              Hardware Cleanroom Lab • Chip-Off Forensics
            </span>
          </div>

          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: '16px' }}>
            Pen-Drive & Flash Memory Data Recovery
          </h1>

          <p style={{ fontSize: '16px', lineHeight: 1.7, color: 'var(--text-muted)', marginBottom: '20px' }}>
            Specialized physical laboratory recovery for dead USB pen-drives, broken connectors, corrupted partition tables, electronic controller burnouts, and unreadable NAND memory chips.
          </p>

          {/* Scope Boundaries & Guardrails Banner */}
          <div style={{ background: 'rgba(255, 170, 0, 0.08)', border: '1px solid rgba(255, 170, 0, 0.25)', borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <ShieldCheck size={24} color="#ffaa00" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-white)', flex: 1 }}>
              <strong>Laboratory Standards & Data Protection Policy:</strong>
              <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
                • <strong>In-Lab Physical Diagnostics:</strong> All evaluations are performed inside anti-static cleanroom workstations using hardware readout equipment. We never execute browser-driven WebUSB recovery.
                <br />
                • <strong>Zero Cloud Uploads:</strong> Recovered files are never stored on public web servers. Your data is cloned to encrypted external media or verified directly during in-person counter collection.
              </div>
            </div>
          </div>
        </div>

        {/* 6-Step Laboratory Lifecycle Overview */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>
            Laboratory Chain of Custody & Recovery Process
          </h2>

          <div className="recovery-steps-grid">
            {[
              { step: '01', title: 'Intake Registration', desc: 'Register symptoms and generate unique Case Reference code.' },
              { step: '02', title: 'Physical Receipt', desc: 'Anti-static logging and barcode custody tagging at lab.' },
              { step: '03', title: 'Lab Diagnosis', desc: 'Electronic pinout analysis and NAND integrity check.' },
              { step: '04', title: 'Quote Approval Gate', desc: 'Transparent fixed estimate. No recovery proceeds without approval.' },
              { step: '05', title: 'Hardware Recovery', desc: 'Cleanroom chip-off, RAW sector dump, and filesystem rebuild.' },
              { step: '06', title: 'Verified Return', desc: 'Data verified, anti-static sealed, and returned directly to you.' }
            ].map((st, i) => (
              <Card key={i} style={{ padding: '18px 16px', background: 'var(--bg-deep)', border: '1px solid var(--border-muted)' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cyan-accent)', letterSpacing: '1px' }}>
                  STEP {st.step}
                </span>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '6px 0' }}>
                  {st.title}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  {st.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Primary Interactive Work Area: Laboratory Intake Registration */}
        <Card className="contact-card responsive-card-padding">
          <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '16px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 }}>
              Laboratory Intake Registration Form
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Register failure symptoms and drive details for cleanroom hardware inspection and forensics.
            </p>
          </div>

          <div>
            {/* INTAKE FORM */}
            <div>
              {submittedCase ? (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--cyan-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <CheckCircle2 size={36} color="var(--cyan-accent)" />
                  </div>

                  <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
                    Recovery Case Registered Successfully!
                  </h3>

                  <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '580px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                    Your device intake has been logged into our laboratory queue. Our technician will verify physical receipt and provide direct updates.
                  </p>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'var(--bg-deep)', padding: '12px 24px', borderRadius: '12px', border: '1px solid var(--border-muted)', marginBottom: '32px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Case Reference:</span>
                    <strong style={{ fontSize: '20px', color: 'var(--cyan-accent)', letterSpacing: '1px' }}>
                      {submittedCase.case_reference}
                    </strong>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyRefToClipboard(submittedCase.case_reference)}
                      title="Copy reference"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>

                  <div style={{ maxWidth: '600px', margin: '0 auto 32px', textAlign: 'left', background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-muted)', fontSize: '14px', lineHeight: 1.6, color: 'var(--text-white)' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--cyan-accent)', marginBottom: '10px' }}>
                      Next Steps for Physical Handover:
                    </h4>
                    {submittedCase.delivery_method === 'counter_dropoff' ? (
                      <div>
                        <strong>In-Person Counter Drop-off:</strong>
                        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                          Bring your drive to MarsNova Creative Studio & Recovery Lab. Our technicians will inspect the USB pins, issue an anti-static receipt, and log physical custody immediately.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <strong>Insured Courier Dispatch:</strong>
                        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                          Pack the USB drive in bubble wrap inside an anti-static envelope. Clearly write Case Reference <code>{submittedCase.case_reference}</code> on the parcel exterior and courier to our lab address.
                        </p>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <Button
                      variant="primary"
                      onClick={() => {
                        setSubmittedCase(null);
                        setFormData({
                          customer_name: '',
                          customer_phone: '',
                          customer_email: '',
                          device_brand: 'SanDisk',
                          device_model: '',
                          capacity_gb: 32,
                          file_system: 'FAT32',
                          damage_type: 'logical_format',
                          symptoms: '',
                          delivery_method: 'counter_dropoff',
                          consent_diagnostic: false,
                          terms_accepted: false
                        });
                      }}
                    >
                      Register Another Device
                    </Button>
                    <a
                      href="https://wa.me/917208591595"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none' }}
                    >
                      <Button variant="outline">
                        Contact Lab on WhatsApp
                      </Button>
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleIntakeSubmit} noValidate>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                    {/* Section 1: Customer Contact */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--cyan-accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={18} /> 1. Customer Information
                      </h3>

                      <div>
                        <label htmlFor="recovery-customer-name" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-white)', marginBottom: '6px' }}>
                          Full Name *
                        </label>
                        <Input
                          id="recovery-customer-name"
                          placeholder="e.g., Priya Sharma"
                          value={formData.customer_name}
                          onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                          className={formErrors.customer_name ? 'border-red-500' : ''}
                        />
                        {formErrors.customer_name && (
                          <span style={{ fontSize: '12px', color: '#ff4d4d', marginTop: '4px', display: 'block' }}>
                            {formErrors.customer_name}
                          </span>
                        )}
                      </div>

                      <div>
                        <label htmlFor="recovery-customer-phone" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-white)', marginBottom: '6px' }}>
                          Phone Number (WhatsApp-enabled) *
                        </label>
                        <Input
                          id="recovery-customer-phone"
                          placeholder="e.g., +91 98765 43210"
                          value={formData.customer_phone}
                          onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                          className={formErrors.customer_phone ? 'border-red-500' : ''}
                        />
                        {formErrors.customer_phone && (
                          <span style={{ fontSize: '12px', color: '#ff4d4d', marginTop: '4px', display: 'block' }}>
                            {formErrors.customer_phone}
                          </span>
                        )}
                      </div>

                      <div>
                        <label htmlFor="recovery-customer-email" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-white)', marginBottom: '6px' }}>
                          Email Address (Optional)
                        </label>
                        <Input
                          id="recovery-customer-email"
                          type="email"
                          placeholder="e.g., priya@example.com"
                          value={formData.customer_email || ''}
                          onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Section 2: Device Specifications */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--purple-glow)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HardDrive size={18} /> 2. Device Specifications
                      </h3>

                      <div className="responsive-form-row">
                        <div>
                          <label htmlFor="recovery-device-brand" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-white)', marginBottom: '6px' }}>
                            Device Brand *
                          </label>
                          <select
                            id="recovery-device-brand"
                            value={formData.device_brand}
                            onChange={(e) => setFormData({ ...formData, device_brand: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              background: 'var(--bg-deep)',
                              border: formErrors.device_brand ? '1px solid #ff4d4d' : '1px solid var(--border-muted)',
                              borderRadius: '8px',
                              color: '#fff',
                              fontSize: '14px'
                            }}
                          >
                            <option value="SanDisk">SanDisk</option>
                            <option value="Kingston">Kingston</option>
                            <option value="Samsung">Samsung</option>
                            <option value="HP">HP</option>
                            <option value="Transcend">Transcend</option>
                            <option value="Sony">Sony</option>
                            <option value="Toshiba">Toshiba</option>
                            <option value="Generic / OEM">Generic / OEM</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="recovery-capacity-gb" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-white)', marginBottom: '6px' }}>
                            Capacity (GB) *
                          </label>
                          <Input
                            id="recovery-capacity-gb"
                            type="number"
                            min="1"
                            max="2048"
                            value={formData.capacity_gb || ''}
                            onChange={(e) => setFormData({ ...formData, capacity_gb: parseFloat(e.target.value) || 0 })}
                            className={formErrors.capacity_gb ? 'border-red-500' : ''}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="recovery-device-model" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-white)', marginBottom: '6px' }}>
                          Model / Series (if known)
                        </label>
                        <Input
                          id="recovery-device-model"
                          placeholder="e.g., Ultra Flair 3.0 / Cruzer Blade"
                          value={formData.device_model || ''}
                          onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
                        />
                      </div>

                      <div className="responsive-form-row">
                        <div>
                          <label htmlFor="recovery-file-system" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-white)', marginBottom: '6px' }}>
                            File System
                          </label>
                          <select
                            id="recovery-file-system"
                            value={formData.file_system || 'FAT32'}
                            onChange={(e) => setFormData({ ...formData, file_system: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              background: 'var(--bg-deep)',
                              border: '1px solid var(--border-muted)',
                              borderRadius: '8px',
                              color: '#fff',
                              fontSize: '14px'
                            }}
                          >
                            <option value="FAT32">FAT32 (Standard USB)</option>
                            <option value="exFAT">exFAT (Large Drives)</option>
                            <option value="NTFS">NTFS (Windows)</option>
                            <option value="APFS / HFS+">APFS / Mac HFS+</option>
                            <option value="Unknown">Unknown / RAW</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="recovery-damage-type" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-white)', marginBottom: '6px' }}>
                            Damage Type
                          </label>
                          <select
                            id="recovery-damage-type"
                            value={formData.damage_type || 'logical_format'}
                            onChange={(e) => setFormData({ ...formData, damage_type: e.target.value as RecoveryDamageType })}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              background: 'var(--bg-deep)',
                              border: '1px solid var(--border-muted)',
                              borderRadius: '8px',
                              color: '#fff',
                              fontSize: '14px'
                            }}
                          >
                            <option value="logical_format">Formatted / Deleted Files</option>
                            <option value="electronic_controller">Controller Dead / Hot USB</option>
                            <option value="physical">Bent / Snapped USB Plug</option>
                            <option value="nand_degradation">I/O Errors / Bad Blocks</option>
                            <option value="liquid_heat">Water / Heat Exposure</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Symptoms & Target Files */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                    <div>
                      <label htmlFor="recovery-symptoms" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-white)', marginBottom: '6px' }}>
                        Failure Symptoms & Error Messages *
                      </label>
                      <Textarea
                        id="recovery-symptoms"
                        rows={3}
                        placeholder="e.g., 'Please format disk before using it', 'USB Device Not Recognized', or light blinks once then dies."
                        value={formData.symptoms}
                        onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                        className={formErrors.symptoms ? 'border-red-500' : ''}
                      />
                      {formErrors.symptoms && (
                        <span style={{ fontSize: '12px', color: '#ff4d4d', marginTop: '4px', display: 'block' }}>
                          {formErrors.symptoms}
                        </span>
                      )}
                    </div>

                    <div>
                      <label htmlFor="recovery-critical-files" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-white)', marginBottom: '6px' }}>
                        Critical Target Files & Folders (Priority Data)
                      </label>
                      <Textarea
                        id="recovery-critical-files"
                        rows={3}
                        placeholder="e.g., 'Accounts folder', '.xlsx financial spreadsheets', 'RAW camera footage from 2026 trip'."
                        value={formData.critical_files_description || ''}
                        onChange={(e) => setFormData({ ...formData, critical_files_description: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Section 4: Delivery Method */}
                  <div style={{ marginBottom: '24px', background: 'var(--bg-deep)', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--border-muted)' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-white)', marginBottom: '10px' }}>
                      Physical Handover Method:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                      <label htmlFor="delivery-counter" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          id="delivery-counter"
                          type="radio"
                          name="delivery_method"
                          value="counter_dropoff"
                          checked={formData.delivery_method === 'counter_dropoff'}
                          onChange={() => setFormData({ ...formData, delivery_method: 'counter_dropoff' })}
                        />
                        <span style={{ fontSize: '14px', color: 'var(--text-white)' }}>
                          <strong>In-Person Lab Counter Drop-off</strong> (Immediate physical logging)
                        </span>
                      </label>

                      <label htmlFor="delivery-courier" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          id="delivery-courier"
                          type="radio"
                          name="delivery_method"
                          value="insured_courier"
                          checked={formData.delivery_method === 'insured_courier'}
                          onChange={() => setFormData({ ...formData, delivery_method: 'insured_courier' })}
                        />
                        <span style={{ fontSize: '14px', color: 'var(--text-white)' }}>
                          <strong>Insured Courier / Mail-in</strong> (Ship in anti-static pouch)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Section 5: Diagnostic Consent & Terms */}
                  <div style={{ marginBottom: '32px', background: 'rgba(0, 240, 255, 0.03)', border: '1px solid rgba(0, 240, 255, 0.15)', borderRadius: '10px', padding: '18px 20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--cyan-accent)', marginBottom: '12px' }}>
                      Laboratory Authorizations & Disclaimers
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label htmlFor="consent-diagnostic" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                        <input
                          id="consent-diagnostic"
                          type="checkbox"
                          checked={formData.consent_diagnostic}
                          onChange={(e) => setFormData({ ...formData, consent_diagnostic: e.target.checked })}
                          style={{ marginTop: '3px' }}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--text-white)', lineHeight: 1.5 }}>
                          <strong>Diagnostic Authorization (Mandatory):</strong> I authorize MarsNova Laboratory to perform electronic trace testing, controller ping diagnostics, and sector verification on the submitted storage media.
                        </span>
                      </label>
                      {formErrors.consent_diagnostic && (
                        <span style={{ fontSize: '12px', color: '#ff4d4d', marginLeft: '24px' }}>
                          {formErrors.consent_diagnostic}
                        </span>
                      )}

                      <label htmlFor="consent-nand" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                        <input
                          id="consent-nand"
                          type="checkbox"
                          checked={formData.consent_nand_risk}
                          onChange={(e) => setFormData({ ...formData, consent_nand_risk: e.target.checked })}
                          style={{ marginTop: '3px' }}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          <strong>Advanced Chip-off Authorization (Optional):</strong> If the controller is burned, I authorize cleanroom desoldering of the TSOP/BGA NAND flash chip for direct reader extraction.
                        </span>
                      </label>

                      <label htmlFor="terms-accepted" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                        <input
                          id="terms-accepted"
                          type="checkbox"
                          checked={formData.terms_accepted}
                          onChange={(e) => setFormData({ ...formData, terms_accepted: e.target.checked })}
                          style={{ marginTop: '3px' }}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--text-white)', lineHeight: 1.5 }}>
                          <strong>Terms of Service:</strong> I understand that no recovery work begins without a written quotation approval gate, and recovered data is returned on physical media, not uploaded to the web.
                        </span>
                      </label>
                      {formErrors.terms_accepted && (
                        <span style={{ fontSize: '12px', color: '#ff4d4d', marginLeft: '24px' }}>
                          {formErrors.terms_accepted}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isSubmitting}
                      style={{ padding: '12px 32px', fontSize: '15px' }}
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="animate-spin" size={16} style={{ marginRight: '8px' }} />
                          Submitting Intake...
                        </>
                      ) : (
                        <>
                          Submit Intake & Generate Case ID <ArrowRight size={16} style={{ marginLeft: '8px' }} />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </Card>

        {/* Internal Diagnostic Custody Tooling (Admin/Dev) */}
        {trackedCase ? (
          <div style={{ display: 'none' }}>
            <span>{trackedCase.current_custody_location}</span>
            <button onClick={() => trackPublicRecoveryCase(trackRef)}>Verify</button>
          </div>
        ) : null}


      </Container>
    </div>
  </PageTransition>
);
};
