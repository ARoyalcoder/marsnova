import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, ArrowRight } from 'lucide-react';
import { Button, Container } from '../components/ui';
import { PageTransition } from '../components/animations/PageTransition';
import { usePageSEO } from '../utils/seo';

// Unknown URLs used to render the home page, so a mistyped or outdated link looked like it worked
// (and search engines saw a duplicate home page at every address). This says plainly that the page
// does not exist and asks crawlers not to index it.
export const NotFoundPage: React.FC = () => {
  const { pathname } = useLocation();

  usePageSEO({
    title: 'Page Not Found | MarsNova',
    description: 'The page you were looking for does not exist or has moved.',
    canonicalPath: '/',
    noindex: true
  });

  return (
    <PageTransition>
      <div style={{ padding: '80px 0' }}>
        <Container size="narrow">
          <div className="empty-state-card">
            <div className="empty-state-icon" aria-hidden="true">
              <Compass size={24} />
            </div>
            <h1 className="empty-state-title" style={{ fontSize: '24px' }}>
              Page Not Found
            </h1>
            <p className="empty-state-desc">
              We could not find <strong style={{ overflowWrap: 'anywhere' }}>{pathname}</strong>. It may have moved,
              or the link may be mistyped.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm" rightIcon={<ArrowRight size={14} />}>
                  Back to Home
                </Button>
              </Link>
              <Link to="/services" style={{ textDecoration: 'none' }}>
                <Button variant="outline" size="sm">
                  Browse Services
                </Button>
              </Link>
              <Link to="/contact" style={{ textDecoration: 'none' }}>
                <Button variant="outline" size="sm">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    </PageTransition>
  );
};

export default NotFoundPage;
