export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface InfoCard {
  id: string;
  title: string;
  text: string;
}

export interface SiteContent {
  // 1. Hero Section
  hero: {
    visible: boolean;
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    primaryCtaLabel: string;
    primaryCtaLink: string;
    secondaryCtaLabel: string;
    secondaryCtaLink: string;
    learnMoreLabel: string;
    learnMoreLink: string;
    welcomeBadge: string;
  };

  // 2. Event & Countdown Settings
  event: {
    countdownVisible: boolean;
    countdownHeading: string;
    targetDate: string; // ISO string format e.g. "2027-01-01T00:00:00"
    timezone: string; // "Asia/Kolkata"
  };

  // 3. Announcement Banner
  announcement: {
    enabled: boolean;
    text: string;
    linkLabel?: string;
    linkUrl?: string;
    style: 'gradient' | 'gold' | 'blue' | 'minimal' | 'festive';
    startDate?: string | null; // ISO string or null
    endDate?: string | null; // ISO string or null
  };

  // 4. About MEP Section
  about: {
    visible: boolean;
    heading: string;
    subtitle: string;
    introParagraph: string;
    additionalParagraphs: string[];
    totalParticipants: number;
    squadCount: number;
    squadStructure: {
      leaderCount: number;
      coLeaderCount: number;
      memberCount: number;
    };
    leaderResponsibilities: string[];
    coLeaderResponsibilities: string[];
    calloutText: string;
    ctaButtonText?: string;
    ctaButtonLink?: string;
    infoCards: InfoCard[];
  };

  // 5. Frequently Asked Questions
  faqs: FaqItem[];

