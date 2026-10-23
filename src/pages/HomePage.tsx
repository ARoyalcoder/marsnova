import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  Video,
  TrendingUp,
  Store,
  Laptop,
  CheckCircle,
  Sparkles,
  Zap,
  ShieldCheck,
  ChevronRight,
  Monitor,
  Cpu,
  Film,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useGSAP } from '@gsap/react';
import { createHeroTimeline } from '../animations/gsap';
import { AnimatedSection } from '../components/animations/AnimatedSection';
import { statsData, workPortfolioData, coursesData } from '../data';
import { Button, Badge, Container } from '../components/ui';
import { SharedCTA } from '../components/SharedCTA';
import { usePageSEO } from '../utils/seo';

interface HomePageProps {
  onOpenVideo?: (url: string, title: string) => void;
  onOpenRecoveryTracker?: () => void;
}

// Fallback generator for network/image load failures
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  target.onerror = null;
  target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%23080F1D"/><circle cx="400" cy="225" r="50" fill="%23101B2B"/><text x="400" y="232" fill="%23A855F7" font-size="20" font-family="sans-serif" font-weight="bold" text-anchor="middle">MarsNova Media</text></svg>';
};

export const HomePage: React.FC<HomePageProps> = ({ onOpenVideo, onOpenRecoveryTracker }) => {
  usePageSEO({
    title: 'MarsNova — Your Ideas Our Creation',
    description: 'Video creation, editing, social media services, business promotion and tech solutions — all at one place.',
    canonicalPath: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'MarsNova',
      url: 'https://marsnova.in',
      description: 'Video creation, editing, social media services, business promotion & tech solutions'
    }
  });

  const [activeWorkTab, setActiveWorkTab] = useState<string>('All');
  const heroRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // GSAP Homepage Hero Timeline
  useGSAP(
    () => {
      if (heroRef.current) {
        createHeroTimeline(heroRef.current);
      }
    },
    { scope: heroRef }
  );

  const filteredWork = activeWorkTab === 'All'
    ? workPortfolioData
    : workPortfolioData.filter((item) => item.category === activeWorkTab);

  const workTabs = ['All', 'YouTube Videos', 'Shorts', 'Business Promotion', 'Social Media'];
  const labPreviewCourses = coursesData.slice(0, 3);

  return (
    <div className="homepage-wrapper">
      {/* 1. Hero Section - GSAP Timeline Sequenced */}
      <section ref={heroRef} className="hero-section" aria-label="MarsNova Introduction">
        <div className="hero-glow-blob" aria-hidden="true" />
        <Container className="hero-grid">
          <div>
            <div className="eyebrow-tag" style={{ marginBottom: '20px' }}>
              <Sparkles size={14} aria-hidden="true" />
              <span>Create · Learn · Grow</span>
            </div>
            <h1 className="hero-title">
              Your Ideas
              <span className="gradient-text">Our Creation</span>
            </h1>
            <p className="hero-desc">
              Video creation, editing, social media services, business promotion and tech solutions — all at one place.
            </p>
            <div className="hero-ctas">
              <Link to="/services">
                <Button variant="primary" size="md" rightIcon={<ArrowRight size={16} />}>
                  Explore Services
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Play size={16} fill="currentColor" />}
                onClick={() => onOpenVideo?.('https://www.w3schools.com/html/mov_bbb.mp4', 'MarsNova Showreel 2026')}
                aria-label="Watch MarsNova Showreel Video"
              >
                Watch Video
              </Button>
            </div>
          </div>

          <div className="hero-preview-card">
            <img
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=85"
              alt="Creator working at video production editing workstation with glowing ambient lighting"
              className="hero-preview-img"
              onError={handleImageError}
            />
            <div className="hero-preview-overlay">
              <div>
                <span style={{ fontSize: '12px', color: 'var(--cyan-accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Next-Gen Production Studio
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                  Cinematic Content & Scalable Growth
                </h3>
              </div>
            </div>
          </div>
        </Container>

        {/* 2. Approved Statistics Bar (No fabricated testimonials or results) */}
        <Container>
          <div className="stats-bar" role="region" aria-label="MarsNova Verified Statistics">
            {statsData.map((stat, idx) => (
              <div key={idx} className="stat-item">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 3. Our Services Preview Section */}
      <AnimatedSection as="section" className="homepage-section" aria-label="Featured Services">
        <Container>
          <div className="section-header">
            <h2 className="section-title">Our Services</h2>
            <p className="section-subtitle">
              Everything you need to create, grow and promote your content.
            </p>
          </div>

          <div className="cards-grid-4">
            {/* Card 1: Video Creation & Editing */}
            <motion.div
              className="service-card"
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <div>
                <div className="service-icon-box" style={{ background: '#1E293B', color: '#60A5FA' }} aria-hidden="true">
                  <Video size={22} />
                </div>
                <h3 className="service-card-title">Video Creation & Editing</h3>
                <p className="service-card-desc">
                  From topic to complete video, editing, thumbnails and more.
                </p>
              </div>
              <Link to="/services" className="card-link" aria-label="Learn more about Video Creation and Editing">
                Learn More <ChevronRight size={14} />
              </Link>
            </motion.div>

            {/* Card 2: Social Media Services */}
            <motion.div
              className="service-card"
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <div>
                <div className="service-icon-box" style={{ background: '#3B0764', color: '#C084FC' }} aria-hidden="true">
                  <TrendingUp size={22} />
                </div>
                <h3 className="service-card-title">Social Media Services</h3>
                <p className="service-card-desc">
                  Consultation, content planning, account audit and promotion.
                </p>
              </div>
              <Link to="/services" className="card-link" aria-label="Learn more about Social Media Services">
                Learn More <ChevronRight size={14} />
              </Link>
            </motion.div>

            {/* Card 3: Business Promotion */}
            <motion.div
              className="service-card"
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <div>
                <div className="service-icon-box" style={{ background: '#450A0A', color: '#F87171' }} aria-hidden="true">
                  <Store size={22} />
                </div>
                <h3 className="service-card-title">Business Promotion</h3>
                <p className="service-card-desc">
                  On-location shoot, promotional videos and brand promotion.
                </p>
              </div>
              <Link to="/services" className="card-link" aria-label="Learn more about Business Promotion">
                Learn More <ChevronRight size={14} />
              </Link>
            </motion.div>

            {/* Card 4: Tech Services */}
            <motion.div
              className="service-card"
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <div>
                <div className="service-icon-box" style={{ background: '#082F49', color: '#38BDF8' }} aria-hidden="true">
                  <Laptop size={22} />
                </div>
                <h3 className="service-card-title">Tech Services</h3>
                <p className="service-card-desc">
                  Pen drive data recovery, technical support and more.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Link to="/services" className="card-link" aria-label="Learn more about Tech Services">
                  Learn More <ChevronRight size={14} />
                </Link>
              </div>
            </motion.div>
          </div>
        </Container>
      </AnimatedSection>

      {/* 4. Our Work / Portfolio Preview Section */}
      <AnimatedSection as="section" className="homepage-section" aria-label="Portfolio Showcase">
        <Container>
          <div className="section-header">
            <h2 className="section-title">Our Work</h2>
            <p className="section-subtitle">
              Some of our recent video projects, promotions and creative work.
            </p>
          </div>

          <div className="filter-tabs" role="tablist" aria-label="Portfolio categories">
            {workTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeWorkTab === tab}
                className={`filter-tab ${activeWorkTab === tab ? 'active' : ''}`}
                onClick={() => setActiveWorkTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <motion.div layout className="cards-grid-4">
            <AnimatePresence mode="popLayout">
              {filteredWork.map((work) => (
                <motion.div
                  key={work.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="work-card"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenVideo?.(work.videoUrl || '', work.title);
                    }
                  }}
                  onClick={() => onOpenVideo?.(work.videoUrl || '', work.title)}
                  aria-label={`Play preview for ${work.title}`}
                  whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                >
                  <div className="work-thumb-wrapper">
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
                    <h3 className="work-title" style={{ fontSize: '16px' }}>{work.title}</h3>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <Link to="/portfolio">
              <Button variant="primary" rightIcon={<ArrowRight size={16} />}>
                View More Work
              </Button>
            </Link>
          </div>
        </Container>
      </AnimatedSection>

      {/* 5. About MarsNova Section with Planet Mars Visual */}
      <AnimatedSection as="section" className="about-mars-section" aria-label="About MarsNova Studio">
        <Container>
          <div className="about-mars-grid">
            <div className="planet-mars-visual">
              <img
                src="https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=700&q=80"
                alt="Glowing Planet Mars sphere in cosmic space"
                className="planet-img"
                loading="lazy"
                decoding="async"
                onError={handleImageError}
              />
              <p className="mars-quote">
                "Ideas reach further when creativity meets technology."
              </p>
            </div>

            <div>
              <div className="eyebrow-tag" style={{ marginBottom: '16px' }}>
                <Sparkles size={14} aria-hidden="true" />
                <span>About MarsNova</span>
              </div>
              <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
                About <span className="gradient-text">MarsNova</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.7, marginBottom: '24px' }}>
                MarsNova is a creative and tech-focused studio helping creators, businesses and learners. We combine creativity, technology and practical experience to deliver real results.
              </p>

              <div className="features-list">
                <div className="feature-pill">
                  <Zap size={18} className="feature-pill-icon" aria-hidden="true" />
                  <span>Creative Approach</span>
                </div>
                <div className="feature-pill">
                  <CheckCircle size={18} className="feature-pill-icon" aria-hidden="true" />
                  <span>Practical Solutions</span>
                </div>
                <div className="feature-pill">
                  <ShieldCheck size={18} className="feature-pill-icon" aria-hidden="true" />
                  <span>Trusted Support</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '32px' }}>
                <Link to="/about">
                  <Button variant="primary" rightIcon={<ArrowRight size={16} />}>
                    Know More
                  </Button>
                </Link>
                <div className="signature-script">MarsNova</div>
              </div>
            </div>
          </div>
        </Container>
      </AnimatedSection>

      {/* 6. MarsNova Lab Preview Section */}
      <AnimatedSection as="section" className="homepage-section" aria-label="MarsNova Lab Preview">
        <Container>
          <div className="section-header">
            <div className="eyebrow-tag" style={{ marginBottom: '10px' }}>
              <Cpu size={14} aria-hidden="true" />
              <span>MarsNova Lab</span>
            </div>
            <h2 className="section-title">
              Learn Computer Skills · <span className="gradient-text">Explore AI</span> · Build Your Future
            </h2>
            <p className="section-subtitle">
              Practical and easy-to-understand courses designed for students, creators and professionals.
            </p>
          </div>

          <div className="cards-grid-3">
            {labPreviewCourses.map((course) => (
              <motion.div
                key={course.id}
                className="course-card"
                whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div className="service-icon-box" style={{ marginBottom: 0 }} aria-hidden="true">
                      {course.id === 'computer-fundamentals' && <Monitor size={22} />}
                      {course.id === 'ai-tools-automation' && <Cpu size={22} />}
                      {course.id === 'video-editing-course' && <Film size={22} />}
                    </div>
                    <Badge variant="purple">{course.level}</Badge>
                  </div>
                  <h3 className="service-card-title">{course.title}</h3>
                  <p className="service-card-desc">{course.description}</p>
                </div>

                <Link to={`/lab/courses/${course.id}`} style={{ marginTop: '16px' }}>
                  <Button variant="secondary" size="sm" fullWidth rightIcon={<ArrowRight size={14} />}>
                    Explore Course
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <Link to="/lab">
              <Button variant="primary" rightIcon={<ArrowRight size={16} />}>
                Explore MarsNova Lab
              </Button>
            </Link>
          </div>
        </Container>
      </AnimatedSection>

      {/* 7. Final Shared Enquiry CTA Section */}
      <SharedCTA
        title="Ready to Bring Your Vision to Life?"
        subtitle="Connect with MarsNova to discuss video production, creative promotion, MarsNova Lab courses, or data recovery."
      />
    </div>
  );
};
