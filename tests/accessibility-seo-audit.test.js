import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function loadSource(relativePath) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}

// -----------------------------------------------------------------------------
// 1. Responsive Viewport & Fluid Layouts
// -----------------------------------------------------------------------------
test('index.html contains responsive viewport meta tag and theme color', () => {
  const html = loadSource('index.html');
  assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0" />'), 'Must include standard mobile viewport meta');
  assert.ok(html.includes('<meta name="theme-color" content="#030912" />'), 'Must declare MarsNova dark theme-color');
});

test('CSS implements responsive media queries and minimum touch targets', () => {
  const css = loadSource('src/index.css');
  assert.ok(css.includes('@media (max-width: 1024px)'), 'Must include 1024px breakpoint');
  assert.ok(css.includes('@media (max-width: 768px)'), 'Must include 768px mobile breakpoint');
  assert.ok(css.includes('@media (max-width: 480px)'), 'Must include 480px small mobile breakpoint');
  assert.ok(css.includes('min-height: 44px') || css.includes('min-width: 44px'), 'Must enforce WCAG 44x44px touch targets');
});

// -----------------------------------------------------------------------------
// 2. Semantic HTML & Landmarks
// -----------------------------------------------------------------------------
test('App structure implements semantic landmarks and skip to main content link', () => {
  const appSrc = loadSource('src/App.tsx');
  assert.ok(appSrc.includes('className="skip-link"'), 'Must render skip-link');
  assert.ok(appSrc.includes('href="#main-content"'), 'Skip link must target #main-content');
  assert.ok(appSrc.includes('<main id="main-content"'), 'Main landmark must carry id="main-content"');

  const navSrc = loadSource('src/components/Navbar.tsx');
  assert.ok(navSrc.includes('role="banner"'), 'Navbar must carry role="banner"');
  assert.ok(navSrc.includes('<nav aria-label="Main Navigation">'), 'Main nav must have descriptive aria-label');

  const footerSrc = loadSource('src/components/Footer.tsx');
  assert.ok(footerSrc.includes('role="contentinfo"'), 'Footer must carry role="contentinfo"');
});

// -----------------------------------------------------------------------------
// 3. Keyboard Navigation & Visible Focus
// -----------------------------------------------------------------------------
test('CSS implements high-contrast focus-visible styles and skip link styling', () => {
  const css = loadSource('src/index.css');
  assert.ok(css.includes(':focus-visible'), 'Must declare :focus-visible rule');
  assert.ok(css.includes('outline: 2px solid var(--cyan-accent)'), 'Must provide distinct 2px cyan outline on focus-visible');
  assert.ok(css.includes('.skip-link'), 'Must style .skip-link class');
  assert.ok(css.includes('.skip-link:focus'), 'Must reveal .skip-link when focused');
});

test('Modals and navigation implement Escape key listeners and focus retention', () => {
  const navSrc = loadSource('src/components/Navbar.tsx');
  assert.ok(navSrc.includes("e.key === 'Escape'"), 'Mobile navigation must close on Escape key');
  assert.ok(navSrc.includes('toggleBtnRef.current?.focus()'), 'Must return focus to toggle button on close');
});

// -----------------------------------------------------------------------------
// 4. Color Contrast & Theme Tokens
// -----------------------------------------------------------------------------
test('Theme tokens comply with WCAG AA/AAA dark contrast standards', () => {
  const css = loadSource('src/index.css');
  assert.ok(css.includes('--bg-deep: #030912'), 'Deep cosmic dark primary background');
  assert.ok(css.includes('--text-white: #F5F7FF'), 'High-contrast white text for primary reading (exceeds 14:1 ratio)');
  assert.ok(css.includes('--cyan-accent: #38BDF8'), 'Vibrant cyan accent token');
});

// -----------------------------------------------------------------------------
// 5. Image Alt Text & Decorative Icon Hiding
// -----------------------------------------------------------------------------
test('Images have descriptive alt text and icons use aria-hidden="true"', () => {
  const homeSrc = loadSource('src/pages/HomePage.tsx');
  assert.ok(homeSrc.includes('alt="Creator working at video production editing workstation with glowing ambient lighting"'), 'Hero preview must have descriptive alt');
  assert.ok(homeSrc.includes('alt="Glowing Planet Mars sphere in cosmic space"'), 'Mars visual must have descriptive alt');
  assert.ok(homeSrc.includes('aria-hidden="true"'), 'Decorative icons must use aria-hidden="true"');

  const aboutSrc = loadSource('src/pages/AboutPage.tsx');
  assert.ok(aboutSrc.includes('alt="MarsNova Studio dual monitor editing suite"'), 'Studio photo must have descriptive alt');
  assert.ok(aboutSrc.includes('alt="Planet Mars rendering"'), 'About planet must have alt');
});

