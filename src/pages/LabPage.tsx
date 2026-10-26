import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Monitor,
  Cpu,
  Film,
  PenTool,
  TrendingUp,
  Briefcase,
  ArrowRight,
  Smile,
  BookOpen,
  Sparkles,
  Award,
  Clock,
  CheckCircle2,
  Filter,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { PageTransition } from '../components/animations/PageTransition';
import { coursesData } from '../data';
import { CourseCard } from '../components/CourseCard';
import { CourseItem } from '../types';
import { apiClient } from '../api';
import { Button, Badge, Container, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { SharedCTA } from '../components/SharedCTA';
import { usePageSEO } from '../utils/seo';

// Fallback generator for network/image load failures
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  target.onerror = null;
  target.src =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%23080F1D"/><circle cx="400" cy="225" r="50" fill="%23101B2B"/><text x="400" y="232" fill="%23A855F7" font-size="20" font-family="sans-serif" font-weight="bold" text-anchor="middle">MarsNova Lab</text></svg>';
};

export const LabPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [courses, setCourses] = useState<CourseItem[]>(coursesData);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  usePageSEO({
    title: 'MarsNova Lab | Practical Computer, AI & Creative Courses',
    description:
      'Explore MarsNova Lab course catalogue: hands-on computer fundamentals, AI tools, video editing, graphic design, social media growth, and studio project mentorship.',
    canonicalPath: '/lab',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'MarsNova Lab Courses',
      itemListElement: courses.map((c, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'Course',
          name: c.title,
          description: c.description,
          provider: {
            '@type': 'Organization',
            name: 'MarsNova Lab',
            url: 'https://marsnova.in/lab'
          }
        }
      }))
    }
  });

  // Dynamic document metadata
  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'MarsNova Lab | Practical Computer, AI & Creative Courses';

    let metaDesc = document.querySelector('meta[name="description"]');
    const originalDesc = metaDesc ? metaDesc.getAttribute('content') : null;

    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'Explore MarsNova Lab course catalogue: hands-on computer fundamentals, AI tools, video editing, graphic design, social media growth, and studio project mentorship.'
    );

    window.scrollTo(0, 0);

    return () => {
      document.title = originalTitle;
      if (metaDesc && originalDesc) {
        metaDesc.setAttribute('content', originalDesc);
      }
    };
  }, []);

  // Connect to Drogon Backend via typed API client
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    async function fetchCourses() {
      setLoading(true);
      setError(null);

      try {
        const res = await apiClient.getCourses(
          { category: activeCategory === 'All' ? undefined : activeCategory },
          { signal: controller.signal }
        );
        if (isMounted) {
          setCourses(res.data);
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          return;
        }
        if (isMounted) {
          setError(err.message || 'Unable to connect to MarsNova courses service.');
          setLoading(false);
        }
      }
    }

    fetchCourses();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [activeCategory, retryCount]);

  const categories = [
    'All',
    'Foundations',
    'AI & Tech',
    'Creative Production',
    'Design & Branding',
    'Marketing & Growth'
  ];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Monitor':
        return <Monitor size={22} />;
      case 'Cpu':
        return <Cpu size={22} />;
      case 'Film':
        return <Film size={22} />;
      case 'PenTool':
        return <PenTool size={22} />;
      case 'TrendingUp':
        return <TrendingUp size={22} />;
      case 'Briefcase':
        return <Briefcase size={22} />;
      default:
        return <Monitor size={22} />;
    }
  };

  const shouldReduceMotion = useReducedMotion();

  return (
    <PageTransition>
      <div style={{ padding: '60px 0 0' }}>
      <Container>
        {/* Lab Hero Card */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '40px',
            alignItems: 'center',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-xl)',
            padding: '48px',
            marginBottom: '60px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div>
            <div className="eyebrow-tag" style={{ marginBottom: '14px' }}>
              <Sparkles size={14} />
              <span>MarsNova Education & Tech Lab</span>
            </div>
            <h1 className="hero-title" style={{ fontSize: '44px', lineHeight: 1.15, marginBottom: '16px' }}>
              MarsNova <span className="gradient-text">Lab</span>
            </h1>
            <p className="hero-desc" style={{ marginBottom: '24px' }}>
              Learn Computer Skills · Explore AI · Build Your Future
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.7, marginBottom: '28px' }}>
              Practical, accessible, and grounded in real studio workflows. This catalogue provides direct project-based
              training without academic fluff or inflated guarantees.
            </p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <a href="#catalogue">
                <Button variant="primary" size="md" rightIcon={<ArrowRight size={16} />}>
                  Explore Courses
                </Button>
              </a>
              <Link to="/contact">
                <Button variant="outline" size="md" leftIcon={<MessageSquare size={16} />}>
                  Enquire About Batches
                </Button>
              </Link>
            </div>
          </div>

          <div
            style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '1px solid var(--border-highlight)',
              minHeight: '280px'
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80"
              alt="High-tech computer lab with neon lighting"
              loading="lazy"
              decoding="async"
              onError={handleImageError}
              style={{ width: '100%', height: '100%', minHeight: '280px', objectFit: 'cover' }}
            />
          </div>
        </div>

        {/* Course Catalogue Section */}
        <div id="catalogue" className="section-header" style={{ marginBottom: '32px' }}>
          <div className="eyebrow-tag" style={{ margin: '0 auto 12px' }}>
            <BookOpen size={14} />
            <span>Public Course Catalogue</span>
          </div>
          <h2 className="section-title">Course Offerings</h2>
          <p className="section-subtitle">
            Hands-on learning programs designed for students, content creators, and working professionals.
          </p>
        </div>

        {/* Category Filters */}
        <div
          role="tablist"
          aria-label="Course Category Filters"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            justifyContent: 'center',
            marginBottom: '40px'
          }}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(cat)}
                style={{
                  background: isActive ? 'var(--purple-primary)' : 'var(--bg-elevated)',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  border: isActive ? '1px solid var(--purple-glow)' : '1px solid var(--border-muted)',
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {cat === 'All' && <Filter size={13} />}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Error State with explicit Retry action (no silent fallback in production) */}
        {error ? (
          <div style={{ maxWidth: '640px', margin: '0 auto 60px auto' }}>
            <ErrorState
              title="Failed to Load Courses"
              message={error}
              onRetry={() => setRetryCount((c) => c + 1)}
            />
          </div>
        ) : loading ? (
          /* Loading Skeleton State */
          <div className="cards-grid-3" style={{ marginBottom: '80px' }} aria-busy="true" aria-label="Loading courses">
            {[1, 2, 3].map((n) => (
              <div key={n} className="course-card" style={{ opacity: 0.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <Skeleton width="48px" height="48px" borderRadius="12px" />
                  <Skeleton width="70px" height="24px" borderRadius="100px" />
                </div>
                <Skeleton width="80%" height="24px" style={{ marginBottom: '12px' }} />
                <Skeleton width="100%" height="16px" style={{ marginBottom: '8px' }} />
                <Skeleton width="90%" height="16px" style={{ marginBottom: '24px' }} />
                <Skeleton width="100%" height="40px" borderRadius="8px" />
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            title="No courses found in this category"
            description="Try selecting another category or view all courses in our catalogue."
            action={{
              label: 'View All Courses',
              onClick: () => setActiveCategory('All')
            }}
          />
        ) : (
          <motion.div layout className="course-cards-grid">
            <AnimatePresence mode="popLayout">
              {courses.map((course) => (
                <motion.div
                  key={course.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.22 }}
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <CourseCard
                    title={course.title}
                    description={course.description}
                    icon={course.icon}
                    category={course.category}
                    level={course.level}
                    duration={course.duration}
                    skills={course.learningOutcomes}
                    detailsTo={`/lab/courses/${course.slug || course.id}`}
                    enquireTo={`/contact?service=${encodeURIComponent(course.title)}`}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Why Join MarsNova Lab Section */}
        <div style={{ margin: '80px 0' }}>
          <div className="section-header">
            <h2 className="section-title">Why Join MarsNova Lab?</h2>
            <p className="section-subtitle">
              We focus on practical execution, direct mentorship, and skills you can apply immediately.
            </p>
          </div>

          <div className="cards-grid-4">
            <div className="service-card" style={{ textAlign: 'center', alignItems: 'center' }}>
              <div className="service-icon-box" style={{ margin: '0 auto 16px' }}>
                <Smile size={22} />
              </div>
              <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>Beginner Friendly</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px', lineHeight: 1.6 }}>
                Step-by-step guidance designed from absolute zero to confident, autonomous execution.
              </p>
            </div>

            <div className="service-card" style={{ textAlign: 'center', alignItems: 'center' }}>
              <div className="service-icon-box" style={{ margin: '0 auto 16px' }}>
                <BookOpen size={22} />
              </div>
              <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>Practical Learning</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px', lineHeight: 1.6 }}>
                Work on live agency media projects and real creative briefs rather than dry textbook theory.
              </p>
            </div>

            <div className="service-card" style={{ textAlign: 'center', alignItems: 'center' }}>
              <div className="service-icon-box" style={{ margin: '0 auto 16px' }}>
                <Sparkles size={22} />
              </div>
              <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>Updated Content</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px', lineHeight: 1.6 }}>
                Curriculum kept constantly current with active AI tools, social algorithms, and editing suites.
              </p>
            </div>

            <div className="service-card" style={{ textAlign: 'center', alignItems: 'center' }}>
              <div className="service-icon-box" style={{ margin: '0 auto 16px' }}>
                <Award size={22} />
              </div>
              <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>Guidance & Support</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px', lineHeight: 1.6 }}>
                Direct mentor reviews, project feedback loops, and real portfolio assistance.
              </p>
            </div>
          </div>
        </div>
      </Container>

      <SharedCTA
        title="Ready to Start Learning?"
        subtitle="Join MarsNova Lab and gain computer, AI, and creative video skills for career, freelancing or personal growth."
      />
    </div>
  </PageTransition>
);
};
