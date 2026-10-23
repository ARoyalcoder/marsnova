import { useEffect } from 'react';

export interface PageSEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const DEFAULT_TITLE = 'MarsNova — Your Ideas Our Creation';
const DEFAULT_DESCRIPTION =
  'MarsNova: Video creation, editing, social media services, business promotion, computer education & tech solutions — all at one place.';
const DEFAULT_CANONICAL = 'https://marsnova.in/';
const DEFAULT_OG_IMAGE = 'https://marsnova.in/og-image.jpg';

function setMetaTag(selector: string, attrName: string, attrVal: string, content: string): HTMLMetaElement {
  let element = document.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrVal);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
  return element;
}

function setCanonical(url: string): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
  return link;
}

export function usePageSEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = '',
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  jsonLd
}: PageSEOProps) {
  useEffect(() => {
    const fullTitle = title
      ? title.includes('MarsNova')
        ? title
        : `${title} | MarsNova`
      : DEFAULT_TITLE;

    const fullUrl = canonicalPath.startsWith('http')
      ? canonicalPath
      : `https://marsnova.in${canonicalPath ? (canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`) : '/'}`;

    // Title & Description
    document.title = fullTitle;
    setMetaTag('meta[name="description"]', 'name', 'description', description);
    setCanonical(fullUrl);

    // Open Graph
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', fullUrl);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', ogType);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', ogImage);

    // Twitter Card
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMetaTag('meta[name="twitter:url"]', 'name', 'twitter:url', fullUrl);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);

    // Structured Data (JSON-LD)
    const jsonLdScriptId = 'page-specific-jsonld';
    let scriptEl = document.getElementById(jsonLdScriptId) as HTMLScriptElement | null;

    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = jsonLdScriptId;
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      // Cleanup page-specific script on unmount
      const el = document.getElementById(jsonLdScriptId);
      if (el) {
        el.remove();
      }
    };
  }, [title, description, canonicalPath, ogType, ogImage, jsonLd]);
}
