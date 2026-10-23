import { ServiceItem, CourseItem, WorkItem } from './types';

export const servicesData: ServiceItem[] = [
  {
    id: 'topic-to-video',
    title: 'Topic to Video',
    category: 'Video',
    description: 'You give the topic, we create complete video with research, script, voice-over and editing.',
    icon: 'Video',
    badge: 'Popular',
    longDescription: 'Our end-to-end video creation pipeline transforms a simple idea or topic into a polished, high-retention video ready for YouTube, LinkedIn, or brand channels. We handle thorough topic research, narrative scripting, studio voice-over recording, and multi-track pacing.',
    features: [
      'Comprehensive topic research and outline preparation',
      'Hook-driven scriptwriting with clear retention milestones',
      'Studio voice-over recorded in Hindi or English',
      'Complete post-production with motion typography and b-roll',
      'SEO title and description package'
    ],
    deliverables: [
      'Full HD / 4K Master Video (16:9)',
      'Clean SRT subtitle and transcript file',
      'Licensed background music and sound design tracks'
    ],
    idealFor: 'YouTubers, educational channels, corporate knowledge bases, and thought leaders.',
    turnaroundTime: '4 - 6 Business Days'
  },
  {
    id: 'video-editing',
    title: 'Video Editing',
    category: 'Video',
    description: 'Professional editing for your raw clips, with captions, music and effects.',
    icon: 'Scissors',
    longDescription: 'Turn your raw camera recordings, podcast takes, or vlog footage into cinematic, crisp videos. We cut filler words, apply dynamic zooms, insert licensed sound effects, color-grade log footage, and style dynamic kinetic typography.',
    features: [
      'Multi-camera footage synchronization and audio leveling',
      'Color correction and cinematic grading (Rec.709 / Log profiles)',
      'Animated captions and kinetic text highlights',
      'Sound engineering with atmospheric audio and sound effects',
      'Strict audio normalization according to platform standards'
    ],
    deliverables: [
      'Exported master video in target bitrate (YouTube / Vimeo / MP4)',
      'Social media teaser cutdown (30 seconds)'
    ],
    idealFor: 'Podcasters, content creators, keynote speakers, and digital educators.',
    turnaroundTime: '2 - 4 Business Days'
  },
  {
    id: 'video-to-shorts',
    title: 'Video to Shorts',
    category: 'Video',
    description: 'Convert long videos into multiple Shorts, reels and clips.',
    icon: 'Film',
    longDescription: 'Maximize your content ROI by transforming your long-form podcasts, live streams, webinars, and YouTube videos into viral 9:16 vertical reels and shorts for Instagram, YouTube Shorts, and TikTok.',
    features: [
      'Identification of highest-retention hooks and punchlines',
      'Smart 9:16 vertical re-framing with speaker tracking',
      'Word-by-word highlighted animated captions (Alex Hormozi style)',
      'Engaging sound effects, emojis, and sound stingers',
      'Optimized loop endings to boost completion rates'
    ],
    deliverables: [
      'Batch of 5 to 20 vertical Reels/Shorts (1080x1920)',
      'Platform-ready hashtags and caption copy'
    ],
    idealFor: 'Creators repurposing long videos, podcast hosts, and personal brands.',
    turnaroundTime: '2 - 3 Business Days'
  },
  {
    id: 'thumbnail-title',
    title: 'Thumbnail & Title',
    category: 'Video',
    description: 'Eye-catching thumbnails and title suggestions engineered for maximum click-through rate.',
    icon: 'Image',
    longDescription: 'The first impression determines your video views. We create high-contrast, curiosity-inducing thumbnails and A/B testable title formulas tailored to YouTube algorithm benchmarks and human psychology.',
    features: [
      'Custom photo cutouts with lighting enhancement and skin retouching',
      'High-contrast color grading designed for mobile and dark-mode YouTube',
      'Clean 3-word focal text hierarchy for instant legibility',
      '3 algorithmic title variations (curiosity, benefit, tension)',
      'Provided in 1280x720 and 1920x1080 high-DPI PSD/PNG'
    ],
    deliverables: [
      'High-resolution JPG/PNG thumbnails (<2MB YouTube compliant)',
      '3 title suggestions optimized for search and suggested feeds'
    ],
    idealFor: 'YouTubers wanting to improve CTR from 3% to 8%+, and course creators.',
    turnaroundTime: '24 - 48 Hours'
  },
  {
    id: 'social-media-consultation',
    title: 'Social Media Consultation',
    category: 'Social Media',
    description: 'Paid one-on-one consultation for Instagram, YouTube and growth strategies.',
    icon: 'Users',
    longDescription: 'Get personalized, 1-on-1 strategic guidance on your channel or profile. We perform a complete audit of your past 30 days of uploads, analyze viewer drop-off points, inspect bio conversions, and deliver a tailored 90-day growth roadmap.',
    features: [
      'Deep account and channel audit with bottleneck identification',
      '60-minute direct video call with MarsNova creative directors',
      'Niche positioning, content calendar, and hook formula matrix',
      'Monetization strategy and brand collaboration guidance',
      'Actionable checklist and recording of the call provided'
    ],
    deliverables: [
      '60-Minute 1-on-1 Strategy Session (Zoom/Google Meet)',
      'Comprehensive Audit PDF report with 90-day growth roadmap'
    ],
    idealFor: 'Creators stuck in algorithmic plateaus, agency founders, and local businesses.',
    turnaroundTime: 'Scheduled within 48 Hours'
  },
  {
    id: 'business-promotion',
    title: 'Business Promotion',
    category: 'Promotion',
    description: 'On-location shoot, promotional videos and brand promotion for your business.',
    icon: 'Store',
    longDescription: 'Drive local walk-ins and digital inquiries for your retail store, clinic, cafe, showroom, or service business. We bring professional cinema camera packages to your location to capture aesthetic establishment films and promotional reels.',
    features: [
      'On-location production with professional lighting and audio kits',
      'Interviews with founders, staff, and customer testimonials',
      'Atmospheric b-roll of products, interiors, and customer experience',
      'Scripted commercial narrative focused on business unique value',
      'Local geo-targeted ad cutdowns ready for Meta / Instagram ads'
    ],
    deliverables: [
      '1x Cinematic Brand Film (60 - 90 seconds)',
      '3x High-energy Promotional Reels (15 - 30 seconds for ads)'
    ],
    idealFor: 'Restaurants, real estate developers, healthcare clinics, gyms, and retail stores.',
    turnaroundTime: '5 - 7 Business Days after shoot'
  },
  {
    id: 'pen-drive-data-recovery',
    title: 'Pen Drive Data Recovery',
    category: 'Tech',
    description: 'Recover deleted files from pen drive, memory card, SD card and flash drives with hardware diagnostics.',
    icon: 'HardDrive',
    badge: 'Lab Service',
    longDescription: 'Specialized hardware and forensic file recovery for inaccessible, formatted, corrupted, or physically damaged pen drives, USB flash sticks, SD cards, and micro-SD cards. We use clean-room techniques and low-level NAND reading without damaging sensitive flash chips.',
    features: [
      'Diagnostic evaluation to isolate logical vs hardware controller failures',
      'RAW NAND flash sector mirroring to prevent further media wear',
      'Reconstruction of FAT32, exFAT, NTFS, and proprietary file systems',
      'Recovery of deleted photos, raw video footage, documents, and archives',
      'Direct laboratory updates from our specialists throughout the recovery stages'
    ],
    deliverables: [
      'Salvaged data restored onto encrypted external drive or secure link',
      'Detailed forensic recovery report and files manifest'
    ],
    idealFor: 'Videographers with corrupted SD cards, students, businesses with lost flash drive files.',
    turnaroundTime: '2 - 5 Business Days depending on chip condition'
  },
  {
    id: 'online-tech-support',
    title: 'Online Tech Support',
    category: 'Tech',
    description: 'Get help with computer, software setup, rendering issues and other technical problems.',
    icon: 'Headphones',
    longDescription: 'Remote technical assistance for creators, editors, and home workstations. We diagnose Windows crashes, software installation bottlenecks, Premiere Pro / DaVinci Resolve rendering errors, driver conflicts, and performance slowdowns.',
    features: [
      'Secure remote desktop session via encrypted screen share',
      'Troubleshooting video editing suite crashes and GPU acceleration errors',
      'Storage optimization, temp cleanup, and cache disk reconfiguration',
      'Malware and bloatware removal with boot sequence optimization',
      'Guidance on hardware upgrades for editing workstations'
    ],
    deliverables: [
      'Remote resolution session with certified technical specialist',
      'Post-support optimization summary and maintenance checklist'
    ],
    idealFor: 'Editors facing deadline rendering glitches, freelancers, and small offices.',
    turnaroundTime: 'Same Day / Scheduled'
  }
];