  // 6. Contact & Social Links
  contact: {
    heading: string;
    subtitle: string;
    email: string;
    discordUrl: string;
    telegramUrl: string;
    whatsappUrl?: string;
    youtubeUrl?: string;
  };
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  hero: {
    visible: true,
    titleLine1: "New Year 2027",
    titleLine2: "MEP Invitation",
    subtitle: "Celebrate progress, leadership, and community. You are invited to join New Year 2027 AMV MEP.",
    primaryCtaLabel: "Apply as Leader",
    primaryCtaLink: "#apply",
    secondaryCtaLabel: "Apply as Co-Leader",
    secondaryCtaLink: "#apply",
    learnMoreLabel: "Learn more",
    learnMoreLink: "#about",
    welcomeBadge: "🎬 2027 Mega AMV New Year MEP",
  },
  event: {
    countdownVisible: true,
    countdownHeading: "Total days left in New Year",
    targetDate: "2027-01-01T00:00:00+05:30",
    timezone: "Asia/Kolkata",
  },
  announcement: {
    enabled: true,
    text: "🎉 Applications for MEP 2027 Squad Leaders & Co-Leaders are now open! Only 6 leadership spots available.",
    linkLabel: "Apply Now",
    linkUrl: "#apply",
    style: "gradient",
    startDate: null,
    endDate: null,
  },
  about: {
    visible: true,
    heading: "About the MEP",
    subtitle: "Thirty editors. Three squads. One shared New Year release.",
    introParagraph:
      "MEP stands for Multi-Editor Project. For the New Year 2027 edition, 30 editors will contribute separate parts to one shared AMV. The work is organised into three squads, allowing each editor to contribute their own style while helping the finished video feel connected from beginning to end.",
    additionalParagraphs: [
      "Each squad has a Leader and a Co-Leader. Leaders coordinate assignments, track progress and collect the finished parts for the final merge. Co-Leaders help with communication, follow up on tasks and support editors when plans need adjusting. Both roles involve working with people, keeping the team organised and helping the squad meet its deadlines.",
      "Applications are open for three Leader positions (1–3) and three Co-Leader positions (4–6). Applicants can select a preferred role and position on the form. Their selection is a preference, not a confirmed assignment; the final allocation is made after the application is reviewed by an administrator.",
    ],
    totalParticipants: 30,
    squadCount: 3,
    squadStructure: {
      leaderCount: 1,
      coLeaderCount: 1,
      memberCount: 8,
    },
    leaderResponsibilities: [
      "Personally selected and entrusted with guiding their squad",
      "Responsible for communication, track coordination, quality control, and team motivation",
      "Collaborating closely with co-leader for smooth deadline execution",
      "Collecting and merging team member clips by the milestone cutoff",
    ],
    coLeaderResponsibilities: [
      "Co-direct squad editors and support scene assignments",
      "Monitor daily progress and assist with feedback and pacing adjustments",
      "Help prepare backup editors and oversee project delivery standards",
    ],
    calloutText:
      "If you communicate clearly, organise work reliably and enjoy helping other editors, consider applying. Tell us briefly about your experience and what you would bring to the team.",
    ctaButtonText: "Apply for a leadership role",
    ctaButtonLink: "#apply",
    infoCards: [
      {
        id: "vision",
        title: "Vision",
        text: "To celebrate New Year 2027 with leaders and squads who combine artistry, teamwork, and energy shaping the ultimate AMV MEP.",
      },
      {
        id: "structure",
        title: "Structure",
        text: "3 Leaders + 3 Co-Leaders working together to guide 3 distinct squads with clear deadlines and milestone tracking.",
      },
      {
        id: "role",
        title: "Leader & Co-Leader Role",
        text: "Observe, Direct, Support, Uplift and collaborate to deliver creative excellence on schedule.",
      },
    ],
  },
  faqs: [
    {
      id: "faq-1",
      question: "What is this MEP about?",
      answer: "This MEP is a collaborative AMV project where multiple editors edit different parts of the same audio/theme for New Year Celebration.",
      category: "General",
    },
    {
      id: "faq-2",
      question: "Do I need to follow a \"New Year vibe\" in my edit?",
      answer: "Yes, bright colors, fireworks, celebration, transitions, or anything that gives a New Year energy feel.",
      category: "Creative",
    },
    {
      id: "faq-3",
      question: "Is there a specific anime style for this New Year MEP?",
      answer: "No specific anime is required, but clips should match the uplifting or fresh-start theme.",
      category: "Creative",
    },
    {
      id: "faq-4",
      question: "Can I use darker or sad scenes?",
      answer: "Light emotional scenes are allowed, but the overall tone must shift toward hope or new beginnings.",
      category: "Creative",
    },
    {
      id: "faq-5",
      question: "What are the editing requirements for this New Year MEP?",
      answer: "1080p, 23.976/30FPS, clean sync, and smooth transitions that match the celebration theme.",
      category: "Technical",
    },
    {
      id: "faq-6",
      question: "When is the deadline?",
      answer: "The final deadline for all members to submit their parts is on or before 15 December. Group leaders are responsible for collecting and merging all parts from their team by 20 December.",
      category: "Timeline",
    },
    {
      id: "faq-7",
      question: "Can I upload my part after the full MEP is released?",
      answer: "Yes. Once the complete New Year MEP is uploaded, you are allowed to post your individual part.",
      category: "Distribution",
    },
    {
      id: "faq-8",
      question: "What happens if someone drops out near the deadline?",
      answer: "In case of dropouts, backup editors may be assigned. It is the responsibility of the group leader and co-leader to ensure the squad part is completed for release.",
      category: "Rules",
    },
    {
      id: "faq-9",
      question: "When will the final MEP be uploaded?",
      answer: "The MEP will be uploaded on 1 January according to Hawaii Standard Time (HST). Since Hawaii reaches the New Year last, this ensures that every country in the world will already be in 1 January when the MEP goes live.",
      category: "Timeline",
    },
  ],
  contact: {
    heading: "Contact & Community",
    subtitle: "Any questions or query? We'd love to hear from you.",
    email: "toxicsmile22936@gmail.com",
    discordUrl: "https://discordapp.com/users/1263021894773506162",
    telegramUrl: "https://t.me/toxicsmile22936",
    whatsappUrl: "",
    youtubeUrl: "",
  },
};

/**
 * Validates and sanitizes a URL.
 * Only allows https://, mailto:, or anchor links (#).
 */
export function sanitizeUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  return '';
}

/**
 * Filter public-facing content (e.g. check announcement expiration).
 */
export function filterPublicContent(content: SiteContent): SiteContent {
  const publicCopy: SiteContent = JSON.parse(JSON.stringify(content));

  // Check announcement dates
  if (publicCopy.announcement && publicCopy.announcement.enabled) {
    const now = new Date().getTime();
    if (publicCopy.announcement.startDate) {
      const start = new Date(publicCopy.announcement.startDate).getTime();
      if (!isNaN(start) && now < start) {
        publicCopy.announcement.enabled = false;
      }
    }
    if (publicCopy.announcement.endDate) {
      const end = new Date(publicCopy.announcement.endDate).getTime();
      if (!isNaN(end) && now > end) {
        publicCopy.announcement.enabled = false;
      }
    }
  }

  return publicCopy;
}

/**
 * Validates submitted SiteContent object.
 * Returns { valid: boolean, errors: string[], sanitized: SiteContent }.
 */
