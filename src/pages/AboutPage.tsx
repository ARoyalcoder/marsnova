import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Lightbulb,
  Cpu,
  GraduationCap,
  Target,
  ArrowRight,
  MapPin,
  CheckCircle2,
  Video,
  Award
} from 'lucide-react';
import { Button, Container, Card } from '../components/ui';
import { PageTransition } from '../components/animations/PageTransition';
import { SharedCTA } from '../components/SharedCTA';
import { statsData } from '../data';
import { usePageSEO } from '../utils/seo';

// Fallback generator for network/image load failures
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  target.onerror = null;
  target.src =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%23080F1D"/><circle cx="400" cy="225" r="50" fill="%23101B2B"/><text x="400" y="232" fill="%23A855F7" font-size="20" font-family="sans-serif" font-weight="bold" text-anchor="middle">MarsNova Media</text></svg>';
};

export const AboutPage: React.FC = () => {
  usePageSEO({
    title: 'About MarsNova | Creative & Technical Studio',
    description:
      'Learn about MarsNova, a creative and technical studio in Mumbai & Delhi NCR specializing in video production, digital growth, practical tech education, and lab-grade data recovery.',
    canonicalPath: '/about',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About MarsNova',
      mainEntity: {
        '@type': 'Organization',
        name: 'MarsNova',
        url: 'https://marsnova.in',
        slogan: 'Your Ideas Our Creation',
        email: 'hello@marsnova.in',
        telephone: '+917208591595'
      }
    }
  });

  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'About MarsNova | Creative & Technical Studio';

    let metaDesc = document.querySelector('meta[name="description"]');
    const originalDesc = metaDesc ? metaDesc.getAttribute('content') : null;

    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'Learn about MarsNova, a creative and technical studio in Mumbai & Delhi NCR specializing in video production, digital growth, practical tech education, and lab-grade data recovery.'
    );

    window.scrollTo(0, 0);

    return () => {
      document.title = originalTitle;
      if (metaDesc && originalDesc) {
        metaDesc.setAttribute('content', originalDesc);
      }
    };
  }, []);

  return (
    <PageTransition>
      <div style={{ padding: '60px 0 0' }}>
      <Container>
        {/* Header */}
        <div className="section-header">
          <div className="eyebrow-tag" style={{ margin: '0 auto 12px' }}>
            <Sparkles size={14} />
            <span>Creative & Technical Studio</span>
          </div>
          <h1 className="section-title">
            About <span className="gradient-text">MarsNova</span>
          </h1>
          <p className="section-subtitle">
            A creative and technical studio for the next generation of creators, businesses, and learners.
          </p>
        </div>

        {/* Studio Showcase Card */}
        <div
          className="about-showcase-grid responsive-card-padding"
          style={{
            alignItems: 'center',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-xl)',
            marginBottom: '60px'
          }}
        >
          <div
            style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '1px solid var(--border-muted)',
              position: 'relative',
              minHeight: '280px'
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1000&q=80"
              alt="MarsNova Studio dual monitor editing suite"
              loading="lazy"
              decoding="async"
              onError={handleImageError}
              style={{ width: '100%', height: '100%', minHeight: '280px', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                background: 'rgba(8, 15, 29, 0.85)',
                backdropFilter: 'blur(8px)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#fff',
                border: '1px solid var(--border-muted)'
              }}
            >
              <MapPin size={13} color="var(--purple-glow)" />
              <span>Mumbai & Delhi NCR, India</span>
            </div>
          </div>

          <div>
            <div className="eyebrow-tag" style={{ marginBottom: '14px' }}>
              <Sparkles size={14} />
              <span>Our Vision</span>
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
              Where Creativity Meets Technology
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.7, marginBottom: '18px' }}>
              MarsNova is a creative and tech-focused studio helping creators, businesses, and learners. We believe in
              practical solutions, real results, and continuous learning.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.7, marginBottom: '24px' }}>
              From scripting and high-tempo video editing to lab-grade pen drive recovery and applied AI systems, we build
              with precision, passion, and reliability.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px' }}>
                <CheckCircle2 size={16} color="var(--purple-glow)" />
                <span>Zero Outsourcing Fluff</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px' }}>
                <CheckCircle2 size={16} color="var(--cyan-accent)" />
                <span>Transparent Turnarounds</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px' }}>
                <CheckCircle2 size={16} color="#22c55e" />
                <span>Measurable Growth</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Core Pillars */}
        <div style={{ marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
              The 4 Pillars of MarsNova
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', maxWidth: '600px', margin: '0 auto' }}>
              Our philosophy combines compelling visual storytelling with rigorous technical foundations.
            </p>
          </div>

          <div className="cards-grid-4">
            <div className="service-card" style={{ textAlign: 'center', alignItems: 'center' }}>
              <div className="service-icon-box" style={{ margin: '0 auto 16px', background: '#3B0764', color: '#C084FC' }}>
                <Lightbulb size={22} />
              </div>
              <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>Creativity</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px', lineHeight: 1.6 }}>
                Story-driven visuals, memorable hooks, and cinematic aesthetics that captivate and retain audiences.
              </p>
            </div>

            <div className="service-card" style={{ textAlign: 'center', alignItems: 'center' }}>
              <div className="service-icon-box" style={{ margin: '0 auto 16px', background: '#082F49', color: '#38BDF8' }}>
                <Cpu size={22} />
              </div>
              <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>Technology</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px', lineHeight: 1.6 }}>
                Hardware-level data recovery, high-performance rendering stacks, and automated workflows.
              </p>
            </div>

            <div className="service-card" style={{ textAlign: 'center', alignItems: 'center' }}>
              <div className="service-icon-box" style={{ margin: '0 auto 16px', background: '#1E293B', color: '#93C5FD' }}>
                <GraduationCap size={22} />
              </div>
              <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>Learning</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px', lineHeight: 1.6 }}>
                Practical, accessible computer and media education through the MarsNova Lab initiative.
              </p>
            </div>

            <div className="service-card" style={{ textAlign: 'center', alignItems: 'center' }}>
              <div className="service-icon-box" style={{ margin: '0 auto 16px', background: '#450A0A', color: '#F87171' }}>
                <Target size={22} />
              </div>
              <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>Real Impact</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px', lineHeight: 1.6 }}>
                Measurable subscriber growth, converted footfall, recovered files, and transparent client ROI.
              </p>
            </div>
          </div>
        </div>

        {/* Verified Studio Statistics */}
        <div style={{ marginBottom: '80px' }}>
          <div className="stats-grid">
            {statsData.map((stat, idx) => (
              <Card key={idx} className="stat-card" style={{ padding: '32px 24px', textAlign: 'center' }}>
                <div className="stat-value gradient-text" style={{ fontSize: '38px', fontWeight: 800 }}>
                  {stat.value}
                </div>
                <div className="stat-label" style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>
                  {stat.label}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Mission + Planet Visual Section */}
        <div className="about-mars-grid" style={{ marginBottom: '80px' }}>
          <div>
            <div className="eyebrow-tag" style={{ marginBottom: '14px' }}>
              <Sparkles size={14} />
              <span>Core Mission</span>
            </div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
              Our Mission
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1.8, marginBottom: '24px' }}>
              To make content creation, digital growth and technology solutions simple and accessible for everyone.
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Link to="/contact">
                <Button variant="primary" size="md" rightIcon={<ArrowRight size={16} />}>
                  Work With Us
                </Button>
              </Link>
              <Link to="/services">
                <Button variant="outline" size="md" leftIcon={<Video size={16} />}>
                  Explore Services
                </Button>
              </Link>
            </div>
          </div>

          <div className="planet-mars-visual">
            <img
              src="https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=700&q=80"
              alt="Planet Mars rendering"
              className="planet-img"
              loading="lazy"
              decoding="async"
              onError={handleImageError}
            />
            <p className="mars-quote">
              “Empowering Ideas for a Better Tomorrow.”
            </p>
            <div className="signature-script">MarsNova</div>
          </div>
        </div>
      </Container>

      <SharedCTA
        title="Ready to Bring Your Vision to Life?"
        subtitle="Let's build something remarkable together. Share your brief or questions with the MarsNova team."
      />
    </div>
  </PageTransition>
);
};