export const coursesData: CourseItem[] = [
  {
    id: 'computer-fundamentals',
    title: 'Computer Fundamentals',
    category: 'Foundations',
    description: 'Master computer systems, file organization, command basics, operating systems and workflow essentials.',
    icon: 'Monitor',
    level: 'Beginner',
    duration: '3 Weeks (Weekend Lab)',
    format: 'Hands-on Lab & Guided Exercises',
    overview: 'Designed for beginners, creators, and students who want total confidence operating computers. Covers operating system architecture, file hierarchies, storage management, cloud backups, browser security, typing speed, and digital productivity workflows.',
    learningOutcomes: [
      'Confidently navigate Windows and Linux environments, control panels, and task managers.',
      'Understand file extensions, folder hierarchies, external media, and backup hygiene.',
      'Utilize cloud productivity tools, keyboard shortcuts, and customized workspaces.',
      'Diagnose and troubleshoot basic software crashes, driver conflicts, and connectivity issues.'
    ],
    curriculum: [
      {
        moduleTitle: 'Module 1: Operating System Architecture & File Management',
        topics: [
          'Windows OS essentials, control panel, and storage utilities',
          'Understanding file formats (.mp4, .png, .zip, .exe, .iso)',
          'Disk partitions, flash drive formats (FAT32, NTFS, exFAT), and external media handling'
        ]
      },
      {
        moduleTitle: 'Module 2: Desktop Productivity & Cloud Workflows',
        topics: [
          'Mastering essential keyboard shortcuts and navigation tricks',
          'Cloud storage setup (Google Drive, OneDrive, local sync)',
          'Browser security, password managers, and safe internet browsing practices'
        ]
      },
      {
        moduleTitle: 'Module 3: System Health, Troubleshooting & Diagnostics',
        topics: [
          'Task Manager inspection, background services, and startup apps',
          'Driver installations, peripheral devices, and display setup',
          'Routine system maintenance and clean-up routines'
        ]
      }
    ],
    prerequisites: 'No prior computer experience required. Starts from ground zero.',
    targetAudience: 'Beginners, school/college students, career switchers, and anyone seeking rock-solid digital literacy.'
  },
  {
    id: 'ai-tools-automation',
    title: 'AI Tools & Automation',
    category: 'AI & Tech',
    description: 'Learn and use latest AI tools in real projects to accelerate content, scripts, and automation.',
    icon: 'Cpu',
    level: 'All Levels',
    duration: '4 Weeks (Interactive Lab)',
    format: 'Live Project Lab & Real-Time Demos',
    overview: 'A zero-hype, purely practical exploration of Generative AI. Learn structured prompting, LLM research methods, automated transcription, AI-assisted graphic generation, and connecting tools through lightweight automation.',
    learningOutcomes: [
      'Craft structured prompts and system personas for scripting, research, and ideation.',
      'Integrate AI tools into video pre-production (storyboarding, script breakdown, sound synthesis).',
      'Generate visual assets and mockup graphics using modern generative models.',
      'Automate repetitive file management, content scheduling, and routine administrative tasks.'
    ],
    curriculum: [
      {
        moduleTitle: 'Module 1: Advanced Prompt Engineering & Large Language Models',
        topics: [
          'Context framing, few-shot examples, and markdown output structuring',
          'Scriptwriting, YouTube outline generation, and research verification',
          'Fact-checking AI hallucinations and maintaining creative voice'
        ]
      },
      {
        moduleTitle: 'Module 2: Generative Media for Creators',
        topics: [
          'AI-assisted image generation, upscaling, and thumbnail concepts',
          'Voice synthesis, automated transcription, and subtitle generation',
          'Video enhancement tools and noise suppression algorithms'
        ]
      },
      {
        moduleTitle: 'Module 3: Workflow Automation Pipelines',
        topics: [
          'Connecting tools via no-code automations and webhooks',
          'Automated social media asset repurposing workflows',
          'Studio case study: how MarsNova builds 10x faster with AI pipelines'
        ]
      }
    ],
    prerequisites: 'Basic computer familiarity. No coding or mathematical background needed.',
    targetAudience: 'Content creators, video editors, freelancers, marketers, and business owners.'
  },
  {
    id: 'video-editing-course',
    title: 'Video Editing',
    category: 'Creative Production',
    description: 'Edit YouTube videos, vertical reels, pacing, sound design, colour grading and transitions.',
    icon: 'Film',
    level: 'Intermediate',
    duration: '6 Weeks (Intensive)',
    format: 'Real Agency Footage & Timeline Critiques',
    overview: 'Take your video editing from basic cuts to high-retention agency-grade deliverables. Work directly with real 4K camera footage, multi-track audio, and B-roll archives from MarsNova production shoots.',
    learningOutcomes: [
      'Edit high-retention long-form YouTube videos and high-tempo 9:16 vertical reels.',
      'Master three-point editing, J/L cuts, ripple edits, and speed ramping.',
      'Mix multi-layer audio, apply sound effects (SFX), clean background noise, and duck music.',
      'Balance exposure, match camera color profiles, and apply cinematic color grades.'
    ],
    curriculum: [
      {
        moduleTitle: 'Module 1: Timeline Architecture & Narrative Flow',
        topics: [
          'Project setup, folder structures, and proxy generation for smooth playback',
          'Assembly cuts, A-roll pacing, and conversational trimming',
          'J-cuts, L-cuts, and seamless audio transitions'
        ]
      },
      {
        moduleTitle: 'Module 2: Pacing, Retention & Dynamic Visual Storytelling',
        topics: [
          'The first 5 seconds: crafting high-retention hooks for YouTube & Reels',
          'B-roll layering, punch-ins, zoom transitions, and speed ramping',
          'Motion graphics, subtitles, animated lower thirds, and callouts'
        ]
      },
      {
        moduleTitle: 'Module 3: Sound Design & Foley Mixing',
        topics: [
          'Layering ambient soundscapes, risers, whooshes, and hits',
          'Equalization, compression, noise gates, and voice clarity',
          'Music selection, tempo matching, and auto-ducking'
        ]
      },
      {
        moduleTitle: 'Module 4: Color Correction & Master Export Pipelines',
        topics: [
          'Waveform and vectorscope reading, exposure balancing',
          'LUT application, skin tone matching across cameras',
          'High-bitrate web compression and multi-platform aspect ratio presets'
        ]
      }
    ],
    prerequisites: 'Basic computer operations. Software will be taught from UI walkthroughs.',
    targetAudience: 'Aspiring video editors, YouTube creators, documentary storytellers, and freelance media editors.'
  },
  {
    id: 'graphic-design',
    title: 'Graphic Design',
    category: 'Design & Branding',
    description: 'Create professional posters, high-converting thumbnails, branding and digital visual assets.',
    icon: 'PenTool',
    level: 'Beginner',
    duration: '4 Weeks',
    format: 'Studio Design Lab & Portfolio Reviews',
    overview: 'Design is visual communication built on contrast, hierarchy, typography, and psychology. In this course, learners design real creative assets that stop the scroll and build recognized brand identity.',
    learningOutcomes: [
      'Apply color theory, visual contrast, font pairing, and canvas grid systems.',
      'Design high-CTR YouTube thumbnails that stand out on mobile screens.',
      'Create brand style guides, logo variations, and multi-slide carousel templates.',
      'Master pen tools, mask selections, layer blending, and digital export formats.'
    ],
    curriculum: [
      {
        moduleTitle: 'Module 1: Foundations of Visual Composition & Typography',
        topics: [
          'Color psychology, contrast ratios, and visual balance',
          'Typography hierarchy, font pairing rules, and readability',
          'Working with canvas grids, margins, and negative space'
        ]
      },
      {
        moduleTitle: 'Module 2: High-Converting Thumbnail Design',
        topics: [
          'Facial expression isolation, background separation, and rim lighting',
          '3D text styling, glow effects, and contrast accenting',
          'A/B test thumbnail strategies for YouTube CTR optimization'
        ]
      },
      {
        moduleTitle: 'Module 3: Brand Identity & Multi-Platform Asset Kits',
        topics: [
          'Designing brand kits: color palettes, typography specs, and logo marks',
          'Multi-slide Instagram carousels and promotional posters',
          'Exporting for print (CMYK) vs web (sRGB) with sharp rasterization'
        ]
      }
    ],
    prerequisites: 'Basic computer familiarity. No prior drawing or design skills needed.',
    targetAudience: 'Content creators, aspiring graphic designers, social media managers, and small business owners.'
  },
  {
    id: 'social-media-growth',
    title: 'Social Media Growth',
    category: 'Marketing & Growth',
    description: 'Grow your Instagram, YouTube and online presence with algorithms, hooks and content funnels.',
    icon: 'TrendingUp',
    level: 'Growth',
    duration: '4 Weeks',
    format: 'Strategy Workshops & Live Channel Breakdowns',
    overview: 'Producing great content is only half the battle; distribution is where growth happens. This course explores audience retention metrics, title testing, audience psychology, and systematic upload schedules without clickbait.',
    learningOutcomes: [
      'Analyze YouTube Studio and Instagram Professional metrics (CTR, Average View Duration, Engagement).',
      'Develop content pillars, repeatable series concepts, and title-hook combinations.',
      'Build cross-platform distribution strategies converting short-form viewers into long-form subscribers.',
      'Structure ethical content funnels that turn followers into community members or clients.'
    ],
    curriculum: [
      {
        moduleTitle: 'Module 1: Platform Algorithms & Retention Architecture',
        topics: [
          'How YouTube and Instagram recommendation engines score content',
          'Watch time vs engagement velocity vs satisfaction signals',
          'Diagnosing audience drop-off points in graph analytics'
        ]
      },
      {
        moduleTitle: 'Module 2: Content Packaging & Audience Hooks',
        topics: [
          'Title formula frameworks that generate curiosity without misleading',
          'Writing magnetic script hooks for the critical opening seconds',
          'Content batching, calendar planning, and consistent posting cadence'
        ]
      },
      {
        moduleTitle: 'Module 3: Conversion & Community Building',
        topics: [
          'Fostering genuine community dialogue in comments and live chats',
          'Creating lead magnets, newsletter funnels, and link-in-bio journeys',
          'Monetization avenues: brand deals, consulting, services, and digital products'
        ]
      }
    ],
    prerequisites: 'An active or planned YouTube channel or Instagram business profile.',
    targetAudience: 'Creators, founders, brand managers, consultants, and freelance marketers.'
  },
  {
    id: 'practical-projects',
    title: 'Practical Projects',
    category: 'Creative Production',
    description: 'Hands-on practice with real-world agency briefs, creator shoots, and client assignments.',
    icon: 'Briefcase',
    level: 'Hands-On',
    duration: '4 Weeks',
    format: 'Simulated Client Briefs & Studio Review',
    overview: 'Bridge the gap between learning tools and working with paying clients. Students take raw client briefs, manage deadlines, handle constructive revision rounds, and build a verified, show-ready portfolio.',
    learningOutcomes: [
      'Interpret client creative briefs and translate requirements into asset lists and storyboards.',
      'Execute under realistic turnaround timelines with proper asset naming and project archives.',
      'Navigate client feedback, version revisions (v1, v2, Final), and professional communication.',
      'Package finished work into an accessible, high-impact digital portfolio ready for client pitches.'
    ],
    curriculum: [
      {
        moduleTitle: 'Module 1: Client Brief Deconstruction & Pre-Production',
        topics: [
          'Analyzing commercial video and branding creative briefs',
          'Asset gathering, folder naming conventions, and project file safety',
          'Building treatment decks and client agreement alignment'
        ]
      },
      {
        moduleTitle: 'Module 2: Execution Sprint & Milestone Deliverables',
        topics: [
          'Sprint 1: Editing a 60-second commercial brand promo',
          'Sprint 2: Creating a 3-part vertical reel campaign with custom graphics',
          'Internal quality review and MarsNova mentor feedback round'
        ]
      },
      {
        moduleTitle: 'Module 3: Revision Management & Portfolio Assembly',
        topics: [
          'Implementing client feedback notes with grace and precision',
          'Master delivery packaging, watermarked previews, and asset handover',
          'Building your professional showreel, case studies, and pitch proposal'
        ]
      }
    ],
    prerequisites: 'Completion of any video editing or design module, or equivalent baseline software experience.',
    targetAudience: 'Intermediate students, career switchers, and freelancers preparing for professional client work.'
  }
];

