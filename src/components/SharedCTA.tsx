import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react';
import { Button, Card, Container } from './ui';

export interface SharedCTAProps {
  title?: string;
  subtitle?: string;
  showWhatsApp?: boolean;
  className?: string;
}

export const SharedCTA: React.FC<SharedCTAProps> = ({
  title = 'Ready to Create, Learn or Grow?',
  subtitle = 'Connect with MarsNova to discuss video production, social media strategy, MarsNova Lab courses, or technical services.',
  showWhatsApp = true,
  className = ''
}) => {
  return (
    <section className={`shared-cta-section ${className}`.trim()} style={{ padding: '60px 0 80px' }}>
      <Container>
        <Card
          variant="glow"
          className="responsive-card-padding"
          style={{
            background: 'linear-gradient(135deg, rgba(121, 25, 245, 0.22) 0%, rgba(8, 15, 29, 0.95) 100%)',
            border: '1px solid var(--purple-glow)',
            borderRadius: 'var(--radius-xl)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}
            aria-hidden="true"
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '28px',
              position: 'relative',
              zIndex: 1
            }}
          >
            <div style={{ maxWidth: '620px' }}>
              <div className="eyebrow-tag" style={{ marginBottom: '12px' }}>
                <Sparkles size={14} />
                <span>Next-Gen Creation & Tech</span>
              </div>
              <h2 style={{ color: '#fff', fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 800, lineHeight: 1.2, marginBottom: '12px' }}>
                {title}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>
                {subtitle}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <Link to="/contact">
                <Button variant="primary" size="lg" rightIcon={<ArrowRight size={18} />}>
                  Start Your Project
                </Button>
              </Link>
              {showWhatsApp && (
                <a
                  href="https://wa.me/917208591595?text=Hi%20MarsNova%2C%20I%20would%20like%20to%20discuss%20a%20project%20or%20course."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-lg"
                  style={{ display: 'inline-flex' }}
                >
                  <MessageCircle size={18} color="#22c55e" style={{ marginRight: '6px' }} />
                  Chat on WhatsApp
                </a>
              )}
            </div>
          </div>
        </Card>
      </Container>
    </section>
  );
};