// -----------------------------------------------------------------------------
// 6. Form Labels Explicitly Paired
// -----------------------------------------------------------------------------
test('Form inputs across public forms are explicitly paired with label htmlFor', () => {
  const contactSrc = loadSource('src/pages/ContactPage.tsx');
  assert.ok(contactSrc.includes('id="contact-name"'), 'Contact name input must have id');
  assert.ok(contactSrc.includes('id="contact-email"'), 'Contact email input must have id');
  assert.ok(contactSrc.includes('id="contact-service"'), 'Contact service select must have id');
  assert.ok(contactSrc.includes('id="contact-consent"'), 'Contact consent checkbox must have id');
  assert.ok(contactSrc.includes('htmlFor="contact-consent"'), 'Consent label must pair via htmlFor');

  const recoverySrc = loadSource('src/pages/PenDriveRecoveryPage.tsx');
  assert.ok(recoverySrc.includes('id="recovery-customer-name"'), 'Recovery customer name must have id');
  assert.ok(recoverySrc.includes('htmlFor="recovery-customer-name"'), 'Recovery label must pair via htmlFor');
  assert.ok(recoverySrc.includes('id="consent-diagnostic"'), 'Diagnostic consent must have id');
  assert.ok(recoverySrc.includes('htmlFor="consent-diagnostic"'), 'Diagnostic consent must pair via htmlFor');
});

// -----------------------------------------------------------------------------
// 7. Reduced Motion Support
// -----------------------------------------------------------------------------
test('CSS implements @media (prefers-reduced-motion: reduce) rule disabling animations', () => {
  const css = loadSource('src/index.css');
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Must declare prefers-reduced-motion media query');
  assert.ok(css.includes('animation-duration: 0.01ms !important'), 'Must neutralize animation duration');
  assert.ok(css.includes('transition-duration: 0.01ms !important'), 'Must neutralize transition duration');
  assert.ok(css.includes('scroll-behavior: auto !important'), 'Must disable smooth scrolling under reduced motion');
});

// -----------------------------------------------------------------------------
// 8. Dynamic Page Titles, Descriptions, Canonical, and Social Metadata
// -----------------------------------------------------------------------------
test('index.html defines baseline Open Graph, Twitter Cards, canonical and robots directives', () => {
  const html = loadSource('index.html');
  assert.ok(html.includes('<meta name="robots" content="index, follow" />'), 'Must instruct search crawlers to index and follow');
  assert.ok(html.includes('<link rel="canonical" href="https://marsnova.in/" />'), 'Must provide canonical URL for root domain');
  assert.ok(html.includes('<meta property="og:site_name" content="MarsNova" />'), 'Must declare Open Graph site name');
  assert.ok(html.includes('<meta property="og:title" content="MarsNova — Your Ideas Our Creation" />'), 'Must declare Open Graph title');
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image" />'), 'Must declare Twitter large image summary card');
});

test('usePageSEO utility is implemented and integrated across core pages', () => {
  const seoUtil = loadSource('src/utils/seo.ts');
  assert.ok(seoUtil.includes('export function usePageSEO'), 'Must export usePageSEO hook');
  assert.ok(seoUtil.includes('meta[name="description"]'), 'Must manage meta description');
  assert.ok(seoUtil.includes('link[rel="canonical"]'), 'Must manage canonical link');
  assert.ok(seoUtil.includes('og:title'), 'Must manage Open Graph title');
  assert.ok(seoUtil.includes('twitter:title'), 'Must manage Twitter card title');
  assert.ok(seoUtil.includes('application/ld+json'), 'Must support dynamic JSON-LD injection');

  const homeSrc = loadSource('src/pages/HomePage.tsx');
  assert.ok(homeSrc.includes('usePageSEO('), 'HomePage must use usePageSEO');

  const servicesSrc = loadSource('src/pages/ServicesPage.tsx');
  assert.ok(servicesSrc.includes('usePageSEO('), 'ServicesPage must use usePageSEO');

  const recoverySrc = loadSource('src/pages/PenDriveRecoveryPage.tsx');
  assert.ok(recoverySrc.includes('usePageSEO('), 'PenDriveRecoveryPage must use usePageSEO');

  const portfolioSrc = loadSource('src/pages/PortfolioPage.tsx');
  assert.ok(portfolioSrc.includes('usePageSEO('), 'PortfolioPage must use usePageSEO');

  const labSrc = loadSource('src/pages/LabPage.tsx');
  assert.ok(labSrc.includes('usePageSEO('), 'LabPage must use usePageSEO');

  const aboutSrc = loadSource('src/pages/AboutPage.tsx');
  assert.ok(aboutSrc.includes('usePageSEO('), 'AboutPage must use usePageSEO');

  const contactSrc = loadSource('src/pages/ContactPage.tsx');
  assert.ok(contactSrc.includes('usePageSEO('), 'ContactPage must use usePageSEO');
});

