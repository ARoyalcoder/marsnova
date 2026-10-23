import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Target,
  MessageCircle,
  HardDrive,
  Video,
  Scissors,
  Film,
  Image as ImageIcon,
  Users,
  Store,
  Headphones,
  PackageCheck
} from 'lucide-react';
import { servicesData } from '../data';
import { ServiceItem } from '../types';
import { apiClient, NotFoundError } from '../api';
import { Button, Card, Badge, Container, EmptyState, ErrorState, LoadingSpinner, Skeleton } from '../components/ui';
import { PageTransition } from '../components/animations/PageTransition';
import { SharedCTA } from '../components/SharedCTA';
import { usePageSEO } from '../utils/seo';

interface ServiceDetailPageProps {
  onOpenRecoveryTracker?: () => void;
}

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({ onOpenRecoveryTracker }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [service, setService] = useState<ServiceItem | null>(() => {
    return servicesData.find((s) => s.id === slug) || null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Connect to Drogon Backend via typed API client
  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const activeSlug: string = slug;

    const controller = new AbortController();
    let isMounted = true;

    async function fetchDetail() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const item = await apiClient.getServiceBySlug(activeSlug, { signal: controller.signal });
        if (isMounted) {
          setService(item);
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          return;
        }
        if (isMounted) {
          if (err instanceof NotFoundError || err.status === 404) {
            setNotFound(true);
            setService(null);
          } else {
            setError(err.message || 'Failed to load service details.');
          }
          setLoading(false);
        }
      }
    }

    fetchDetail();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [slug, retryCount]);

  usePageSEO({
    title: service ? `${service.title} | MarsNova Studio Services` : notFound ? 'Service Not Found | MarsNova' : 'Service | MarsNova',
    description: service?.description,
    canonicalPath: `/services/${slug}`,
    jsonLd: service
      ? {
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: service.title,
          description: service.description,
          provider: {
            '@type': 'Organization',
            name: 'MarsNova',
            url: 'https://marsnova.in'
          },
          serviceType: service.category
        }
      : undefined
  });

  // Dynamic document metadata
  useEffect(() => {
    if (service) {
      document.title = `${service.title} | MarsNova Studio Services`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', service.description);
      }
    } else if (notFound) {
      document.title = 'Service Not Found | MarsNova';
    }
  }, [service, notFound]);

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'Video': return <Video size={28} />;
      case 'Scissors': return <Scissors size={28} />;
      case 'Film': return <Film size={28} />;
      case 'Image': return <ImageIcon size={28} />;
      case 'Users': return <Users size={28} />;
      case 'Store': return <Store size={28} />;
      case 'HardDrive': return <HardDrive size={28} />;
      case 'Headphones': return <Headphones size={28} />;
      default: return <Video size={28} />;
    }
  };

  // 1. Error State
  if (error) {
    return (
      <div style={{ padding: '80px 0' }}>
        <Container size="narrow">
          <ErrorState
            title="Unable to Load Service Details"
            message={error}
            onRetry={() => setRetryCount((c) => c + 1)}
          />
        </Container>
      </div>
    );
  }

  // 2. Loading State
  if (loading && !service) {
    return (
      <div style={{ padding: '80px 0' }}>
        <Container size="narrow">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <LoadingSpinner size="md" label="Loading service details..." />
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Connecting to MarsNova backend...</span>
          </div>
          <Skeleton width="40%" height="32px" style={{ marginBottom: '16px' }} />
          <Skeleton width="100%" height="80px" style={{ marginBottom: '24px' }} />
          <Skeleton width="100%" height="200px" borderRadius="12px" />
        </Container>
      </div>
    );
  }

  // 3. Invalid Slug / Not Found -> Accessible EmptyState
  if (notFound || !service) {
    return (
      <div style={{ padding: '80px 0' }}>
        <Container size="narrow">
          <EmptyState
            title="Service Not Found"
            description={`We could not find a service matching "/services/${slug}". Please check our solutions directory for available services.`}
            action={{
              label: 'Explore All Services',
              onClick: () => navigate('/services')
            }}
          />
        </Container>
      </div>
    );
  }

  const encodedEnquiryUrl = `/contact?service=${encodeURIComponent(service.title)}`;
  const waUrl = `https://wa.me/917208591595?text=${encodeURIComponent(
    `Hi MarsNova, I am interested in your "${service.title}" service.`
  )}`;

  return (
    <PageTransition>
      <div style={{ padding: '40px 0 0' }}>
      <Container>
        {/* Back Link */}
        <Link
          to="/services"
          className="card-link"
          style={{ marginBottom: '28px', display: 'inline-flex', fontSize: '14px' }}
        >
          <ArrowLeft size={16} /> All Services
        </Link>

        {/* Hero Header */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Badge variant="cyan">{service.category}</Badge>
            {service.badge && <Badge variant="purple">{service.badge}</Badge>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div className="service-icon-box" style={{ width: '56px', height: '56px', marginBottom: 0 }}>
              {getServiceIcon(service.icon)}
            </div>
            <div>
              <h1 style={{ fontSize: '38px', fontWeight: 800, color: '#fff', lineHeight: 1.15 }}>
                {service.title}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '17px', maxWidth: '700px', marginTop: '8px' }}>
                {service.description}
              </p>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '40px', marginBottom: '80px' }}>
          {/* Left Column: Details, Features & Deliverables */}
          <div>
            <Card style={{ padding: '36px', marginBottom: '32px' }}>
              <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
                Overview & Process
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.8 }}>
                {service.longDescription || service.description}
              </p>
            </Card>

            {service.features && service.features.length > 0 && (
              <Card style={{ padding: '36px', marginBottom: '32px' }}>
                <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
                  What's Included
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {service.features.map((feat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <CheckCircle2 size={18} color="var(--cyan-accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ color: 'var(--text-white)', fontSize: '14px', lineHeight: 1.6 }}>
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {service.deliverables && service.deliverables.length > 0 && (
              <Card style={{ padding: '36px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <PackageCheck size={20} color="var(--purple-glow)" />
                  <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700 }}>
                    Final Deliverables
                  </h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {service.deliverables.map((deliv, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'var(--bg-deep)',
                        border: '1px solid var(--border-muted)',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        fontSize: '14px',
                        color: 'var(--text-white)'
                      }}
                    >
                      {deliv}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Quick Info & Enquire Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Card
              variant="glow"
              style={{
                padding: '36px',
                background: 'linear-gradient(135deg, rgba(8, 15, 29, 0.95) 0%, rgba(16, 27, 43, 0.8) 100%)'
              }}
            >
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
                Service Snapshot
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '28px' }}>
                {service.turnaroundTime && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="channel-icon" style={{ width: '36px', height: '36px' }}>
                      <Clock size={16} />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>ESTIMATED TIME</span>
                      <strong style={{ fontSize: '14px', color: '#fff' }}>{service.turnaroundTime}</strong>
                    </div>
                  </div>
                )}

                {service.idealFor && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div className="channel-icon" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                      <Target size={16} />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>IDEAL FOR</span>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '2px' }}>
                        {service.idealFor}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Enquiry Button with Prefilled Service */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link to={encodedEnquiryUrl}>
                  <Button variant="primary" size="md" fullWidth rightIcon={<ArrowRight size={16} />}>
                    Enquire About This Service
                  </Button>
                </Link>

                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-md btn-full"
                >
                  <MessageCircle size={16} color="#22c55e" style={{ marginRight: '6px' }} />
                  Chat on WhatsApp
                </a>
              </div>
            </Card>
          </div>
        </div>
      </Container>

      <SharedCTA
        title={`Ready to Get Started with ${service.title}?`}
        subtitle="Contact the MarsNova production team today to receive a customized brief analysis and timeline."
      />
    </div>
  </PageTransition>
);
};
