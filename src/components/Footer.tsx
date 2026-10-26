import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Instagram, Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react';
import { Container } from './ui';

export const Footer: React.FC = () => {
  return (
    <footer className="footer" role="contentinfo">
      <Container>
        <div className="footer-grid">
          {/* Brand & Mission Column */}
          <div>
            <Link to="/" className="brand-logo" style={{ marginBottom: '16px' }} aria-label="MarsNova Home">
              <div className="brand-logo-icon" aria-hidden="true">
                <Sparkles size={18} />
              </div>
              <span>MarsNova</span>
            </Link>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '300px', lineHeight: 1.6 }}>
              A creative and tech-focused studio empowering creators, businesses and learners with content creation,
              practical training, and technical engineering solutions.
            </p>
            <p className="signature-script" style={{ marginTop: '14px', fontSize: '24px' }}>
              MarsNova
            </p>
          </div>

          {/* Solutions Column */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '15px', marginBottom: '16px', fontWeight: 700 }}>Solutions</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--text-muted)' }}>
              <li><Link to="/services" className="nav-link" style={{ padding: 0 }}>All Services</Link></li>
              <li><Link to="/portfolio" className="nav-link" style={{ padding: 0 }}>Creative Portfolio</Link></li>
              <li><Link to="/services" className="nav-link" style={{ padding: 0 }}>Video Creation & Editing</Link></li>
              <li><Link to="/services" className="nav-link" style={{ padding: 0 }}>Social Media Strategy</Link></li>
              <li><Link to="/services" className="nav-link" style={{ padding: 0 }}>Pen Drive Data Recovery</Link></li>
            </ul>
          </div>

          {/* MarsNova Lab Column */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '15px', marginBottom: '16px', fontWeight: 700 }}>MarsNova Lab</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--text-muted)' }}>
              <li><Link to="/lab" className="nav-link" style={{ padding: 0 }}>All Courses</Link></li>
              <li><Link to="/lab" className="nav-link" style={{ padding: 0 }}>Computer Fundamentals</Link></li>
              <li><Link to="/lab" className="nav-link" style={{ padding: 0 }}>AI Tools & Automation</Link></li>
              <li><Link to="/lab" className="nav-link" style={{ padding: 0 }}>Video Editing Bootcamp</Link></li>
              <li><Link to="/lab" className="nav-link" style={{ padding: 0 }}>Graphic Design</Link></li>
            </ul>
          </div>

          {/* Verified Contact Details Column (Never Invented) */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '15px', marginBottom: '16px', fontWeight: 700 }}>Connect</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={15} color="var(--cyan-accent)" aria-hidden="true" />
                <a href="mailto:hello@marsnova.in" aria-label="Email hello@marsnova.in">hello@marsnova.in</a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Instagram size={15} color="var(--purple-glow)" aria-hidden="true" />
                <a
                  href="https://instagram.com/marsnova.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram profile @marsnova.in (opens in new tab)"
                >
                  @marsnova.in <ArrowUpRight size={12} style={{ display: 'inline' }} />
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={15} color="#22c55e" aria-hidden="true" />
                <a
                  href="https://wa.me/917208591595"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp chat at +91 7208591595 (opens in new tab)"
                >
                  +91 7208591595 <ArrowUpRight size={12} style={{ display: 'inline' }} />
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={15} color="var(--cyan-accent)" aria-hidden="true" />
                <span>Mumbai / Delhi NCR, India</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <div>© {new Date().getFullYear()} MarsNova Studio. All rights reserved.</div>
          <div className="footer-links-row">
            <Link to="/about">About Studio</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/admin">Operations Admin</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
};
