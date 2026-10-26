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
  ArrowRight,
  Search,
  X
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { PageTransition } from '../components/animations/PageTransition';
import { servicesData } from '../data';
import { ServiceItem } from '../types';
import { apiClient } from '../api';
import { Button, Card, Badge, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { PageContainer } from '../components/PageContainer';
import { SharedCTA } from '../components/SharedCTA';
import { ServiceCard } from '../components/ServiceCard';
import { usePageSEO } from '../utils/seo';

interface ServicesPageProps {
  onOpenRecoveryTracker?: () => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onOpenRecoveryTracker }) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  const filteredServices = services.filter((service) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      service.title.toLowerCase().includes(q) ||
      service.description.toLowerCase().includes(q) ||
      (service.badge && service.badge.toLowerCase().includes(q)) ||
      (service.category && service.category.toLowerCase().includes(q))
    );
  });

  return (
    <PageTransition>
      <PageContainer
        eyebrow="Solutions Directory"
        title="Our Services"
        subtitle="Complete solutions for creators, businesses and tech users"
      >
        {/* Dynamic Search & Category Filter Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '840px', margin: '0 auto 36px' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-deep)',
              border: '1px solid var(--border-highlight)',
              borderRadius: '12px',
              padding: '8px 16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
            }}
          >
            <Search size={18} style={{ color: 'var(--cyan-accent)', marginRight: '10px', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services by keyword, format, or category (e.g. video, recovery, shorts)..."
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '14px',
                width: '100%',
                outline: 'none'
              }}
              aria-label="Search services"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                aria-label="Clear service search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            {/* Category Filter Tabs */}
            <div className="filter-tabs" role="tablist" aria-label="Service categories" style={{ margin: 0 }}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--cyan-accent)' }}>{filteredServices.length}</strong> of {services.length} services
              </span>
            </div>
          </div>
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
        ) : filteredServices.length === 0 ? (
          /* Empty State when no services match filter or search query */
          <EmptyState
            title="No services found"
            description={
              searchQuery
                ? `No services matched "${searchQuery}" in ${activeCategory === 'All' ? 'any category' : activeCategory}.`
                : `There are currently no services listed under the "${activeCategory}" category.`
            }
            action={{
              label: searchQuery ? 'Clear Search' : 'View All Services',
              onClick: () => {
                setSearchQuery('');
                setActiveCategory('All');
              }
            }}
          />
        ) : (
          /* 8-Card Reusable Services Grid */
          <motion.div layout className="service-cards-grid">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((service) => {
                const targetSlug = service.slug || service.id;
                return (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.22 }}
                    style={{ display: 'flex', flexDirection: 'column' }}
                  >
                    <ServiceCard
                      title={service.title}
                      description={service.description}
                      icon={service.icon}
                      badge={service.badge || service.category}
                      detailsTo={`/services/${targetSlug}`}
                      enquireTo={`/contact?service=${encodeURIComponent(service.title)}`}
                    />
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
