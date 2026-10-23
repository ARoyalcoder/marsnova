import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadSource(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf-8');
}

test('1. Animation libraries are correctly installed in package.json without conflicts', () => {
  const pkg = JSON.parse(loadSource('package.json'));

  assert.ok(pkg.dependencies.gsap, 'gsap must be present in dependencies');
  assert.ok(pkg.dependencies['@gsap/react'], '@gsap/react must be present in dependencies');
  assert.ok(pkg.dependencies.motion, 'motion (Motion for React) must be present in dependencies');

  // Verify no conflicting legacy framer-motion duplicates
  assert.equal(
    pkg.dependencies['framer-motion'],
    undefined,
    'framer-motion legacy package must not be installed alongside modern motion'
  );
});

test('2. Reusable animation utilities export variants and GSAP helpers', () => {
  const variantsSrc = loadSource('src/animations/variants.ts');
  const gsapSrc = loadSource('src/animations/gsap.ts');
  const indexSrc = loadSource('src/animations/index.ts');

  // Motion variants
  assert.ok(variantsSrc.includes('fadeIn'), 'Must export fadeIn');
  assert.ok(variantsSrc.includes('fadeInUp'), 'Must export fadeInUp');
  assert.ok(variantsSrc.includes('staggerContainer'), 'Must export staggerContainer');
  assert.ok(variantsSrc.includes('modalBackdropVariants'), 'Must export modalBackdropVariants');
  assert.ok(variantsSrc.includes('modalContentVariants'), 'Must export modalContentVariants');
  assert.ok(variantsSrc.includes('mobileDrawerVariants'), 'Must export mobileDrawerVariants');
  assert.ok(variantsSrc.includes('pageTransitionVariants'), 'Must export pageTransitionVariants');

  // GSAP helpers
  assert.ok(gsapSrc.includes('createHeroTimeline'), 'Must export createHeroTimeline');
  assert.ok(gsapSrc.includes('createScrollTriggerReveal'), 'Must export createScrollTriggerReveal');
  assert.ok(gsapSrc.includes('isReducedMotion'), 'Must export isReducedMotion');
  assert.ok(gsapSrc.includes('ScrollTrigger'), 'Must reference ScrollTrigger plugin');

  // Central index barrel export
  assert.ok(indexSrc.includes("export * from './variants'"), 'Must barrel export variants');
  assert.ok(indexSrc.includes("export * from './gsap'"), 'Must barrel export gsap');
});

test('3. Custom hooks provide scoped GSAP lifecycle management and cleanup', () => {
  const gsapTimelineHook = loadSource('src/hooks/useGsapTimeline.ts');
  const scrollRevealHook = loadSource('src/hooks/useScrollReveal.ts');

  assert.ok(gsapTimelineHook.includes('useGSAP'), 'useGsapTimeline must use @gsap/react useGSAP');
  assert.ok(gsapTimelineHook.includes('scope: containerRef'), 'useGsapTimeline must scope to containerRef');
  assert.ok(scrollRevealHook.includes('useGSAP'), 'useScrollReveal must use @gsap/react useGSAP');
  assert.ok(scrollRevealHook.includes('isReducedMotion'), 'useScrollReveal must respect reduced motion');
});

test('4. Accessibility and reduced-motion compliance', () => {
  const animSection = loadSource('src/components/animations/AnimatedSection.tsx');
  const pageTrans = loadSource('src/components/animations/PageTransition.tsx');
  const css = loadSource('src/index.css');

  assert.ok(animSection.includes('useReducedMotion'), 'AnimatedSection must check useReducedMotion');
  assert.ok(pageTrans.includes('useReducedMotion'), 'PageTransition must check useReducedMotion');
  assert.ok(css.includes('prefers-reduced-motion: reduce'), 'CSS must contain prefers-reduced-motion media query');
});

test('5. Homepage integrates GSAP Hero Timeline and Motion card interactions', () => {
  const homeSrc = loadSource('src/pages/HomePage.tsx');

  assert.ok(homeSrc.includes('createHeroTimeline'), 'HomePage must use createHeroTimeline for hero');
  assert.ok(homeSrc.includes('useGSAP'), 'HomePage must use useGSAP hook for scoping');
  assert.ok(homeSrc.includes('heroRef'), 'HomePage must attach heroRef to hero section');
  assert.ok(homeSrc.includes('AnimatedSection'), 'HomePage must use AnimatedSection for content blocks');
  assert.ok(homeSrc.includes('AnimatePresence'), 'HomePage must use AnimatePresence for filter tabs');
});

test('6. Navbar and Modals integrate AnimatePresence and Motion transitions', () => {
  const navSrc = loadSource('src/components/Navbar.tsx');
  const videoModalSrc = loadSource('src/components/VideoModal.tsx');

  assert.ok(navSrc.includes('AnimatePresence'), 'Navbar must wrap mobile menu in AnimatePresence');
  assert.ok(navSrc.includes('mobileDrawerVariants'), 'Navbar must use mobileDrawerVariants');
  assert.ok(videoModalSrc.includes('AnimatePresence'), 'VideoModal must use AnimatePresence');
  assert.ok(videoModalSrc.includes('modalContentVariants'), 'VideoModal must use modalContentVariants');
});

test('7. Services, Portfolio, Lab, and Contact pages integrate restrained Motion transitions', () => {
  const servicesSrc = loadSource('src/pages/ServicesPage.tsx');
  const portfolioSrc = loadSource('src/pages/PortfolioPage.tsx');
  const labSrc = loadSource('src/pages/LabPage.tsx');
  const contactSrc = loadSource('src/pages/ContactPage.tsx');
  const recoverySrc = loadSource('src/pages/PenDriveRecoveryPage.tsx');

  assert.ok(servicesSrc.includes('PageTransition'), 'ServicesPage must use PageTransition');
  assert.ok(portfolioSrc.includes('PageTransition'), 'PortfolioPage must use PageTransition');
  assert.ok(labSrc.includes('PageTransition'), 'LabPage must use PageTransition');
  assert.ok(contactSrc.includes('PageTransition'), 'ContactPage must use PageTransition');
  assert.ok(recoverySrc.includes('PageTransition'), 'PenDriveRecoveryPage must use PageTransition');

  // Contact form submission transition
  assert.ok(contactSrc.includes('AnimatePresence'), 'ContactPage must use AnimatePresence for submission state');
});