export const workPortfolioData: WorkItem[] = [
  {
    id: 'ai-explained',
    title: 'AI Explained in Hindi',
    category: 'YouTube Videos',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    tag: 'Long Form',
    client: 'MarsNova Tech Series',
    summary: 'A comprehensive educational breakdown explaining how Large Language Models and Generative AI work, scripted in Hindi for mass comprehension.',
    challenge: 'Simplifying complex neural network mechanics, transformer architectures, and tokenization without sacrificing technical integrity or boring the viewer.',
    approach: 'Structured analogy-first storytelling breaking concepts into real-world visual metaphors, accompanied by dynamic 3D neural net graphics and custom code callouts.',
    outcome: 'Achieved an average view duration exceeding 62% and generated 150K+ organic impressions within 14 days of release.',
    metrics: [
      { label: 'Retention Rate', value: '62%' },
      { label: 'Organic Impressions', value: '150K+' },
      { label: 'Subscriber Conversion', value: '+4.8K' }
    ],
    deliverables: [
      '14-Minute 4K Master Video (16:9)',
      'Custom 3D Isometric Thumbnail',
      '5x Vertical 9:16 Shorts Teasers'
    ],
    tools: ['DaVinci Resolve Studio', 'After Effects', 'Blender', 'Photoshop']
  },
  {
    id: 'tech-shorts-breakdown',
    title: 'Tech Shorts Breakdown',
    category: 'Shorts',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    tag: 'Vertical 9:16',
    client: 'Daily Tech Byte',
    summary: 'High-tempo vertical 9:16 micro-video deconstructing smartphone processors, silicon packaging, and cooling systems.',
    challenge: 'Hooking mobile viewers within the first 1.2 seconds of swipe and sustaining pacing across 45 seconds of rapid technical explanation.',
    approach: 'Applied kinetic text animation, synchronized sound design on every graphic transition, and rapid macro b-roll cuts.',
    outcome: 'Reached viral trajectory across Instagram Reels and YouTube Shorts, achieving an 85% completion rate and over 35,000 saves/shares.',
    metrics: [
      { label: 'Completion Rate', value: '85%' },
      { label: 'Total Views', value: '1.2M' },
      { label: 'Total Shares', value: '35K+' }
    ],
    deliverables: [
      '10x Vertical 9:16 Shorts (1080x1920)',
      'Custom Highlighted Caption Motion Template'
    ],
    tools: ['Premiere Pro', 'After Effects', 'CapCut Pro', 'Audition']
  },
  {
    id: 'business-retail-walkthrough',
    title: 'Retail Store Promo Shoot',
    category: 'Business Promotion',
    thumbnailUrl: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    tag: 'Commercial',
    client: 'Nexus Lifestyle Showroom',
    summary: 'On-location cinematic walkthrough video showcasing luxury retail showroom interiors, customer experience, and collection launch.',
    challenge: 'Filming in an active retail environment with mixed color temperatures (3200K tungsten spotlighting and 5600K ambient daylight).',
    approach: 'Utilized cinema camera package on motorized gimbal, balanced illumination using portable wireless LED mats, and directed authentic customer interaction sequences.',
    outcome: 'Generated a verified 32% increase in showroom footfall during the launch weekend via localized Meta and Instagram advertising campaigns.',
    metrics: [
      { label: 'Footfall Lift', value: '+32%' },
      { label: 'Ad CTR', value: '4.2%' },
      { label: 'ROAS', value: '5.8x' }
    ],
    deliverables: [
      '1x 90s Cinematic Brand Film',
      '3x 20s Localized Social Ad Cutdowns'
    ],
    tools: ['Sony FX6 Cinema Rig', 'DJI Ronin Gimbal', 'DaVinci Resolve Log Grading']
  },
  {
    id: 'creator-brand-campaign',
    title: 'Creator Brand Campaign',
    category: 'Social Media',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    tag: 'Campaign',
    client: 'Pulse Fitness Nutrition',
    summary: 'Multi-creator sponsorship campaign consisting of product integration skits, training montages, and swipe-up discount promos.',
    challenge: 'Integrating a fitness supplement brand authentically without making the video feel like a disruptive advertisement.',
    approach: 'Formulated a narrative concept where the product acts as a natural training fuel catalyst during a creator workout challenge.',
    outcome: 'Over 2,400 coupon redemptions generated in the first week, outperforming brand historical benchmarks by 2.4x.',
    metrics: [
      { label: 'Code Redemptions', value: '2,400+' },
      { label: 'Engagement Rate', value: '8.4%' },
      { label: 'Audience Reach', value: '620K+' }
    ],
    deliverables: [
      '4x Sponsored YouTube Integration Segments',
      '6x Dedicated Instagram Reels'
    ],
    tools: ['Final Cut Pro', 'DaVinci Resolve', 'Illustrator']
  }
];

export const statsData = [
  { value: '100+', label: 'Videos Created' },
  { value: '35K+', label: 'Instagram Followers' },
  { value: '99%', label: 'Happy Creators' },
  { value: '50+', label: 'Trusted by Brands' }
];
