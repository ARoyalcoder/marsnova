import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, ArrowRight, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { PageTransition } from '../components/animations/PageTransition';
import { workPortfolioData } from '../data';
import { WorkItem } from '../types';
import { apiClient } from '../api';
import { SharedCTA } from '../components/SharedCTA';
import { PageContainer } from '../components/PageContainer';
import { Button, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { usePageSEO } from '../utils/seo';

interface PortfolioPageProps {
  onOpenVideo: (url: string, title: string) => void;
}

// Fallback generator for media failures
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  target.onerror = null;
  target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%23080F1D"/><circle cx="400" cy="225" r="50" fill="%23101B2B"/><text x="400" y="232" fill="%23A855F7" font-size="20" font-family="sans-serif" font-weight="bold" text-anchor="middle">MarsNova Media</text></svg>';
};

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ onOpenVideo }) => {
  const [activeTab, setActiveTab] = useState<string>('All');
  const [items, setItems] = useState<WorkItem[]>(workPortfolioData);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  usePageSEO({
    title: 'Creative Portfolio & Video Case Studies | MarsNova',
    description:
      'Explore MarsNova recent video projects, YouTube channel transformations, high-retention vertical shorts, commercial brand shoots and social media campaigns.',
    canonicalPath: '/portfolio'
  });

  // Connect to Drogon Backend via typed API client
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    async function fetchPortfolio() {
      setLoading(true);
      setError(null);

      try {
        const res = await apiClient.getPortfolio(
          { category: activeTab === 'All' ? undefined : activeTab },
          { signal: controller.signal }
        );
        if (isMounted) {
          setItems(res.data);
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          return;
        }
        if (isMounted) {
          setError(err.message || 'Unable to connect to MarsNova portfolio service.');
          setLoading(false);
        }
      }
    }

    fetchPortfolio();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [activeTab, retryCount]);

  const tabs = ['All', 'YouTube Videos', 'Shorts', 'Business Promotion', 'Social Media'];
  const shouldReduceMotion = useReducedMotion();

  return (
    <PageTransition>
      <PageContainer
        eyebrow="Creative Portfolio"
        title="Our Work"
        subtitle="Some of our recent video projects, promotions, channel transformations and creative work."
      >
        {/* Category Tabs */}
        <div className="filter-tabs" role="tablist" aria-label="Portfolio Categories">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Error State with explicit Retry action (no silent fallback in production) */}
        {error ? (
          <div style={{ maxWidth: '640px', margin: '0 auto 40px auto' }}>
            <ErrorState
              title="Failed to Load Portfolio"
              message={error}
              onRetry={() => setRetryCount((c) => c + 1)}
            />
          </div>
        ) : loading ? (
          /* Loading Skeleton State */
          <div className="cards-grid-4" aria-busy="true" aria-label="Loading portfolio items">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="work-card" style={{ opacity: 0.8 }}>
                <Skeleton width="100%" height="180px" borderRadius="12px" style={{ marginBottom: '16px' }} />
                <Skeleton width="50px" height="18px" borderRadius="100px" style={{ marginBottom: '10px' }} />
                <Skeleton width="80%" height="20px" style={{ marginBottom: '8px' }} />
                <Skeleton width="40%" height="14px" style={{ marginBottom: '16px' }} />
                <Skeleton width="100%" height="30px" borderRadius="6px" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Empty State when filter has no matches */
          <EmptyState
            title="No case studies found"
            description={`No creative projects match the category "${activeTab}".`}
            action={{
              label: 'View All Projects',
              onClick: () => setActiveTab('All')
            }}
          />
        ) : (
          /* Portfolio Cards Grid */
          <motion.div layout className="cards-grid-4">
            <AnimatePresence mode="popLayout">
              {items.map((work) => {
                const targetSlug = work.slug || work.id;
                return (
                  <motion.div
                    key={work.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.22 }}
                    whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                    className="work-card"
                  >
                    <div
                      className="work-thumb-wrapper"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpenVideo(work.videoUrl || '', work.title);
                        }
                      }}
                      onClick={() => onOpenVideo(work.videoUrl || '', work.title)}
                      aria-label={`Play ${work.title} video`}
                    >
                      <img
                        src={work.thumbnailUrl}
                        alt={`${work.title} video thumbnail`}
                        className="work-thumb"
                        loading="lazy"
                        decoding="async"
                        onError={handleImageError}
                      />
                      <div className="play-overlay-btn" aria-hidden="true">
                        <Play size={18} fill="#fff" />
                      </div>
                    </div>

                    <div className="work-info">
                      <div className="work-tag">{work.tag}</div>
                      <h3 className="work-title" style={{ fontSize: '16px', marginBottom: '8px' }}>
                        <Link to={`/portfolio/${targetSlug}`} style={{ color: 'inherit' }}>
                          {work.title}
                        </Link>
                      </h3>
                      {work.client && (
                        <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                          {work.client}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-muted)' }}>
                        <Link
                          to={`/portfolio/${targetSlug}`}
                          className="card-link"
                          style={{ fontSize: '13px' }}
                          aria-label={`Read case study for ${work.title}`}
                        >
                          Case Study <ChevronRight size={13} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => onOpenVideo(work.videoUrl || '', work.title)}
                          style={{ background: 'none', color: 'var(--cyan-accent)', fontSize: '12px', fontWeight: 600, padding: 0 }}
                          aria-label={`Watch ${work.title}`}
                        >
                          Watch ▶
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </PageContainer>

      <SharedCTA
        title="Have a Video or Campaign in Mind?"
        subtitle="From initial concept to full scripting, shooting, editing, and YouTube optimization — we handle everything in-house."
      />
    </PageTransition>
  );
};
