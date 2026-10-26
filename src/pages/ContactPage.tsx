import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Send,
  User,
  Mail,
  Phone,
  LayoutGrid,
  ChevronDown,
  FileText,
  ArrowRight,
  Check,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  Instagram,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageTransition } from '../components/animations/PageTransition';
import { submitEnquiry, validateEnquiryPayload, EnquirySubmissionResult } from '../api';
import {
  toast,
  Field,
  FieldLabel,
  FieldError,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '../components/ui';
import { usePageSEO } from '../utils/seo';

/**
 * Authentic WhatsApp Vector Logo
 */
const WhatsAppLogo: React.FC<{ size?: number; color?: string; className?: string }> = ({
  size = 20,
  color = 'currentColor',
  className
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={{ color, flexShrink: 0 }}
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
  </svg>
);

/**
 * Filled Paper Plane Icon
 */
const PaperPlaneIcon: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = '#FFFFFF' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    aria-hidden="true"
    style={{ transform: 'rotate(-5deg) translate(1px, -1px)' }}
  >
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

export const ContactPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const prefilledService = searchParams.get('service') || '';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: prefilledService,
    message: '',
    // Consent starts unticked as required for privacy consent compliance
    consent: false
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<EnquirySubmissionResult | null>(null);
  const [errorNotice, setErrorNotice] = useState<string>('');

  // Refs for programmatic keyboard focus management
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef<HTMLSelectElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  usePageSEO({
    title: 'Contact MarsNova | Enquiry & Consultations',
    description:
      'Contact MarsNova studio in Mumbai & Delhi NCR for video production, social media consulting, pen drive data recovery, or MarsNova Lab courses.',
    canonicalPath: '/contact',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact MarsNova',
      mainEntity: {
        '@type': 'Organization',
        name: 'MarsNova',
        url: 'https://marsnova.in',
        email: 'hello@marsnova.in',
        telephone: '+917208591595'
      }
    }
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Listen to searchParams updates for dynamic service prefill
  useEffect(() => {
    const svc = searchParams.get('service');
    if (svc) {
      setFormData((prev) => ({ ...prev, service: svc }));
    }
  }, [searchParams]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (touched[field]) {
        const { errors } = validateEnquiryPayload(next);
        setFieldErrors((prevErrors) => ({
          ...prevErrors,
          [field]: errors[field] || ''
        }));
      }
      return next;
    });
  };

  const handleBlur = (field: keyof typeof formData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const { errors } = validateEnquiryPayload(formData);
    setFieldErrors((prev) => ({
      ...prev,
      [field]: errors[field] || ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      name: true,
      email: true,
      phone: true,
      service: true,
      message: true
    });

    const validation = validateEnquiryPayload(formData);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setErrorNotice('Please resolve the errors highlighted below.');
      toast.error('Please resolve the errors highlighted below.');

      // Programmatic keyboard focus shifting to first invalid field
      if (validation.errors.name) {
        nameRef.current?.focus();
      } else if (validation.errors.email) {
        emailRef.current?.focus();
      } else if (validation.errors.phone) {
        phoneRef.current?.focus();
      } else if (validation.errors.service) {
        serviceRef.current?.focus();
      } else if (validation.errors.message) {
        messageRef.current?.focus();
      }
      return;
    }

    if (!formData.consent) {
      setErrorNotice('Please provide your consent to be contacted.');
      toast.error('Please provide your consent to be contacted.');
      return;
    }

    setFieldErrors({});
    setErrorNotice('');
    setLoading(true);

    try {
      const result = await submitEnquiry(formData);
      setSubmissionResult(result);
      toast.success('Enquiry submitted successfully!');

      // Reset form fields
      setFormData({
        name: '',
        email: '',
        phone: '',
        service: '',
        message: '',
        consent: false
      });
      setTouched({});
    } catch (err: any) {
      const msg = err.message || 'Unable to submit enquiry. Please try again.';
      setErrorNotice(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setSubmissionResult(null);
    setErrorNotice('');
    setFieldErrors({});
    setTouched({});
    setFormData({
      name: '',
      email: '',
      phone: '',
      service: '',
      message: '',
      consent: false
    });
  };

  // WhatsApp quick text draft
  const defaultWhatsAppText =
    "Hi, I'm interested in your services. Please share more details.";

  const dynamicWhatsAppText =
    formData.name.trim() || formData.service || formData.message.trim()
      ? `Hi MarsNova!\nMy name is ${formData.name.trim() || 'A Client'}.\nService: ${
          formData.service || 'Creative / Technical Service'
        }\n${formData.phone ? `Phone: ${formData.phone}\n` : ''}Message: ${
          formData.message.trim() || 'I would like to discuss a project with MarsNova.'
        }`
      : defaultWhatsAppText;

  return (
    <PageTransition>
      <div className="contact-page-wrapper">
        {/* Ambient subtle backdrops */}
        <div
          style={{
            position: 'absolute',
            top: '-8%',
            left: '-4%',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(56, 189, 248, 0) 70%)',
            pointerEvents: 'none'
          }}
          aria-hidden="true"
        />
        <div
          style={{
            position: 'absolute',
            bottom: '4%',
            right: '-5%',
            width: '520px',
            height: '520px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 102, 255, 0.08) 0%, rgba(0, 102, 255, 0) 70%)',
            pointerEvents: 'none'
          }}
          aria-hidden="true"
        />

        <div className="contact-main-grid">
          {/* =============================================================
              Left Column: "Send an Enquiry" Card
              ============================================================= */}
          <div className="contact-enquiry-card">
            {/* Blue Paper Plane Icon Badge */}
            <div className="contact-paperplane-icon" aria-hidden="true">
              <PaperPlaneIcon size={24} color="#FFFFFF" />
            </div>

            {/* Title & Subtitle */}
            <h1 className="contact-card-title">
              Send an <span style={{ color: '#0066FF' }}>Enquiry</span>
            </h1>
            <p className="contact-card-subtitle">
              Share your project details and we'll get back to you.
            </p>

            <AnimatePresence mode="wait">
              {submissionResult ? (
                <motion.div
                  key="submission-result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    padding: '28px',
                    borderRadius: '20px',
                    background:
                      submissionResult.status === 'saved_to_server'
                        ? 'rgba(34, 197, 94, 0.08)'
                        : 'rgba(245, 158, 11, 0.08)',
                    border:
                      submissionResult.status === 'saved_to_server'
                        ? '1.5px solid rgba(34, 197, 94, 0.35)'
                        : '1.5px solid rgba(245, 158, 11, 0.35)'
                  }}
                  role="status"
                  aria-live="polite"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background:
                          submissionResult.status === 'saved_to_server'
                            ? 'rgba(34, 197, 94, 0.16)'
                            : 'rgba(245, 158, 11, 0.16)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {submissionResult.status === 'saved_to_server' ? (
                        <CheckCircle2 size={24} color="#22C55E" />
                      ) : (
                        <AlertTriangle size={24} color="#F59E0B" />
                      )}
                    </div>
                    <div>
                      <h3
                        style={{
                          color: '#0F172A',
                          fontSize: '18px',
                          fontWeight: 700,
                          margin: 0
                        }}
                      >
                        {submissionResult.status === 'saved_to_server'
                          ? 'Enquiry Recorded Successfully'
                          : 'Enquiry Buffered Locally'}
                      </h3>
                      {submissionResult.enquiryId && (
                        <div style={{ marginTop: '5px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              background: '#EFF6FF',
                              color: '#0066FF',
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}
                          >
                            Ref: {submissionResult.enquiryId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p
                    style={{
                      color: '#475569',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      margin: 0
                    }}
                  >
                    {submissionResult.message}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px' }}>
                    <a
                      href={submissionResult.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        textDecoration: 'none',
                        padding: '11px 20px',
                        borderRadius: '12px',
                        fontWeight: 600,
                        background: '#00B050',
                        color: '#FFFFFF'
                      }}
                    >
                      <WhatsAppLogo size={18} color="#FFFFFF" />
                      <span>Open WhatsApp Chat</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleResetForm}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '11px 18px',
                        borderRadius: '12px',
                        border: '1.5px solid #CBD5E1',
                        background: '#FFFFFF',
                        color: '#1E293B',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      <RotateCcw size={16} />
                      <span>Send Another Enquiry</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="enquiry-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {errorNotice && (
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#DC2626',
                        fontSize: '13.5px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      role="alert"
                    >
                      <AlertTriangle size={16} color="#DC2626" />
                      <span>{errorNotice}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate>
                    {/* Row 1: Name and Email */}
                    <div className="contact-form-row">
                      <div className="contact-field-group">
                        <label htmlFor="contact-name" className="contact-field-label">
                          Name
                        </label>
                        <div className="contact-input-wrapper">
                          <User size={18} className="contact-input-icon" />
                          <input
                            ref={nameRef}
                            id="contact-name"
                            name="name"
                            required
                            placeholder="Your name"
                            value={formData.name}
                            aria-invalid={Boolean(fieldErrors.name)}
                            className={`contact-input ${fieldErrors.name ? 'error' : ''}`}
                            onChange={(e) => handleChange('name', e.target.value)}
                            onBlur={() => handleBlur('name')}
                          />
                        </div>
                        {fieldErrors.name && (
                          <p className="contact-field-error">{fieldErrors.name}</p>
                        )}
                      </div>

                      <div className="contact-field-group">
                        <label htmlFor="contact-email" className="contact-field-label">
                          Email
                        </label>
                        <div className="contact-input-wrapper">
                          <Mail size={18} className="contact-input-icon" />
                          <input
                            ref={emailRef}
                            id="contact-email"
                            name="email"
                            type="email"
                            required
                            placeholder="you@example.com"
                            value={formData.email}
                            aria-invalid={Boolean(fieldErrors.email)}
                            className={`contact-input ${fieldErrors.email ? 'error' : ''}`}
                            onChange={(e) => handleChange('email', e.target.value)}
                            onBlur={() => handleBlur('email')}
                          />
                        </div>
                        {fieldErrors.email && (
                          <p className="contact-field-error">{fieldErrors.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Phone (Optional) and Service */}
                    <div className="contact-form-row">
                      <div className="contact-field-group">
                        <label htmlFor="contact-phone" className="contact-field-label">
                          Phone (Optional)
                        </label>
                        <div className="contact-input-wrapper">
                          <Phone size={18} className="contact-input-icon" />
                          <input
                            ref={phoneRef}
                            id="contact-phone"
                            name="phone"
                            type="tel"
                            placeholder="+91 98765 43210"
                            value={formData.phone}
                            aria-invalid={Boolean(fieldErrors.phone)}
                            className={`contact-input ${fieldErrors.phone ? 'error' : ''}`}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            onBlur={() => handleBlur('phone')}
                          />
                        </div>
                        {fieldErrors.phone && (
                          <p className="contact-field-error">{fieldErrors.phone}</p>
                        )}
                      </div>

                      <Field data-invalid={Boolean(fieldErrors.service)} className="contact-field-group">
                        <FieldLabel htmlFor="contact-service" className="contact-field-label">
                          Service
                        </FieldLabel>
                        <Select
                          value={formData.service}
                          onValueChange={(val) => {
                            handleChange('service', val);
                            if (serviceRef.current) {
                              serviceRef.current.value = val;
                            }
                          }}
                        >
                          <SelectTrigger
                            id="contact-service"
                            aria-invalid={Boolean(fieldErrors.service)}
                            className={`contact-select-trigger ${fieldErrors.service ? 'error' : ''}`}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                              <LayoutGrid size={18} style={{ color: '#0066FF', flexShrink: 0 }} />
                              <SelectValue placeholder="Select a service" />
                            </div>
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false} className="contact-select-dropdown-content">
                            <SelectGroup>
                              <SelectLabel className="contact-select-label-group">Creative &amp; Technical Services</SelectLabel>
                              <SelectItem value="Topic to Video">Topic to Video</SelectItem>
                              <SelectItem value="Video Editing">Video Editing</SelectItem>
                              <SelectItem value="Video to Shorts">Video to Shorts</SelectItem>
                              <SelectItem value="Thumbnail & Title Design">Thumbnail &amp; Title Design</SelectItem>
                              <SelectItem value="Social Media Consultation">Social Media Consultation</SelectItem>
                              <SelectItem value="Business Promotion">Business Promotion</SelectItem>
                              <SelectItem value="Pen Drive Data Recovery">Pen Drive Data Recovery</SelectItem>
                              <SelectItem value="Online Tech Support">Online Tech Support</SelectItem>
                            </SelectGroup>
                            <SelectSeparator className="contact-select-sep" />
                            <SelectGroup>
                              <SelectLabel className="contact-select-label-group">MarsNova Lab Courses</SelectLabel>
                              <SelectItem value="Computer Fundamentals">Computer Fundamentals</SelectItem>
                              <SelectItem value="AI Tools & Automation">AI Tools & Automation</SelectItem>
                              <SelectItem value="Video Editing Bootcamp">Video Editing Bootcamp</SelectItem>
                              <SelectItem value="Graphic Design">Graphic Design</SelectItem>
                              <SelectItem value="Social Media Growth">Social Media Growth</SelectItem>
                              <SelectItem value="Practical Projects">Practical Projects</SelectItem>
                            </SelectGroup>
                            <SelectSeparator className="contact-select-sep" />
                            <SelectGroup>
                              <SelectLabel className="contact-select-label-group">General</SelectLabel>
                              <SelectItem value="Custom Project / Other">Custom Project / Other</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {fieldErrors.service && (
                          <FieldError errors={[{ message: fieldErrors.service }]} />
                        )}

                        {/* Hidden Native Select for DOM & automated testing compliance */}
                        <select
                          ref={serviceRef}
                          id="contact-service-native"
                          name="service"
                          value={formData.service}
                          onChange={(e) => handleChange('service', e.target.value)}
                          onBlur={() => handleBlur('service')}
                          tabIndex={-1}
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            opacity: 0,
                            pointerEvents: 'none',
                            width: '1px',
                            height: '1px',
                            margin: '-1px'
                          }}
                        >
                          <option value="">Select a service</option>
                          <optgroup label="Creative & Technical Services">
                            <option value="Topic to Video">Topic to Video</option>
                            <option value="Video Editing">Video Editing</option>
                            <option value="Video to Shorts">Video to Shorts</option>
                            <option value="Thumbnail & Title Design">Thumbnail & Title Design</option>
                            <option value="Social Media Consultation">Social Media Consultation</option>
                            <option value="Business Promotion">Business Promotion</option>
                            <option value="Pen Drive Data Recovery">Pen Drive Data Recovery</option>
                            <option value="Online Tech Support">Online Tech Support</option>
                          </optgroup>
                          <optgroup label="MarsNova Lab Courses">
                            <option value="Computer Fundamentals">Computer Fundamentals</option>
                            <option value="AI Tools & Automation">AI Tools & Automation</option>
                            <option value="Video Editing Bootcamp">Video Editing Bootcamp</option>
                            <option value="Graphic Design">Graphic Design</option>
                            <option value="Social Media Growth">Social Media Growth</option>
                            <option value="Practical Projects">Practical Projects</option>
                          </optgroup>
                          <optgroup label="General">
                            <option value="Custom Project / Other">Custom Project / Other</option>
                          </optgroup>
                        </select>
                      </Field>
                    </div>

                    {/* Row 3: Project Details */}
                    <div className="contact-field-group" style={{ marginBottom: '18px' }}>
                      <label htmlFor="contact-message" className="contact-field-label">
                        Project Details
                      </label>
                      <div className="contact-textarea-wrapper">
                        <FileText size={18} className="contact-textarea-icon" style={{ color: '#0066FF' }} />
                        <textarea
                          ref={messageRef}
                          id="contact-message"
                          name="message"
                          rows={4}
                          required
                          placeholder="Briefly describe your project..."
                          value={formData.message}
                          aria-invalid={Boolean(fieldErrors.message)}
                          className={`contact-textarea ${fieldErrors.message ? 'error' : ''}`}
                          onChange={(e) => handleChange('message', e.target.value)}
                          onBlur={() => handleBlur('message')}
                        />
                      </div>
                      {fieldErrors.message && (
                        <p className="contact-field-error">{fieldErrors.message}</p>
                      )}
                    </div>

                    {/* Row 4: Controlled Privacy Consent */}
                    <label htmlFor="contact-consent" className="contact-consent-row">
                      <input
                        type="checkbox"
                        id="contact-consent"
                        name="consent"
                        checked={formData.consent}
                        onChange={(e) => setFormData((prev) => ({ ...prev, consent: e.target.checked }))}
                        style={{
                          position: 'absolute',
                          opacity: 0,
                          width: '1px',
                          height: '1px',
                          margin: '-1px',
                          overflow: 'hidden',
                          clip: 'rect(0, 0, 0, 0)',
                          pointerEvents: 'none'
                        }}
                        required
                      />
                      <div
                        className={`contact-check-box ${formData.consent ? 'checked' : ''}`}
                        aria-hidden="true"
                      >
                        {formData.consent && <Check size={13} strokeWidth={3} color="#FFFFFF" />}
                      </div>
                      <span className="contact-consent-text">
                        I consent to MarsNova saving my contact details and contacting me regarding this project enquiry via email, phone, or WhatsApp.
                      </span>
                    </label>

                    {/* Row 5: Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="contact-submit-btn"
                    >
                      <Send size={18} />
                      <span>{loading ? 'Submitting...' : 'Submit Enquiry'}</span>
                      <ArrowRight size={18} />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* =============================================================
              Right Column: "Chat on WhatsApp" & "Other Ways to Reach Us"
              ============================================================= */}
          <div className="contact-sidebar-col">
            {/* Top Card: Chat on WhatsApp */}
            <div className="contact-sidebar-card">
              <div className="contact-whatsapp-header">
                <div className="contact-whatsapp-icon-badge" aria-hidden="true">
                  <WhatsAppLogo size={22} color="#FFFFFF" />
                </div>
                <h2 className="contact-whatsapp-title">Chat on WhatsApp</h2>
              </div>

              {/* Chat Message Bubble */}
              <div className="contact-chat-bubble">
                <p className="contact-chat-text">
                  Hi, I'm interested in your services.
                  <br />
                  Please share more details.
                </p>
              </div>

              {/* WhatsApp Action Button */}
              <a
                href={`https://wa.me/917208591595?text=${encodeURIComponent(dynamicWhatsAppText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-whatsapp-btn"
              >
                <WhatsAppLogo size={18} color="#FFFFFF" />
                <span>Send on WhatsApp</span>
                <ArrowRight size={18} />
              </a>
            </div>

            {/* Bottom Card: Other Ways to Reach Us */}
            <div className="contact-sidebar-card">
              <h2 className="contact-reach-title">Other Ways to Reach Us</h2>

              <div className="contact-reach-list">
                {/* 1. Email */}
                <a href="mailto:hello@marsnova.in" className="contact-reach-item">
                  <div className="contact-reach-icon-box blue" aria-hidden="true">
                    <Mail size={19} color="#2563EB" />
                  </div>
                  <div className="contact-reach-text-col">
                    <span className="contact-reach-label">Email</span>
                    <strong className="contact-reach-value">hello@marsnova.in</strong>
                  </div>
                  <ChevronRight size={18} className="contact-reach-chevron" />
                </a>

                {/* 2. Instagram */}
                <a
                  href="https://instagram.com/marsnova.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-reach-item"
                >
                  <div className="contact-reach-icon-box instagram" aria-hidden="true">
                    <Instagram size={19} color="#FFFFFF" />
                  </div>
                  <div className="contact-reach-text-col">
                    <span className="contact-reach-label">Instagram</span>
                    <strong className="contact-reach-value">@marsnova.in</strong>
                  </div>
                  <ChevronRight size={18} className="contact-reach-chevron" />
                </a>

                {/* 3. Call Us */}
                <a href="tel:+917228867676" className="contact-reach-item">
                  <div className="contact-reach-icon-box blue" aria-hidden="true">
                    <Phone size={19} color="#2563EB" />
                  </div>
                  <div className="contact-reach-text-col">
                    <span className="contact-reach-label">Call Us</span>
                    <strong className="contact-reach-value">+91 72288 67 676</strong>
                  </div>
                  <ChevronRight size={18} className="contact-reach-chevron" />
                </a>
              </div>

              {/* Studio Presence & Direct Verified Channel Footer */}
              <div className="contact-location-footer">
                <div className="contact-location-info">
                  <MapPin size={14} color="#0066FF" />
                  <span>{'Mumbai & Delhi NCR, India'}</span>
                </div>
                <span className="contact-wa-verified">WhatsApp: +91 7208591595</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
