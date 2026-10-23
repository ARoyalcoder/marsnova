import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Mail,
  Instagram,
  MessageCircle,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageTransition } from '../components/animations/PageTransition';
import { fadeInUp } from '../animations/variants';
import { submitEnquiry, validateEnquiryPayload, EnquirySubmissionResult } from '../api';
import {
  Button,
  Input,
  NativeSelect,
  Textarea,
  Card,
  ErrorState,
  Container,
  Badge,
  toast,
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea
} from '../components/ui';
import { BugReportForm } from '../components/BugReportForm';
import { usePageSEO } from '../utils/seo';

export const ContactPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const prefilledService = searchParams.get('service') || '';

  const [formMode, setFormMode] = useState<'enquiry' | 'bug'>(
    searchParams.get('tab') === 'bug' || searchParams.get('mode') === 'bug' ? 'bug' : 'enquiry'
  );
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: prefilledService,
    message: '',
    consent: true
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<EnquirySubmissionResult | null>(null);
  const [errorNotice, setErrorNotice] = useState<string>('');

  // Refs for keyboard focus management
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
        consent: true
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
      consent: true
    });
  };

  return (
    <PageTransition>
      <div style={{ padding: '60px 0 80px' }}>
      <Container>
        <div className="section-header">
          <h1 className="section-title">
            Contact <span className="gradient-text">MarsNova</span>
          </h1>
          <p className="section-subtitle">
            Have a question, creative brief, or course inquiry? We're here to help.
          </p>
        </div>

        <div className="contact-grid">
          {/* Left Column: Form & Feedback UI */}
          <Card className="contact-card" style={{ padding: '36px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
              {formMode === 'bug' ? 'Report a Bug' : 'Send Us an Enquiry'}
            </h2>

            {/* Form Mode Tabs: Project Enquiry vs Bug Report */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                background: 'var(--surface-card, #080F1D)',
                padding: '4px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #101B2B)'
              }}
            >
              <button
                type="button"
                onClick={() => setFormMode('enquiry')}
                className={`btn btn-sm ${formMode === 'enquiry' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, padding: '8px 12px', fontSize: '13px', borderRadius: '6px' }}
              >
                Project Enquiry
              </button>
              <button
                type="button"
                onClick={() => setFormMode('bug')}
                className={`btn btn-sm ${formMode === 'bug' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, padding: '8px 12px', fontSize: '13px', borderRadius: '6px' }}
              >
                Report a Bug
              </button>
            </div>

            {formMode === 'bug' ? (
              <BugReportForm className="w-full" onCancel={() => setFormMode('enquiry')} />
            ) : (
              <>
                {/* Error Banner */}
                {errorNotice && (
                  <ErrorState
                    title="Submission Alert"
                    message={errorNotice}
                    style={{ marginBottom: '24px' }}
                  />
                )}

                {/* Success or Offline-Queued State Notice */}
                {submissionResult ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  padding: '24px',
                  borderRadius: 'var(--radius-lg)',
                  background:
                    submissionResult.status === 'saved_to_server'
                      ? 'rgba(34, 197, 94, 0.08)'
                      : 'rgba(245, 158, 11, 0.08)',
                  border:
                    submissionResult.status === 'saved_to_server'
                      ? '1px solid rgba(34, 197, 94, 0.3)'
                      : '1px solid rgba(245, 158, 11, 0.3)'
                }}
                role="status"
                aria-live="polite"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {submissionResult.status === 'saved_to_server' ? (
                    <CheckCircle2 size={24} color="#22c55e" />
                  ) : (
                    <AlertTriangle size={24} color="#f59e0b" />
                  )}
                  <div>
                    <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 700 }}>
                      {submissionResult.status === 'saved_to_server'
                        ? 'Enquiry Recorded Successfully'
                        : 'Enquiry Buffered Locally'}
                    </h3>
                    {submissionResult.enquiryId && (
                      <Badge variant={submissionResult.status === 'saved_to_server' ? 'success' : 'purple'}>
                        Ref: {submissionResult.enquiryId}
                      </Badge>
                    )}
                  </div>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>
                  {submissionResult.message}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  <a
                    href={submissionResult.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      textDecoration: 'none'
                    }}
                  >
                    <MessageCircle size={18} />
                    <span>Open WhatsApp Chat</span>
                  </a>

                  <Button variant="outline" size="md" onClick={handleResetForm} leftIcon={<RotateCcw size={16} />}>
                    Send Another Enquiry
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form" noValidate>
                <FieldGroup>
                  <Field data-invalid={Boolean(fieldErrors.name)}>
                    <FieldLabel htmlFor="contact-name">
                      Full Name <span style={{ color: '#ef4444' }}>*</span>
                    </FieldLabel>
                    <Input
                      ref={nameRef}
                      id="contact-name"
                      name="name"
                      required
                      placeholder="e.g. Aarav Sharma"
                      value={formData.name}
                      aria-invalid={Boolean(fieldErrors.name)}
                      error={fieldErrors.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      onBlur={() => handleBlur('name')}
                    />
                    {fieldErrors.name && (
                      <FieldError errors={[{ message: fieldErrors.name }]} />
                    )}
                  </Field>

                  <Field data-invalid={Boolean(fieldErrors.email)}>
                    <FieldLabel htmlFor="contact-email">
                      Email Address <span style={{ color: '#ef4444' }}>*</span>
                    </FieldLabel>
                    <Input
                      ref={emailRef}
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      placeholder="e.g. aarav@example.com"
                      value={formData.email}
                      aria-invalid={Boolean(fieldErrors.email)}
                      error={fieldErrors.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                    />
                    {fieldErrors.email && (
                      <FieldError errors={[{ message: fieldErrors.email }]} />
                    )}
                  </Field>

                  <Field data-invalid={Boolean(fieldErrors.phone)}>
                    <FieldLabel htmlFor="contact-phone">
                      Phone / WhatsApp Number (Optional)
                    </FieldLabel>
                    <Input
                      ref={phoneRef}
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      aria-invalid={Boolean(fieldErrors.phone)}
                      error={fieldErrors.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      onBlur={() => handleBlur('phone')}
                    />
                    <FieldDescription>
                      Optional — used for WhatsApp updates and direct project coordination.
                    </FieldDescription>
                    {fieldErrors.phone && (
                      <FieldError errors={[{ message: fieldErrors.phone }]} />
                    )}
                  </Field>

                  <Field data-invalid={Boolean(fieldErrors.service)}>
                    <FieldLabel htmlFor="contact-service">
                      Service or Course Interest <span style={{ color: '#ef4444' }}>*</span>
                    </FieldLabel>
                    <NativeSelect
                      ref={serviceRef}
                      id="contact-service"
                      name="service"
                      required
                      value={formData.service}
                      error={fieldErrors.service}
                      onChange={(e) => handleChange('service', e.target.value)}
                      onBlur={() => handleBlur('service')}
                    >
                      <option value="">Select a service or course interest...</option>
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
                    </NativeSelect>
                    {fieldErrors.service && (
                      <FieldError errors={[{ message: fieldErrors.service }]} />
                    )}
                  </Field>

                  <Field data-invalid={Boolean(fieldErrors.message)}>
                    <FieldLabel htmlFor="contact-message">
                      Project Details or Question <span style={{ color: '#ef4444' }}>*</span>
                    </FieldLabel>
                    <InputGroup data-invalid={Boolean(fieldErrors.message)}>
                      <InputGroupTextarea
                        ref={messageRef}
                        id="contact-message"
                        name="message"
                        rows={4}
                        required
                        placeholder="Tell us about your project timeline, topic, channel, or data recovery situation..."
                        value={formData.message}
                        aria-invalid={Boolean(fieldErrors.message)}
                        onChange={(e) => handleChange('message', e.target.value)}
                        onBlur={() => handleBlur('message')}
                      />
                      <InputGroupAddon align="block-end">
                        <InputGroupText className="tabular-nums">
                          {formData.message.length} characters (min 10)
                        </InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldDescription>
                      Minimum 10 characters.
                    </FieldDescription>
                    {fieldErrors.message && (
                      <FieldError errors={[{ message: fieldErrors.message }]} />
                    )}
                  </Field>

                  <div style={{ margin: '14px 0 20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <input
                      type="checkbox"
                      id="contact-consent"
                      name="consent"
                      checked={formData.consent}
                      onChange={(e) => setFormData((prev) => ({ ...prev, consent: e.target.checked }))}
                      style={{ marginTop: '3px', accentColor: 'var(--cyan-accent)', width: '16px', height: '16px', cursor: 'pointer' }}
                      required
                    />
                    <label htmlFor="contact-consent" style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4', cursor: 'pointer' }}>
                      I consent to MarsNova saving my contact details and contacting me regarding this project enquiry via email, phone, or WhatsApp.
                    </label>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={loading}
                    rightIcon={<ArrowRight size={16} />}
                    fullWidth
                    style={{ marginTop: '8px' }}
                  >
                    Submit Enquiry
                  </Button>
                </FieldGroup>
              </form>
            )}
          </>
        )}
      </Card>

          {/* Right Column: Other Ways to Reach Us */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Card className="contact-card" style={{ padding: '36px' }}>
              <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
                Other Ways to Reach Us
              </h2>

              <div className="contact-channels">
                <a href="mailto:hello@marsnova.in" className="channel-item">
                  <div className="channel-icon">
                    <Mail size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block' }}>Email</span>
                    <strong style={{ fontSize: '14px', color: '#fff' }}>hello@marsnova.in</strong>
                  </div>
                </a>

                <a
                  href="https://instagram.com/marsnova.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="channel-item"
                >
                  <div className="channel-icon" style={{ color: 'var(--purple-glow)' }}>
                    <Instagram size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block' }}>Instagram</span>
                    <strong style={{ fontSize: '14px', color: '#fff' }}>@marsnova.in</strong>
                  </div>
                </a>

                <a
                  href="https://wa.me/917208591595"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="channel-item"
                >
                  <div className="channel-icon" style={{ color: '#22c55e' }}>
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block' }}>WhatsApp</span>
                    <strong style={{ fontSize: '14px', color: '#fff' }}>+91 7208591595</strong>
                  </div>
                </a>

                <div className="channel-item">
                  <div className="channel-icon">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block' }}>Locations</span>
                    <strong style={{ fontSize: '14px', color: '#fff' }}>Mumbai & Delhi NCR, India</strong>
                  </div>
                </div>
              </div>
            </Card>

            {/* Business Enquiries Callout */}
            <Card
              variant="glow"
              className="contact-card"
              style={{
                background:
                  'linear-gradient(135deg, rgba(121, 25, 245, 0.15) 0%, rgba(8, 15, 29, 0.95) 100%)',
                padding: '36px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <Briefcase size={20} color="var(--cyan-accent)" />
                <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>
                  Brand & Commercial Partnerships
                </h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
                For brand promotions, creator sponsorships, institutional training, and enterprise data recovery
                reconstruction.
              </p>
              <a
                href="https://wa.me/917208591595?text=Hi%20MarsNova%20Team%2C%20I%20would%20like%20to%20discuss%20a%20Business%20Partnership%20or%20Promotion."
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
              >
                <span>Partner With Us</span>
                <ArrowRight size={14} />
              </a>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  </PageTransition>
);
};