// -----------------------------------------------------------------------------
// 9. Robots.txt and Sitemap.xml
// -----------------------------------------------------------------------------
test('public/robots.txt contains valid directives and points to https://marsnova.in/sitemap.xml', () => {
  const robots = loadSource('public/robots.txt');
  assert.ok(robots.includes('User-agent: *'), 'Must specify User-agent: *');
  assert.ok(robots.includes('Allow: /'), 'Must allow public crawling');
  assert.ok(robots.includes('Disallow: /admin'), 'Must disallow admin area');
  assert.ok(robots.includes('Sitemap: https://marsnova.in/sitemap.xml'), 'Must point to verified marsnova.in sitemap');
  assert.ok(!robots.includes('uxgstudio.in'), 'Must never contain stale uxgstudio.in domain');
});

test('public/sitemap.xml contains verified marsnova.in URLs without dead or stale pages', () => {
  const sitemap = loadSource('public/sitemap.xml');
  assert.ok(sitemap.includes('<loc>https://marsnova.in/</loc>'), 'Must include home page');
  assert.ok(sitemap.includes('<loc>https://marsnova.in/services</loc>'), 'Must include services directory');
  assert.ok(sitemap.includes('<loc>https://marsnova.in/services/pen-drive-data-recovery</loc>'), 'Must include data recovery service');
  assert.ok(sitemap.includes('<loc>https://marsnova.in/portfolio</loc>'), 'Must include portfolio directory');
  assert.ok(sitemap.includes('<loc>https://marsnova.in/lab</loc>'), 'Must include lab directory');
  assert.ok(sitemap.includes('<loc>https://marsnova.in/about</loc>'), 'Must include about page');
  assert.ok(sitemap.includes('<loc>https://marsnova.in/contact</loc>'), 'Must include contact page');
  assert.ok(!sitemap.includes('uxgstudio.in'), 'Must never contain legacy uxgstudio.in domain');
});

// -----------------------------------------------------------------------------
// 10. Performance Attributes on Images
// -----------------------------------------------------------------------------
test('Non-hero images implement lazy loading and async decoding', () => {
  const homeSrc = loadSource('src/pages/HomePage.tsx');
  assert.ok(homeSrc.includes('loading="lazy"'), 'HomePage work previews and visuals must use loading="lazy"');
  assert.ok(homeSrc.includes('decoding="async"'), 'HomePage images must use decoding="async"');

  const aboutSrc = loadSource('src/pages/AboutPage.tsx');
  assert.ok(aboutSrc.includes('loading="lazy"'), 'AboutPage studio images must use loading="lazy"');
  assert.ok(aboutSrc.includes('decoding="async"'), 'AboutPage studio images must use decoding="async"');

  const portfolioSrc = loadSource('src/pages/PortfolioPage.tsx');
  assert.ok(portfolioSrc.includes('loading="lazy"'), 'Portfolio thumbnails must use loading="lazy"');
  assert.ok(portfolioSrc.includes('decoding="async"'), 'Portfolio thumbnails must use decoding="async"');
});

// -----------------------------------------------------------------------------
// 11. Verified Schema.org Structured Data
// -----------------------------------------------------------------------------
test('index.html contains verified Organization and WebSite Schema.org JSON-LD without fabricated details', () => {
  const html = loadSource('index.html');
  assert.ok(html.includes('"@type": "Organization"'), 'Must define Organization JSON-LD');
  assert.ok(html.includes('"name": "MarsNova"'), 'Must declare official brand name MarsNova');
  assert.ok(html.includes('"url": "https://marsnova.in"'), 'Must use verified domain https://marsnova.in');
  assert.ok(html.includes('"email": "hello@marsnova.in"'), 'Must use verified studio email hello@marsnova.in');
  assert.ok(html.includes('"telephone": "+917208591595"'), 'Must use verified official phone/WhatsApp number');
  assert.ok(html.includes('https://instagram.com/marsnova.in'), 'Must reference official Instagram profile in sameAs');
  assert.ok(html.includes('"@type": "WebSite"'), 'Must define WebSite JSON-LD');
  assert.ok(!html.includes('uxgstudio'), 'Must never contain stale uxgstudio metadata');
});
