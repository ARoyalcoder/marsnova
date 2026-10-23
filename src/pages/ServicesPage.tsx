import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Video,
  Scissors,
  Film,
  Image as ImageIcon,
  Users,
  Store,
  HardDrive,
  Headphones,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { PageTransition } from '../components/animations/PageTransition';
import { servicesData } from '../data';
import { ServiceItem } from '../types';
import { apiClient } from '../api';
import { Button, Card, Badge, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { PageContainer } from '../components/PageContainer';
import { SharedCTA } from '../components/SharedCTA';
import { usePageSEO } from '../utils/seo';

interface ServicesPageProps {
  onOpenRecoveryTracker?: () => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onOpenRecoveryTracker }) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [services, setServices] = useState<ServiceItem[]>(servicesData);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  usePageSEO({
    title: 'Our Services — Video, Social Media, Promotion & Tech | MarsNova',
    description:
      'Explore MarsNova creative and technical solutions: Topic to Video, Video Editing, Shorts, Thumbnail & Title, Business Promotion, and Pen Drive Data Recovery.',
    canonicalPath: '/services',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'MarsNova Services',
      itemListElement: services.map((s, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'Service',
          name: s.title,
          description: s.description,
          url: `https://marsnova.in/services/${s.id}`
        }
      }))
    }
  });

  // Connect to Drogon Backend via typed API client
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    async function fetchServices() {
      setLoading(true);
      setError(null);

      try {
        const res = await apiClient.getServices(
          { category: activeCategory === 'All' ? undefined : activeCategory },
          { signal: controller.signal }
        );
        if (isMounted) {
          setServices(res.data);
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          return; // Prevent unhandled rejection on abort
        }
        if (isMounted) {
          setError(err.message || 'Unable to connect to MarsNova backend services.');
          setLoading(false);
        }
      }
    }

    fetchServices();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [activeCategory, retryCount]);

  const categories = ['All', 'Video', 'Social Media', 'Promotion', 'Tech'];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Video': return <Video size={20} />;
      case 'Scissors': return <Scissors size={20} />;
      case 'Film': return <Film size={20} />;
      case 'Image': return <ImageIcon size={20} />;
      case 'Users': return <Users size={20} />;
      case 'Store': return <Store size={20} />;
      case 'HardDrive': return <HardDrive size={20} />;
      case 'Headphones': return <Headphones size={20} />;
      default: return <Video size={20} />;
    }
  };

  const shouldReduceMotion = useReducedMotion();

  return (
    <PageTransition>
      <PageContainer
        eyebrow="Solutions Directory"
        title="Our Services"
        subtitle="Complete solutions for creators, businesses and tech users"
      >
        {/* Category Filter Tabs */}
        <div className="filter-tabs" role="tablist" aria-label="Service categories">
          {categories.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
              className={`filter-tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Error State with explicit Retry action (no silent fallback in production) */}
        {error ? (
          <div style={{ maxWidth: '640px', margin: '0 auto 40px auto' }}>
            <ErrorState
              title="Failed to Load Services"
              message={error}
              onRetry={() => setRetryCount((c) => c + 1)}
            />
          </div>
        ) : loading ? (
          /* Loading Skeleton State */
          <div className="cards-grid-4" aria-busy="true" aria-label="Loading services">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="service-card" style={{ opacity: 0.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <Skeleton width="48px" height="48px" borderRadius="12px" />
                  <Skeleton width="60px" height="24px" borderRadius="100px" />
                </div>
                <Skeleton width="75%" height="22px" style={{ marginBottom: '12px' }} />
                <Skeleton width="100%" height="16px" style={{ marginBottom: '8px' }} />
                <Skeleton width="90%" height="16px" style={{ marginBottom: '24px' }} />
                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                  <Skeleton width="100%" height="32px" borderRadius="8px" />
                </div>
              </div>
            ))}
          </div>
        ) : services.length === 0 ? (
          /* Empty State when no services match filter */
          <EmptyState
            title="No services found"
            description={`There are currently no services listed under the "${activeCategory}" category.`}
            action={{
              label: 'View All Services',
              onClick: () => setActiveCategory('All')
            }}
          />
        ) : (
          /* 8-Card Reusable Services Grid */
          <motion.div layout className="cards-grid-4">
            <AnimatePresence mode="popLayout">
              {services.map((service) => {
                const targetSlug = service.slug || service.id;
                return (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.22 }}
                    whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                    className="service-card"
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="service-icon-box">
                          {getIcon(service.icon)}
                        </div>
                        <Badge variant={targetSlug === 'pen-drive-data-recovery' ? 'cyan' : 'purple'}>
                          {service.badge || service.category}
                        </Badge>
                      </div>

                      <h3 className="service-card-title">
                        <Link to={`/services/${targetSlug}`} style={{ color: 'inherit' }}>
                          {service.title}
                        </Link>
                      </h3>
                      <p className="service-card-desc">{service.description}</p>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Link
                          to={`/services/${targetSlug}`}
                          className="card-link"
                          aria-label={`View details for ${service.title}`}
                        >
                          Details <ChevronRight size={14} />
                        </Link>
                        <Link
                          to={`/contact?service=${encodeURIComponent(service.title)}`}
                          style={{ fontSize: '12px', color: 'var(--purple-glow)', fontWeight: 600 }}
                          aria-label={`Enquire about ${service.title}`}
                        >
                          Enquire ↗
                        </Link>
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
        title="Need a Custom Production Package?"
        subtitle="We provide tailored video production kits, multi-format social content packages, and dedicated creator management."
      />
    </PageTransition>
  );
};
