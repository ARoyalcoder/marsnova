import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Sparkles, Menu, X, ArrowRight, HardDrive, ChevronDown, ChevronRight, Compass, Film, GraduationCap, ShieldCheck, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdropVariants, mobileDrawerVariants } from '../animations/variants';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui';

/**
 * Custom SVG Icons Matching User Design Reference
 */
const WandSparklesIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#9333EA' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m14 7 3 3" />
    <path d="M5 6v4" />
    <path d="M19 14v4" />
    <path d="M10 2v2" />
    <path d="M7 8H3" />
    <path d="M21 16h-4" />
    <path d="M11 3H9" />
    <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
  </svg>
);

const FilmPlayIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#0284C7' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M7 3v18" />
    <path d="M17 3v18" />
    <path d="M3 7.5h4" />
    <path d="M3 12h4" />
    <path d="M3 16.5h4" />
    <path d="M17 7.5h4" />
    <path d="M17 12h4" />
    <path d="M17 16.5h4" />
    <polygon points="11 9.5 15 12 11 14.5 11 9.5" fill={color} />
  </svg>
);

const AcademyGradCapIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#E11D48' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const ShieldUserIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#7C3AED' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <circle cx="12" cy="10" r="2.8" />
    <path d="M7.5 17.5a4.5 4.5 0 0 1 9 0" />
  </svg>
);

export interface NavbarProps {
  onOpenRecoveryTracker?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenRecoveryTracker }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('marsnova_theme') === 'dark';
  });

  useEffect(() => {
    const saved = localStorage.getItem('marsnova_theme');
    if (saved === 'dark') {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-porcelain-ice');
      setIsDark(true);
    } else {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-porcelain-ice');
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-porcelain-ice');
      localStorage.setItem('marsnova_theme', 'porcelain');
      setIsDark(false);
    } else {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-porcelain-ice');
      localStorage.setItem('marsnova_theme', 'dark');
      setIsDark(true);
    }
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle Escape key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        toggleBtnRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Services', path: '/services' },
    { label: 'Portfolio', path: '/portfolio' },
    { label: 'Lab', path: '/lab' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ];

  return (
    <header className="navbar" role="banner">
      <div className="container navbar-inner">
        {/* Brand Logo */}
        <Link to="/" className="brand-logo" aria-label="MarsNova Home">
          <div className="brand-logo-icon" aria-hidden="true">
            <Sparkles size={18} />
          </div>
          <span>MarsNova</span>
        </Link>

        {/* Desktop Navigation */}
        <nav aria-label="Main Navigation">
          <ul className="nav-links">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Actions (Explore Menu + Get Started CTA + Mobile Toggle) */}
        <div className="nav-actions">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="explore-btn hidden md:inline-flex"
                aria-label="Explore studio directory"
              >
                <Compass size={14} style={{ color: 'var(--cyan-accent)' }} />
                <span>Explore</span>
                <ChevronDown size={13} style={{ opacity: 0.7 }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="explore-popover-card"
            >
              {[
                {
                  path: '/services',
                  title: 'Creative & Tech Services',
                  subtitle: 'Video, Editing & Social',
                  icon: <WandSparklesIcon size={16} color="#9333EA" />,
                  iconBg: '#F3E8FF'
                },
                {
                  path: '/portfolio',
                  title: 'Portfolio Case Studies',
                  subtitle: 'Client Works & Showreels',
                  icon: <FilmPlayIcon size={16} color="#0284C7" />,
                  iconBg: '#E0F2FE'
                },
                {
                  path: '/lab',
                  title: 'MarsNova Lab Academy',
                  subtitle: 'Workshops & Mentorship',
                  icon: <AcademyGradCapIcon size={16} color="#E11D48" />,
                  iconBg: '#FFE4E6'
                },
                {
                  path: '/admin',
                  title: 'Operations Admin',
                  subtitle: 'Staff Portal & Inquiries',
                  icon: <ShieldUserIcon size={16} color="#7C3AED" />,
                  iconBg: '#EDE9FE'
                }
              ].map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <DropdownMenuItem key={item.path} asChild style={{ padding: 0, background: 'transparent' }}>
                    <Link
                      to={item.path}
                      className={`explore-nav-item ${isActive ? 'active' : ''}`}
                    >
                      {isActive && <span className="explore-active-pill" aria-hidden="true" />}
                      <div className="explore-item-left">
                        <div
                          className="explore-item-icon-box"
                          style={{ backgroundColor: item.iconBg }}
                        >
                          {item.icon}
                        </div>
                        <div className="explore-item-text">
                          <span className="explore-item-title">{item.title}</span>
                          <span className="explore-item-subtitle">{item.subtitle}</span>
                        </div>
                      </div>
                      <ChevronRight
                        size={15}
                        className={`explore-item-chevron ${isActive ? 'active' : ''}`}
                      />
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/contact">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Start a new project or inquiry</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Theme Mode Toggle (Matches Neumorphic Moon in User Reference) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to Soft Porcelain Ice Theme' : 'Switch to Dark Theme'}
            title={isDark ? 'Switch to Soft Porcelain Ice Theme' : 'Switch to Dark Theme'}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.95)',
              boxShadow: isDark
                ? 'none'
                : '3px 3px 8px rgba(166, 185, 214, 0.35), -3px -3px 8px #FFFFFF',
              color: isDark ? '#F5F7FF' : '#0F172A',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Accessible Mobile Menu Toggle Button */}
          <button
            ref={toggleBtnRef}
            type="button"
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X size={26} aria-hidden="true" /> : <Menu size={26} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Accessible Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="mobile-nav-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalBackdropVariants}
            style={{
              position: 'fixed',
              inset: 0,
              top: '72px',
              background: 'rgba(3, 9, 18, 0.85)',
              backdropFilter: 'blur(8px)',
              zIndex: 99
            }}
            aria-hidden="true"
          >
            <motion.div
              ref={menuRef}
              id="mobile-nav-menu"
              role="navigation"
              aria-label="Mobile Navigation"
              onClick={(e) => e.stopPropagation()}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={mobileDrawerVariants}
              style={{
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border-highlight)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
                maxHeight: 'calc(100vh - 72px)',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border-muted)'
                  }}
                >
                  {item.label}
                </NavLink>
              ))}

              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link to="/contact" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" fullWidth rightIcon={<ArrowRight size={16} />}>
                    Get Started
                  </Button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
