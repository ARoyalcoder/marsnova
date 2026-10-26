import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  Monitor,
  Cpu,
  Film,
  PenTool,
  TrendingUp,
  Briefcase,
  Clock,
  Settings,
  Folder,
  Sparkles,
  Layers,
  Target,
  ArrowRight,
  MessageSquare
} from 'lucide-react';

const COURSE_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  Monitor,
  Cpu,
  Film,
  PenTool,
  TrendingUp,
  Briefcase
};
const SKILL_ICONS = [Settings, Folder, Sparkles, Layers, Target];

export interface CourseCardProps {
  title: string;
  description: string;
  icon: string;
  category: string;
  level: string;
  duration?: string;
  /** learning outcomes; the first two become the "Key skills" tiles */
  skills?: string[];
  detailsTo: string;
  enquireTo: string;
}

/** "3 Weeks (Weekend Lab)" -> ["3 Weeks", "Weekend Lab"] */
const splitDuration = (d: string): [string, string] => {
  const m = d.match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? [m[1], m[2]] : [d, ''];
};

/** Long outcome sentence -> short tile title + the rest as a one-line caption. */
const splitSkill = (text: string): [string, string] => {
  const t = text.replace(/\.$/, '').trim();
  const cut = t.search(/ (and|with|to|for|of|in) | [-–:,]/i);
  const words = t.split(/\s+/);
  if (cut > 8 && cut < 30) return [t.slice(0, cut), t.slice(cut).replace(/^[\s,:\-–]+/, '')];
  const head = words.slice(0, 3).join(' ');
  return [head, words.slice(3).join(' ')];
};

export const CourseCard: React.FC<CourseCardProps> = ({ title, description, icon, category, level, duration, skills, detailsTo, enquireTo }) => {
  const reduce = useReducedMotion();
  const Icon = COURSE_ICONS[icon] || Monitor;
  const [len, kind] = duration ? splitDuration(duration) : ['', ''];
  const tiles = (skills || []).slice(0, 2).map(splitSkill);

  return (
    <motion.article className="course-card-v2" whileHover={reduce ? undefined : { y: -4 }} transition={{ duration: 0.2 }}>
      <span className="course-card-v2-glow" aria-hidden="true" />
      <div className="course-card-v2-top">
        <span className="course-card-v2-icon" aria-hidden="true">
          <Icon size={44} strokeWidth={1.7} />
        </span>
        <div className="course-card-v2-pills">
          <span className="course-card-v2-pill course-card-v2-pill-cat">{category}</span>
          <span className="course-card-v2-pill course-card-v2-pill-level">{level}</span>
        </div>
      </div>

      <h3 className="course-card-v2-title">
        <Link to={detailsTo}>{title}</Link>
      </h3>
      <p className="course-card-v2-desc">{description}</p>

      {len && (
        <div className="course-card-v2-duration">
          <span className="course-card-v2-clock" aria-hidden="true">
            <Clock size={22} />
          </span>
          <strong>{len}</strong>
          {kind && <span>{kind}</span>}
        </div>
      )}

      {tiles.length > 0 && (
        <div className="course-card-v2-skills">
          <h4>Key skills</h4>
          <div className="course-card-v2-skill-grid">
            {tiles.map(([head, sub], i) => {
              const SkillIcon = SKILL_ICONS[i % SKILL_ICONS.length];
              return (
                <div key={i} className="course-card-v2-skill">
                  <span className={`course-card-v2-skill-icon course-card-v2-skill-icon-${i % 2}`} aria-hidden="true">
                    <SkillIcon size={22} />
                  </span>
                  <div>
                    <strong>{head}</strong>
                    {sub && <span>{sub}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="course-card-v2-actions">
        <Link to={detailsTo} className="course-card-v2-btn course-card-v2-btn-primary" aria-label={`Course details for ${title}`}>
          Course Details <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <Link to={enquireTo} className="course-card-v2-btn course-card-v2-btn-outline" aria-label={`Enquire about ${title}`}>
          <MessageSquare size={18} aria-hidden="true" /> Enquire
        </Link>
      </div>
    </motion.article>
  );
};
