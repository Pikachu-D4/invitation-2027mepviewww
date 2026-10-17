import { DEFAULT_SITE_CONTENT, type SiteContent } from '@/lib/content';

export type LeaderSlot = {
  id: number;
  name: string | null;
  role: string | null;
  avatar: string;
  status: 'open' | 'filled';
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SubmittedApplication = {
  id: number;
  name: string;
  email: string;
  whatsapp: string;
  bio: string | null;
  profileImage: string;
  status: string;
  adminNotes?: string | null;
  leaderId: number | null;
  requestedRole?: string | null;
  requestedPosition?: number | null;
  instagramUsername?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MemoryRevision = {
  id: number;
  contentId: string;
  data: SiteContent;
  action: string;
  createdBy?: string;
  createdAt: Date;
};

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader2',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader3',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader5',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=leader6',
];

function createDefaultLeaders(): LeaderSlot[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    name: null,
    role: index < 3 ? 'Leader' : 'Co-Leader',
    avatar: DEFAULT_AVATARS[index],
    status: 'open',
    position: index + 1,
    createdAt: now,
    updatedAt: now,
  }));
}

interface MemoryStore {
  leaders: LeaderSlot[];
  applications: SubmittedApplication[];
  siteContent: SiteContent;
  revisions: MemoryRevision[];
  nextAppId: number;
  nextRevId: number;
}

declare global {
  var __mep_store: MemoryStore | undefined;
}

function getStore(): MemoryStore {
  if (!globalThis.__mep_store) {
    const initialContent = JSON.parse(JSON.stringify(DEFAULT_SITE_CONTENT));
    globalThis.__mep_store = {
      leaders: createDefaultLeaders(),
      applications: [],
      siteContent: initialContent,
      revisions: [
        {
          id: 1,
          contentId: 'main',
          data: initialContent,
          action: 'initial',
          createdBy: 'system',
          createdAt: new Date(),
        },
      ],
      nextAppId: 1,
      nextRevId: 2,
    };
  }
  return globalThis.__mep_store;
}

export const memoryStore = {
  getLeaders(): LeaderSlot[] {
    const store = getStore();
    return [...store.leaders].sort((a, b) => a.position - b.position);
  },

  resetLeader(position: number): LeaderSlot | null {
    const store = getStore();
    const leader = store.leaders.find((l) => l.position === position);
    if (!leader) return null;

    leader.name = null;
    leader.avatar = DEFAULT_AVATARS[position - 1] || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
    leader.status = 'open';
    leader.updatedAt = new Date();
    return { ...leader };
  },

  getApplications(): SubmittedApplication[] {
    const store = getStore();
    return [...store.applications].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  },

  addApplication(data: {
    name: string;
    email: string;
    whatsapp: string;
    bio: string | null;
    profileImage: string;
    requestedRole?: string | null;
    requestedPosition?: number | null;
    instagramUsername?: string | null;
  }): { application: SubmittedApplication } {
    const store = getStore();
    const now = new Date();

    // Create application record as pending and unassigned
    const application: SubmittedApplication = {
      id: store.nextAppId++,
      name: data.name,
      email: data.email,
      whatsapp: data.whatsapp,
      bio: data.bio,
      profileImage: data.profileImage,
      status: 'pending',
      leaderId: null,
      requestedRole: data.requestedRole || null,
      requestedPosition: data.requestedPosition ?? null,
      instagramUsername: data.instagramUsername || null,
      createdAt: now,
      updatedAt: now,
    };

    store.applications.push(application);
    return { application: { ...application } };
  },

  updateApplication(
    id: number,
    updates: { status?: string; adminNotes?: string | null; leaderId?: number | null }
  ): SubmittedApplication | null {
    const store = getStore();
    const app = store.applications.find((a) => a.id === id);
    if (!app) return null;

    if (updates.status !== undefined) {
      app.status = updates.status;
    }
    if (updates.adminNotes !== undefined) {
      app.adminNotes = updates.adminNotes;
    }
    if (updates.leaderId !== undefined) {
      app.leaderId = updates.leaderId;
    }
    app.updatedAt = new Date();
    return { ...app };
  },

  deleteApplication(id: number): boolean {
    const store = getStore();
    const index = store.applications.findIndex((a) => a.id === id);
    if (index === -1) return false;

    const app = store.applications[index];
    store.applications.splice(index, 1);

    // Free the associated leader slot if any
    if (app.leaderId) {
      const leader = store.leaders.find((l) => l.id === app.leaderId);
      if (leader) {
        leader.name = null;
        leader.avatar = DEFAULT_AVATARS[leader.position - 1] || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
        leader.status = 'open';
        leader.updatedAt = new Date();
      }
    }

    return true;
  },

  // Website Content
  getContent(): SiteContent {
    const store = getStore();
    return JSON.parse(JSON.stringify(store.siteContent));
  },

  updateContent(newContent: SiteContent, createdBy: string = 'admin'): SiteContent {
    const store = getStore();
    store.siteContent = JSON.parse(JSON.stringify(newContent));
    store.revisions.unshift({
      id: store.nextRevId++,
      contentId: 'main',
      data: JSON.parse(JSON.stringify(newContent)),
      action: 'update',
      createdBy,
      createdAt: new Date(),
    });
    // Keep up to 20 revisions
    if (store.revisions.length > 20) {
      store.revisions.pop();
    }
    return JSON.parse(JSON.stringify(store.siteContent));
  },

  resetContent(createdBy: string = 'admin'): SiteContent {
    const store = getStore();
    store.siteContent = JSON.parse(JSON.stringify(DEFAULT_SITE_CONTENT));
    store.revisions.unshift({
      id: store.nextRevId++,
      contentId: 'main',
      data: JSON.parse(JSON.stringify(DEFAULT_SITE_CONTENT)),
      action: 'reset',
      createdBy,
      createdAt: new Date(),
    });
    return JSON.parse(JSON.stringify(store.siteContent));
  },

  getRevisions(): MemoryRevision[] {
    const store = getStore();
    return [...store.revisions];
  },
};
