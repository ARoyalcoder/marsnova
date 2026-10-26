import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Briefcase,
  Layers,
  Wrench,
  CheckCircle2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { workPortfolioData } from '../data';
import { WorkItem } from '../types';
import { apiClient } from '../api';
import { Button, Card, Badge, Container, EmptyState, ErrorState, LoadingSpinner, Skeleton } from '../components/ui';
import { PageTransition } from '../components/animations/PageTransition';
import { SharedCTA } from '../components/SharedCTA';
import { usePageSEO } from '../utils/seo';

interface PortfolioDetailPageProps {
  onOpenVideo: (url: string, title: string) => void;
}

// Fallback generator for media failures
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  target.onerror = null;
  target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%23080F1D"/><circle cx="400" cy="225" r="50" fill="%23101B2B"/><text x="400" y="232" fill="%23A855F7" font-size="20" font-family="sans-serif" font-weight="bold" text-anchor="middle">MarsNova Media</text></svg>';
};

export const PortfolioDetailPage: React.FC<PortfolioDetailPageProps> = ({ onOpenVideo }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [mediaFailed, setMediaFailed] = useState(false);

  const [work, setWork] = useState<WorkItem | null>(() => {
    return workPortfolioData.find((w) => w.id === slug) || null;
  });
  const [allWork, setAllWork] = useState<WorkItem[]>([]);
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

    const controller = new AbortController();
    let isMounted = true;

    async function fetchCaseStudy() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const res = await apiClient.getPortfolio(undefined, { signal: controller.signal });
        if (isMounted) {
          setAllWork(res.data);
          const match = res.data.find((w) => w.slug === slug || w.id === slug);
          if (match) {
            setWork(match);
          } else {
            setNotFound(true);
            setWork(null);
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          return;
        }
        if (isMounted) {
          setError(err.message || 'Failed to load case study details.');
          setLoading(false);
        }
      }
    }

    fetchCaseStudy();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [slug, retryCount]);

  usePageSEO({
    title: work ? `${work.title} — Case Study | MarsNova` : notFound ? 'Case Study Not Found | MarsNova' : 'Case Study | MarsNova',
    description: work?.summary || work?.title,
    canonicalPath: `/portfolio/${slug}`,
    ogImage: work?.thumbnailUrl,
    jsonLd: work
      ? {
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: work.title,
          description: work.summary || work.title,
          image: work.thumbnailUrl,
          creator: {
            '@type': 'Organization',
            name: 'MarsNova',
            url: 'https://marsnova.in'
          }
        }
      : undefined
  });

  // 1. Error State
  if (error) {
    return (
      <div style={{ padding: '80px 0' }}>
        <Container size="narrow">
          <ErrorState
            title="Unable to Load Case Study"
            message={error}
            onRetry={() => setRetryCount((c) => c + 1)}
          />
        </Container>
      </div>
    );
  }

  // 2. Loading State
  if (loading && !work) {
    return (
      <div style={{ padding: '80px 0' }}>
        <Container size="narrow">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <LoadingSpinner size="md" label="Loading case study..." />
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Fetching case study from MarsNova backend...</span>
          </div>
          <Skeleton width="100%" height="240px" borderRadius="12px" style={{ marginBottom: '24px' }} />
          <Skeleton width="60%" height="32px" style={{ marginBottom: '16px' }} />
          <Skeleton width="100%" height="80px" />
        </Container>
      </div>
    );
  }

  // 3. Invalid Slug Handling
  if (notFound || !work) {
    return (
      <div style={{ padding: '80px 0' }}>
        <Container size="narrow">
          <EmptyState
            headingLevel={1}
            title="Case Study Not Found"
            description={`We could not find a case study matching "/portfolio/${slug}". Browse our complete creative work catalog.`}
            action={{
              label: 'Back to All Portfolio',
              onClick: () => navigate('/portfolio')
            }}
          />
        </Container>
      </div>
    );
  }

  // Related projects come from the same API list the page resolved the slug from,
  // so every link points at a slug the backend actually serves.
  const relatedProjects = allWork
    .filter((item) => item.id !== work.id && !(item.slug && item.slug === work.slug))
    .slice(0, 3);

  return (
    <PageTransition>
      <div style={{ padding: '40px 0 0' }}>
      <Container>
        {/* Back Link */}
        <Link
          to="/portfolio"
          className="card-link"
          style={{ marginBottom: '28px', display: 'inline-flex', fontSize: '14px' }}
        >
          <ArrowLeft size={16} /> All Portfolio & Case Studies
        </Link>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <Badge variant="cyan">{work.category}</Badge>
            <Badge variant="purple">{work.tag}</Badge>
          </div>

          <h1 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, color: '#fff', lineHeight: 1.15 }}>
            {work.title}
          </h1>

          {work.client && (
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginTop: '8px' }}>
              Client: <strong style={{ color: 'var(--text-white)' }}>{work.client}</strong>
            </p>
          )}

          {work.summary && (
            <p style={{ color: 'var(--text-muted)', fontSize: '17px', maxWidth: '780px', marginTop: '12px', lineHeight: 1.6 }}>
              {work.summary}
            </p>
          )}
        </div>

        {/* Featured Media Banner with Play Button */}
        <div
          className="responsive-media-banner"
          style={{
            marginBottom: '48px',
            border: '1px solid var(--border-highlight)',
            background: '#000',
            cursor: 'pointer'
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenVideo(work.videoUrl || '', work.title);
            }
          }}
          onClick={() => onOpenVideo(work.videoUrl || '', work.title)}
          aria-label={`Watch ${work.title} video`}
        >
          {mediaFailed ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <AlertTriangle size={36} color="var(--purple-glow)" style={{ marginBottom: '12px' }} />
              <p>Media preview unavailable. Click to play stream.</p>
            </div>
          ) : (
            <img
              src={work.thumbnailUrl}
              alt={`${work.title} presentation preview`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                setMediaFailed(true);
                handleImageError(e);
              }}
            />
          )}

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(3, 9, 18, 0.2) 0%, rgba(3, 9, 18, 0.8) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div className="play-overlay-btn" style={{ width: '64px', height: '64px' }} aria-hidden="true">
              <Play size={24} fill="#fff" />
            </div>
          </div>
        </div>

        {/* Verified Metrics Highlights */}
        {work.metrics && work.metrics.length > 0 && (
          <div className="stats-bar" style={{ margin: '0 0 60px' }}>
            {work.metrics.map((m, idx) => (
              <div key={idx} className="stat-item">
                <div className="stat-value gradient-text">{m.value}</div>
                <div className="stat-label">{m.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* 2-Column Content Layout */}
        <div className="responsive-detail-grid" style={{ marginBottom: '80px' }}>
          {/* Left Column: Challenge, Approach & Outcome */}
          <div>
            {work.challenge && (
              <Card className="responsive-card-padding" style={{ marginBottom: '32px' }}>
                <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '14px' }}>
                  The Challenge
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.8 }}>
                  {work.challenge}
                </p>
              </Card>
            )}

            {work.approach && (
              <Card className="responsive-card-padding" style={{ marginBottom: '32px' }}>
                <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '14px' }}>
                  Our Approach & Production Strategy
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.8 }}>
                  {work.approach}
                </p>
              </Card>
            )}

            {work.outcome && (
              <Card className="responsive-card-padding">
                <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '14px' }}>
                  The Outcome & Results
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.8 }}>
                  {work.outcome}
                </p>
              </Card>
            )}
          </div>

          {/* Right Column: Project Meta & CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Deliverables Card */}
            {work.deliverables && work.deliverables.length > 0 && (
              <Card className="responsive-card-padding">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <Layers size={20} color="var(--cyan-accent)" />
                  <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>
                    Project Deliverables
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {work.deliverables.map((deliv, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-white)' }}>
                      <CheckCircle2 size={16} color="var(--purple-glow)" />
                      <span>{deliv}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Production Tools Card */}
            {work.tools && work.tools.length > 0 && (
              <Card style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <Wrench size={20} color="var(--purple-glow)" />
                  <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>
                    Production Stack
                  </h3>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {work.tools.map((tool, i) => (
                    <span
                      key={i}
                      style={{
                        background: 'var(--bg-deep)',
                        border: '1px solid var(--border-muted)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 12px',
                        fontSize: '12px',
                        color: 'var(--text-white)',
                        fontWeight: 600
                      }}
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Quick Action Card */}
            <Card
              variant="glow"
              className="responsive-card-padding"
              style={{
                background: 'linear-gradient(135deg, rgba(8, 15, 29, 0.95) 0%, rgba(16, 27, 43, 0.8) 100%)'
              }}
            >
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                Start a Similar Project
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px' }}>
                Interested in achieving similar retention or promotional results for your brand?
              </p>
              <Link to={`/contact?service=${encodeURIComponent(work.category)}`}>
                <Button variant="primary" size="md" fullWidth rightIcon={<ArrowRight size={16} />}>
                  Discuss Your Project
                </Button>
              </Link>
            </Card>
          </div>
        </div>

        {/* Related Projects Section */}
        {relatedProjects.length > 0 && (
          <div style={{ marginBottom: '80px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '24px' }}>
              More Case Studies
            </h2>
            <div className="cards-grid-3">
              {relatedProjects.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/portfolio/${rel.slug || rel.id}`}
                  className="work-card"
                  style={{ display: 'block' }}
                >
                  <div className="work-thumb-wrapper">
                    <img
                      src={rel.thumbnailUrl}
                      alt={`${rel.title} case study thumbnail`}
                      className="work-thumb"
                      loading="lazy"
                      decoding="async"
                      onError={handleImageError}
                    />
                    <div className="play-overlay-btn" aria-hidden="true">
                      <Play size={16} fill="#fff" />
                    </div>
                  </div>
                  <div className="work-info">
                    <div className="work-tag">{rel.tag}</div>
                    <h4 className="work-title" style={{ fontSize: '15px' }}>{rel.title}</h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Container>

      <SharedCTA
        title="Ready to Create Content That Converts?"
        subtitle="Schedule a consultation with our creative directors or request a customized production quote."
      />
    </div>
  </PageTransition>
);
};
