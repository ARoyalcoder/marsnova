import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Users,
  Target,
  MessageCircle,
  Monitor,
  Cpu,
  Film,
  PenTool,
  TrendingUp,
  Briefcase,
  HelpCircle,
  GraduationCap
} from 'lucide-react';
import { coursesData } from '../data';
import { CourseItem } from '../types';
import { apiClient, NotFoundError } from '../api';
import { Button, Card, Badge, Container, EmptyState, ErrorState, LoadingSpinner, Skeleton } from '../components/ui';
import { PageTransition } from '../components/animations/PageTransition';
import { SharedCTA } from '../components/SharedCTA';
import { usePageSEO } from '../utils/seo';

export const CourseDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseItem | null>(() => {
    return coursesData.find(
      (c) => c.id === slug || c.id.replace(/-course$/, '') === slug
    ) || null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Connect to Drogon Backend via typed API client
  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const activeSlug: string = slug;

    const controller = new AbortController();
    let isMounted = true;

    async function fetchCourse() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const item = await apiClient.getCourseBySlug(activeSlug, { signal: controller.signal });
        if (isMounted) {
          setCourse(item);
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          return;
        }
        if (isMounted) {
          if (err instanceof NotFoundError || err.status === 404) {
            setNotFound(true);
            setCourse(null);
          } else {
            setError(err.message || 'Failed to load course details.');
          }
          setLoading(false);
        }
      }
    }

    fetchCourse();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [slug, retryCount]);

  usePageSEO({
    title: course ? `${course.title} | MarsNova Lab Course` : notFound ? 'Course Not Found | MarsNova Lab' : 'Lab Course | MarsNova',
    description: course?.overview || course?.description,
    canonicalPath: `/lab/courses/${slug}`,
    jsonLd: course
      ? {
          '@context': 'https://schema.org',
          '@type': 'Course',
          name: course.title,
          description: course.overview || course.description,
          provider: {
            '@type': 'Organization',
            name: 'MarsNova Lab',
            url: 'https://marsnova.in/lab'
          },
          hasCourseInstance: {
            '@type': 'CourseInstance',
            courseMode: course.format || 'blended',
            courseWorkload: course.duration || 'P4W'
          }
        }
      : undefined
  });

  // Dynamic document metadata
  useEffect(() => {
    const originalTitle = document.title;
    if (course) {
      document.title = `${course.title} | MarsNova Lab Course`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', course.overview || course.description);
      }
    } else if (notFound) {
      document.title = 'Course Not Found | MarsNova Lab';
    }

    window.scrollTo(0, 0);

    return () => {
      document.title = originalTitle;
    };
  }, [course, notFound]);

  const getCourseIcon = (iconName: string) => {
    switch (iconName) {
      case 'Monitor':
        return <Monitor size={28} />;
      case 'Cpu':
        return <Cpu size={28} />;
      case 'Film':
        return <Film size={28} />;
      case 'PenTool':
        return <PenTool size={28} />;
      case 'TrendingUp':
        return <TrendingUp size={28} />;
      case 'Briefcase':
        return <Briefcase size={28} />;
      default:
        return <BookOpen size={28} />;
    }
  };

  // 1. Error State
  if (error) {
    return (
      <div style={{ padding: '80px 0' }}>
        <Container size="narrow">
          <ErrorState
            title="Unable to Load Course Details"
            message={error}
            onRetry={() => setRetryCount((c) => c + 1)}
          />
        </Container>
      </div>
    );
  }

  // 2. Loading State
  if (loading && !course) {
    return (
      <div style={{ padding: '80px 0' }}>
        <Container size="narrow">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <LoadingSpinner size="md" label="Loading course..." />
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Connecting to MarsNova Lab...</span>
          </div>
          <Skeleton width="50%" height="32px" style={{ marginBottom: '16px' }} />
          <Skeleton width="100%" height="80px" style={{ marginBottom: '24px' }} />
          <Skeleton width="100%" height="240px" borderRadius="12px" />
        </Container>
      </div>
    );
  }

  // 3. Unknown / Invalid Slug Handling
  if (!course) {
    return (
      <div style={{ padding: '80px 0' }}>
        <Container size="narrow">
          <EmptyState
            title="Course Not Found"
            description={`We could not locate a course matching "/lab/courses/${slug}". Browse our full catalogue of practical studio and technology courses.`}
            action={{
              label: 'View Course Catalogue',
              onClick: () => navigate('/lab')
            }}
          />
        </Container>
      </div>
    );
  }

  const encodedEnquiryUrl = `/contact?service=${encodeURIComponent(course.title)}`;
  const waUrl = `https://wa.me/917208591595?text=${encodeURIComponent(
    `Hi MarsNova, I'd like to enquire about the "${course.title}" course at MarsNova Lab.`
  )}`;

  return (
    <PageTransition>
      <div style={{ padding: '40px 0 0' }}>
      <Container>
        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '24px' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Home
          </Link>
          <span>/</span>
          <Link to="/lab" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Lab
          </Link>
          <span>/</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>{course.title}</span>
        </div>

        {/* Back Link */}
        <Link
          to="/lab"
          className="card-link"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', marginBottom: '32px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Course Catalogue</span>
        </Link>

        {/* Course Header Banner */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-xl)',
            padding: '40px',
            marginBottom: '48px',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            <Badge variant="cyan">{course.category}</Badge>
            <Badge variant="purple">{course.level}</Badge>
            {course.duration && (
              <Badge variant="success">
                <Clock size={12} style={{ marginRight: '4px' }} />
                {course.duration}
              </Badge>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '20px' }}>
            <div className="service-icon-box" style={{ flexShrink: 0, marginTop: '4px' }}>
              {getCourseIcon(course.icon)}
            </div>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '12px' }}>
                {course.title}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '17px', lineHeight: 1.6, maxWidth: '800px' }}>
                {course.description}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '24px' }}>
            <Link to={encodedEnquiryUrl}>
              <Button variant="primary" size="md" rightIcon={<ArrowRight size={16} />}>
                Enquire for Next Batch
              </Button>
            </Link>

            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="md" leftIcon={<MessageCircle size={16} color="#22c55e" />}>
                WhatsApp Course Enquiry
              </Button>
            </a>
          </div>
        </div>

        {/* Two Column Layout: Main Content + Course Summary Sidebar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '40px',
            marginBottom: '60px',
            alignItems: 'start'
          }}
        >
          {/* Main Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {/* Overview */}
            {course.overview && (
              <Card style={{ padding: '32px' }}>
                <div className="eyebrow-tag" style={{ marginBottom: '12px' }}>
                  <Sparkles size={14} />
                  <span>Program Overview</span>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
                  About the Course
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.8 }}>
                  {course.overview}
                </p>
              </Card>
            )}

            {/* Learning Outcomes */}
            {course.learningOutcomes && course.learningOutcomes.length > 0 && (
              <Card style={{ padding: '32px' }}>
                <div className="eyebrow-tag" style={{ marginBottom: '12px' }}>
                  <Target size={14} />
                  <span>Skills & Capabilities</span>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>
                  What You Will Learn
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {course.learningOutcomes.map((outcome, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        background: 'var(--bg-elevated)',
                        padding: '14px 18px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-muted)'
                      }}
                    >
                      <CheckCircle2
                        size={18}
                        color="var(--purple-glow)"
                        style={{ flexShrink: 0, marginTop: '2px' }}
                      />
                      <span style={{ color: '#fff', fontSize: '14px', lineHeight: 1.5 }}>
                        {outcome}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Curriculum Breakdown */}
            {course.curriculum && course.curriculum.length > 0 && (
              <Card style={{ padding: '32px' }}>
                <div className="eyebrow-tag" style={{ marginBottom: '12px' }}>
                  <BookOpen size={14} />
                  <span>Detailed Curriculum</span>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>
                  Curriculum Breakdown
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {course.curriculum.map((module, mIdx) => (
                    <div
                      key={mIdx}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-highlight)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '20px'
                      }}
                    >
                      <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
                        {module.moduleTitle}
                      </h3>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {module.topics.map((topic, tIdx) => (
                          <li
                            key={tIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              color: 'var(--text-muted)',
                              fontSize: '13px',
                              lineHeight: 1.5
                            }}
                          >
                            <span style={{ color: 'var(--cyan-accent)', fontWeight: 700 }}>•</span>
                            <span>{topic}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Quick Facts Card */}
            <Card style={{ padding: '32px' }}>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
                Course Information
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Category
                  </span>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                    {course.category}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Skill Level
                  </span>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                    {course.level}
                  </div>
                </div>

                {course.duration && (
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Duration
                    </span>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                      {course.duration}
                    </div>
                  </div>
                )}

                {course.format && (
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Learning Format
                    </span>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                      {course.format}
                    </div>
                  </div>
                )}

                {course.prerequisites && (
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Prerequisites
                    </span>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px', lineHeight: 1.5 }}>
                      {course.prerequisites}
                    </div>
                  </div>
                )}

                {course.targetAudience && (
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Target Audience
                    </span>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px', lineHeight: 1.5 }}>
                      {course.targetAudience}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Public Catalogue Notice */}
            <Card
              variant="glow"
              style={{
                background:
                  'linear-gradient(135deg, rgba(121, 25, 245, 0.12) 0%, rgba(8, 15, 29, 0.95) 100%)',
                padding: '30px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <GraduationCap size={20} color="var(--purple-glow)" />
                <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>
                  Public Studio Catalogue
                </h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px' }}>
                MarsNova Lab is an offline and interactive mentorship initiative. We do not run paid LMS checkouts or
                automated subscription locks. Contact our studio to learn about the upcoming batch schedules and seats.
              </p>
              <Link to={encodedEnquiryUrl} style={{ width: '100%', textDecoration: 'none' }}>
                <Button variant="primary" size="sm" fullWidth rightIcon={<ArrowRight size={14} />}>
                  Enquire for Free
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </Container>

      <SharedCTA
        title={`Ready to Learn ${course.title}?`}
        subtitle="Speak with our instructors and team to confirm batch availability, schedules, and learning goals."
      />
    </div>
  </PageTransition>
);
};