export function validateSiteContent(input: any): {
  valid: boolean;
  errors: string[];
  sanitized: SiteContent;
} {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: ['Invalid content payload. Expected an object.'],
      sanitized: DEFAULT_SITE_CONTENT,
    };
  }

  // Deep clone default as base to ensure all fields exist
  const sanitized: SiteContent = JSON.parse(JSON.stringify(DEFAULT_SITE_CONTENT));

  // 1. Hero
  if (input.hero && typeof input.hero === 'object') {
    sanitized.hero.visible = Boolean(input.hero.visible);
    if (typeof input.hero.titleLine1 === 'string' && input.hero.titleLine1.trim()) {
      sanitized.hero.titleLine1 = input.hero.titleLine1.trim().slice(0, 100);
    }
    if (typeof input.hero.titleLine2 === 'string' && input.hero.titleLine2.trim()) {
      sanitized.hero.titleLine2 = input.hero.titleLine2.trim().slice(0, 100);
    }
    if (typeof input.hero.subtitle === 'string') {
      sanitized.hero.subtitle = input.hero.subtitle.trim().slice(0, 500);
    }
    if (typeof input.hero.primaryCtaLabel === 'string') {
      sanitized.hero.primaryCtaLabel = input.hero.primaryCtaLabel.trim().slice(0, 50);
    }
    if (typeof input.hero.primaryCtaLink === 'string') {
      sanitized.hero.primaryCtaLink = sanitizeUrl(input.hero.primaryCtaLink) || '#apply';
    }
    if (typeof input.hero.secondaryCtaLabel === 'string') {
      sanitized.hero.secondaryCtaLabel = input.hero.secondaryCtaLabel.trim().slice(0, 50);
    }
    if (typeof input.hero.secondaryCtaLink === 'string') {
      sanitized.hero.secondaryCtaLink = sanitizeUrl(input.hero.secondaryCtaLink) || '#apply';
    }
    if (typeof input.hero.learnMoreLabel === 'string') {
      sanitized.hero.learnMoreLabel = input.hero.learnMoreLabel.trim().slice(0, 50);
    }
    if (typeof input.hero.learnMoreLink === 'string') {
      sanitized.hero.learnMoreLink = sanitizeUrl(input.hero.learnMoreLink) || '#about';
    }
    if (typeof input.hero.welcomeBadge === 'string') {
      sanitized.hero.welcomeBadge = input.hero.welcomeBadge.trim().slice(0, 100);
    }
  }

  // 2. Event & Countdown
  if (input.event && typeof input.event === 'object') {
    sanitized.event.countdownVisible = Boolean(input.event.countdownVisible);
    if (typeof input.event.countdownHeading === 'string' && input.event.countdownHeading.trim()) {
      sanitized.event.countdownHeading = input.event.countdownHeading.trim().slice(0, 120);
    }
    if (typeof input.event.targetDate === 'string' && input.event.targetDate.trim()) {
      const parsedDate = new Date(input.event.targetDate);
      if (isNaN(parsedDate.getTime())) {
        errors.push('Event target date is invalid. Please supply a valid ISO date.');
      } else {
        sanitized.event.targetDate = input.event.targetDate.trim();
      }
    }
    if (typeof input.event.timezone === 'string' && input.event.timezone.trim()) {
      sanitized.event.timezone = input.event.timezone.trim().slice(0, 50);
    }
  }

  // 3. Announcement
  if (input.announcement && typeof input.announcement === 'object') {
    sanitized.announcement.enabled = Boolean(input.announcement.enabled);
    if (typeof input.announcement.text === 'string') {
      sanitized.announcement.text = input.announcement.text.trim().slice(0, 300);
    }
    if (typeof input.announcement.linkLabel === 'string') {
      sanitized.announcement.linkLabel = input.announcement.linkLabel.trim().slice(0, 50);
    }
    if (typeof input.announcement.linkUrl === 'string') {
      sanitized.announcement.linkUrl = sanitizeUrl(input.announcement.linkUrl);
    }
    const safeStyles = ['gradient', 'gold', 'blue', 'minimal', 'festive'] as const;
    if (safeStyles.includes(input.announcement.style)) {
      sanitized.announcement.style = input.announcement.style;
    }
    sanitized.announcement.startDate = input.announcement.startDate ? String(input.announcement.startDate) : null;
    sanitized.announcement.endDate = input.announcement.endDate ? String(input.announcement.endDate) : null;
  }

  // 4. About MEP
  if (input.about && typeof input.about === 'object') {
    sanitized.about.visible = Boolean(input.about.visible);
    if (typeof input.about.heading === 'string' && input.about.heading.trim()) {
      sanitized.about.heading = input.about.heading.trim().slice(0, 100);
    } else {
      errors.push('About section heading is required.');
    }
    if (typeof input.about.subtitle === 'string') {
      sanitized.about.subtitle = input.about.subtitle.trim().slice(0, 200);
    }
    if (typeof input.about.introParagraph === 'string') {
      sanitized.about.introParagraph = input.about.introParagraph.trim().slice(0, 1000);
    }
    if (Array.isArray(input.about.additionalParagraphs)) {
      sanitized.about.additionalParagraphs = input.about.additionalParagraphs
        .filter((p: any) => typeof p === 'string' && p.trim())
        .map((p: string) => p.trim().slice(0, 1500));
    }
    if (typeof input.about.totalParticipants === 'number' && input.about.totalParticipants > 0) {
      sanitized.about.totalParticipants = Math.min(1000, Math.floor(input.about.totalParticipants));
    }
    if (typeof input.about.squadCount === 'number' && input.about.squadCount > 0) {
      sanitized.about.squadCount = Math.min(100, Math.floor(input.about.squadCount));
    }
    if (input.about.squadStructure && typeof input.about.squadStructure === 'object') {
      sanitized.about.squadStructure = {
        leaderCount: Math.max(1, Number(input.about.squadStructure.leaderCount) || 1),
        coLeaderCount: Math.max(0, Number(input.about.squadStructure.coLeaderCount) || 1),
        memberCount: Math.max(1, Number(input.about.squadStructure.memberCount) || 8),
      };
    }
    if (Array.isArray(input.about.leaderResponsibilities)) {
      sanitized.about.leaderResponsibilities = input.about.leaderResponsibilities
        .filter((r: any) => typeof r === 'string' && r.trim())
        .map((r: string) => r.trim().slice(0, 300));
    }
    if (Array.isArray(input.about.coLeaderResponsibilities)) {
      sanitized.about.coLeaderResponsibilities = input.about.coLeaderResponsibilities
        .filter((r: any) => typeof r === 'string' && r.trim())
        .map((r: string) => r.trim().slice(0, 300));
    }
    if (typeof input.about.calloutText === 'string') {
      sanitized.about.calloutText = input.about.calloutText.trim().slice(0, 500);
    }
    if (typeof input.about.ctaButtonText === 'string') {
      sanitized.about.ctaButtonText = input.about.ctaButtonText.trim().slice(0, 80);
    }
    if (typeof input.about.ctaButtonLink === 'string') {
      sanitized.about.ctaButtonLink = sanitizeUrl(input.about.ctaButtonLink) || '#apply';
    }
    if (Array.isArray(input.about.infoCards)) {
      sanitized.about.infoCards = input.about.infoCards
        .filter((c: any) => c && typeof c === 'object' && c.title)
        .map((c: any, index: number) => ({
          id: String(c.id || `card-${index + 1}`),
          title: String(c.title).trim().slice(0, 80),
          text: String(c.text || '').trim().slice(0, 600),
        }));
    }
  }

  // 5. FAQs
  if (Array.isArray(input.faqs)) {
    sanitized.faqs = input.faqs
      .filter((f: any) => f && typeof f === 'object' && f.question && f.answer)
      .map((f: any, index: number) => ({
        id: String(f.id || `faq-${index + 1}`),
        question: String(f.question).trim().slice(0, 200),
        answer: String(f.answer).trim().slice(0, 1000),
        category: f.category ? String(f.category).trim().slice(0, 50) : undefined,
      }));
  }

  // 6. Contact
  if (input.contact && typeof input.contact === 'object') {
    if (typeof input.contact.heading === 'string') {
      sanitized.contact.heading = input.contact.heading.trim().slice(0, 100);
    }
    if (typeof input.contact.subtitle === 'string') {
      sanitized.contact.subtitle = input.contact.subtitle.trim().slice(0, 300);
    }
    if (typeof input.contact.email === 'string') {
      sanitized.contact.email = input.contact.email.trim().slice(0, 100);
    }
    if (typeof input.contact.discordUrl === 'string') {
      sanitized.contact.discordUrl = sanitizeUrl(input.contact.discordUrl);
    }
    if (typeof input.contact.telegramUrl === 'string') {
      sanitized.contact.telegramUrl = sanitizeUrl(input.contact.telegramUrl);
    }
    if (typeof input.contact.whatsappUrl === 'string') {
      sanitized.contact.whatsappUrl = sanitizeUrl(input.contact.whatsappUrl);
    }
    if (typeof input.contact.youtubeUrl === 'string') {
      sanitized.contact.youtubeUrl = sanitizeUrl(input.contact.youtubeUrl);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}
