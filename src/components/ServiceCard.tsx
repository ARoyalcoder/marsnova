import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  Video,
  Scissors,
  Film,
  Image as ImageIcon,
  Users,
  Store,
  HardDrive,
  Headphones,
  TrendingUp,
  Laptop,
  Crown,
  Sparkles,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  Video,
  Scissors,
  Film,
  Image: ImageIcon,
  Users,
  Store,
  HardDrive,
  Headphones,
  TrendingUp,
  Laptop
};

export interface ServiceCardProps {
  title: string;
  description: string;
  /** lucide icon name (see ICONS) */
  icon: string;
  /** pill shown top right; "Popular" gets the crown */
  badge?: string;
  detailsTo: string;
  enquireTo: string;
  /** accessible name suffix for the two links */
  label?: string;
}

/** Soft illustration on the right of the card: a tilted gradient tile carrying the service icon. */
const ServiceArt: React.FC<{ icon: string }> = ({ icon }) => {
  const Icon = ICONS[icon] || Video;
  return (
    <div className="service-art" aria-hidden="true">
      <span className="service-art-blob service-art-blob-a" />
      <span className="service-art-blob service-art-blob-b" />
      <span className="service-art-tile">
        <Icon size={52} strokeWidth={1.6} />
      </span>
      <Sparkles className="service-art-spark" size={20} />
    </div>
  );
};

export const ServiceCard: React.FC<ServiceCardProps> = ({ title, description, icon, badge, detailsTo, enquireTo, label }) => {
  const reduce = useReducedMotion();
  const Icon = ICONS[icon] || Video;
  const words = title.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : '';
  const head = words.join(' ');
  const name = label || title;

  return (
    <motion.article
      className="service-card-v2"
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="service-card-v2-top">
        <span className="service-card-v2-icon" aria-hidden="true">
          <Icon size={26} strokeWidth={2} />
        </span>
        {badge && (
          <span className="service-card-v2-badge">
            {/popular/i.test(badge) ? <Crown size={16} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
            {badge}
          </span>
        )}
      </div>

      <div className="service-card-v2-body">
        <h3 className="service-card-v2-title">
          <Link to={detailsTo}>
            {head}
            {last && (
              <>
                {' '}
                <span className="service-card-v2-title-accent">{last}</span>
              </>
            )}
          </Link>
        </h3>
        <p className="service-card-v2-desc">{description}</p>
      </div>

      <ServiceArt icon={icon} />

      <div className="service-card-v2-actions">
        <Link to={detailsTo} className="service-card-v2-btn service-card-v2-btn-outline" aria-label={`View details for ${name}`}>
          Details <ChevronRight size={18} aria-hidden="true" />
        </Link>
        <Link to={enquireTo} className="service-card-v2-btn service-card-v2-btn-primary" aria-label={`Enquire about ${name}`}>
          Enquire <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </motion.article>
  );
};
