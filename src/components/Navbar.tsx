import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Sparkles, Menu, X, ArrowRight, HardDrive, ChevronDown } from 'lucide-react';
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

export interface NavbarProps {
  onOpenRecoveryTracker?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenRecoveryTracker }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

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
              <Button variant="ghost" size="sm" className="hidden md:inline-flex items-center gap-1">
                <span>Explore</span>
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/services">Creative & Tech Services</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/portfolio">Portfolio Case Studies</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/lab">MarsNova Lab Academy</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin">Operations Admin</Link>
              </DropdownMenuItem>
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
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)'
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
