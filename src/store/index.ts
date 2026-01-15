import { create } from 'zustand'

// Types
export type Tab = 'analyze' | 'history' | 'analytics' | 'settings'

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  tier: 'GUEST' | 'AUTHENTICATED' | 'PRO';
  githubLogin?: string;
}

export interface UsageInfo {
  used: number;
  limit: number;
  tier: string;
  resetTime?: string;
}

export interface ErrorToast {
  message: string;
  code?: string;
  action?: string;
}

export interface ReferralInfo {
  code: string;
  referralCount: number;
  bonusChekks: number;
  bonusExpiresAt?: string;
}

export interface BulkProgress {
  current: number;
  total: number;
  status: string;
}

export interface ChecklistForm {
  jobTitle: string;
  jd: string;
  experience: string;
  languages: string[];
  location: string;
  archetypes: string[];
  tiers: string[];
  reachability: string[];
  loading: boolean;
}

export interface PendingAnalysis {
  handle: string;
  name?: string;
  avatar: string;
  timestamp: number;
}

export interface PatchedStats {
  totalRepos?: number;
  totalCommits?: number;
  lastActive?: string;
  totalStars?: number;
  languages?: number;
  name?: string;
  languagesList?: string[];
}

// Store interface
interface VibeStore {
  // User & Auth state
  user: User | null;
  setUser: (user: User | null) => void;
  isLoggingIn: boolean;
  setIsLoggingIn: (loading: boolean) => void;
  authLoading: boolean;
  setAuthLoading: (loading: boolean) => void;
  githubUsername: string | null;
  setGithubUsername: (username: string | null) => void;
  githubLinked: boolean;
  setGithubLinked: (linked: boolean) => void;
  usageInfo: UsageInfo | null;
  setUsageInfo: (info: UsageInfo | null) => void;
  referralInfo: ReferralInfo | null;
  setReferralInfo: (info: ReferralInfo | null) => void;

  // Tokens
  tokens: { github: string; deepseek: string; vibeToken: string };
  setTokens: (tokens: { github: string; deepseek: string; vibeToken: string }) => void;

  // UI State
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  manualUrl: string;
  setManualUrl: (url: string) => void;
  errorToast: ErrorToast | null;
  setErrorToast: (toast: ErrorToast | null) => void;

  // Modal states
  limitPaywallOpen: boolean;
  setLimitPaywallOpen: (open: boolean) => void;
  proFeaturePaywallOpen: string | null;
  setProFeaturePaywallOpen: (feature: string | null) => void;
  showInviteModal: boolean;
  setShowInviteModal: (show: boolean) => void;
  showConcurrentModal: boolean;
  setShowConcurrentModal: (show: boolean) => void;
  showActivityFeed: boolean;
  setShowActivityFeed: (show: boolean) => void;
  showChecklistForm: boolean;
  setShowChecklistForm: (show: boolean) => void;
  showBulkChekkForm: boolean;
  setShowBulkChekkForm: (show: boolean) => void;
  showClearDropdown: boolean;
  setShowClearDropdown: (show: boolean) => void;

  // Analysis state
  selectedReport: any | null;
  setSelectedReport: (report: any | null) => void;
  history: any[];
  setHistory: (history: any[]) => void;
  analytics: any | null;
  setAnalytics: (analytics: any | null) => void;
  analyticsLoading: boolean;
  setAnalyticsLoading: (loading: boolean) => void;
  loadingStep: number;
  setLoadingStep: (step: number) => void;
  patchedStats: PatchedStats | null;
  setPatchedStats: (stats: PatchedStats | null) => void;

  // Filters
  tierFilter: string | null;
  setTierFilter: (filter: string | null) => void;
  archetypeFilter: string | null;
  setArchetypeFilter: (filter: string | null) => void;

  // Expansion states
  expandedMerits: number[];
  setExpandedMerits: (merits: number[]) => void;
  expandedSkills: number[];
  setExpandedSkills: (skills: number[]) => void;
  expandedSearchId: number | null;
  setExpandedSearchId: (id: number | null) => void;

  // Display toggles
  showFullSummary: boolean;
  setShowFullSummary: (show: boolean) => void;
  showDetailedSummary: boolean;
  setShowDetailedSummary: (show: boolean) => void;
  showTechnicalSignal: boolean;
  setShowTechnicalSignal: (show: boolean) => void;
  showDetailedTechnical: boolean;
  setShowDetailedTechnical: (show: boolean) => void;

  // Copy state
  copiedId: string | null;
  setCopiedId: (id: string | null) => void;

  // Auto-chekk state
  autoChekk: boolean;
  setAutoChekk: (enabled: boolean) => void;
  pendingAnalyses: PendingAnalysis[];
  setPendingAnalyses: (analyses: PendingAnalysis[]) => void;
  autochekkLogs: any[];
  setAutochekkLogs: (logs: any[]) => void;

  // Bulk analysis state
  bulkChekkTab: 'import' | 'history';
  setBulkChekkTab: (tab: 'import' | 'history') => void;
  bulkHistory: any[];
  setBulkHistory: (history: any[]) => void;
  bulkFile: File | null;
  setBulkFile: (file: File | null) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  bulkProcessing: boolean;
  setBulkProcessing: (processing: boolean) => void;
  bulkProgress: BulkProgress;
  setBulkProgress: (progress: BulkProgress) => void;
  bulkResults: any[];
  setBulkResults: (results: any[]) => void;
  pendingHandles: string[];
  setPendingHandles: (handles: string[]) => void;

  // Enrichment state
  enriching: boolean;
  setEnriching: (enriching: boolean) => void;
  enrichmentStatus: 'idle' | 'success' | 'no_match' | 'error';
  setEnrichmentStatus: (status: 'idle' | 'success' | 'no_match' | 'error') => void;
  emailTooltip: string | null;
  setEmailTooltip: (id: string | null) => void;

  // Checklist state
  checklistTab: 'configure' | 'active';
  setChecklistTab: (tab: 'configure' | 'active') => void;
  checklistForm: ChecklistForm;
  setChecklistForm: (form: ChecklistForm) => void;
  activeSearches: any[];
  setActiveSearches: (searches: any[]) => void;
  deleteConfirmId: string | null;
  setDeleteConfirmId: (id: string | null) => void;
  checklistFilters: { location: string; minScore: number };
  setChecklistFilters: (filters: { location: string; minScore: number }) => void;
}

// Create store
export const useVibeStore = create<VibeStore>((set) => ({
  // User & Auth initial state
  user: null,
  setUser: (user) => set({ user }),
  isLoggingIn: false,
  setIsLoggingIn: (isLoggingIn) => set({ isLoggingIn }),
  authLoading: true,
  setAuthLoading: (authLoading) => set({ authLoading }),
  githubUsername: null,
  setGithubUsername: (githubUsername) => set({ githubUsername }),
  githubLinked: false,
  setGithubLinked: (githubLinked) => set({ githubLinked }),
  usageInfo: null,
  setUsageInfo: (usageInfo) => set({ usageInfo }),
  referralInfo: null,
  setReferralInfo: (referralInfo) => set({ referralInfo }),

  // Tokens initial state
  tokens: { github: '', deepseek: '', vibeToken: '' },
  setTokens: (tokens) => set({ tokens }),

  // UI initial state
  activeTab: 'analyze' as Tab,
  setActiveTab: (activeTab) => set({ activeTab }),
  manualUrl: '',
  setManualUrl: (manualUrl) => set({ manualUrl }),
  errorToast: null,
  setErrorToast: (errorToast) => set({ errorToast }),

  // Modal initial states
  limitPaywallOpen: false,
  setLimitPaywallOpen: (limitPaywallOpen) => set({ limitPaywallOpen }),
  proFeaturePaywallOpen: null,
  setProFeaturePaywallOpen: (proFeaturePaywallOpen) => set({ proFeaturePaywallOpen }),
  showInviteModal: false,
  setShowInviteModal: (showInviteModal) => set({ showInviteModal }),
  showConcurrentModal: false,
  setShowConcurrentModal: (showConcurrentModal) => set({ showConcurrentModal }),
  showActivityFeed: false,
  setShowActivityFeed: (showActivityFeed) => set({ showActivityFeed }),
  showChecklistForm: false,
  setShowChecklistForm: (showChecklistForm) => set({ showChecklistForm }),
  showBulkChekkForm: false,
  setShowBulkChekkForm: (showBulkChekkForm) => set({ showBulkChekkForm }),
  showClearDropdown: false,
  setShowClearDropdown: (showClearDropdown) => set({ showClearDropdown }),

  // Analysis initial state
  selectedReport: null,
  setSelectedReport: (selectedReport) => set({ selectedReport }),
  history: [],
  setHistory: (history) => set({ history }),
  analytics: null,
  setAnalytics: (analytics) => set({ analytics }),
  analyticsLoading: true,
  setAnalyticsLoading: (analyticsLoading) => set({ analyticsLoading }),
  loadingStep: 0,
  setLoadingStep: (loadingStep) => set({ loadingStep }),
  patchedStats: null,
  setPatchedStats: (patchedStats) => set({ patchedStats }),

  // Filters initial state
  tierFilter: null,
  setTierFilter: (tierFilter) => set({ tierFilter }),
  archetypeFilter: null,
  setArchetypeFilter: (archetypeFilter) => set({ archetypeFilter }),

  // Expansion initial states
  expandedMerits: [],
  setExpandedMerits: (expandedMerits) => set({ expandedMerits }),
  expandedSkills: [],
  setExpandedSkills: (expandedSkills) => set({ expandedSkills }),
  expandedSearchId: null,
  setExpandedSearchId: (expandedSearchId) => set({ expandedSearchId }),

  // Display toggles initial state
  showFullSummary: false,
  setShowFullSummary: (showFullSummary) => set({ showFullSummary }),
  showDetailedSummary: false,
  setShowDetailedSummary: (showDetailedSummary) => set({ showDetailedSummary }),
  showTechnicalSignal: false,
  setShowTechnicalSignal: (showTechnicalSignal) => set({ showTechnicalSignal }),
  showDetailedTechnical: false,
  setShowDetailedTechnical: (showDetailedTechnical) => set({ showDetailedTechnical }),

  // Copy initial state
  copiedId: null,
  setCopiedId: (copiedId) => set({ copiedId }),

  // Auto-chekk initial state
  autoChekk: false,
  setAutoChekk: (autoChekk) => set({ autoChekk }),
  pendingAnalyses: [],
  setPendingAnalyses: (pendingAnalyses) => set({ pendingAnalyses }),
  autochekkLogs: [],
  setAutochekkLogs: (autochekkLogs) => set({ autochekkLogs }),

  // Bulk analysis initial state
  bulkChekkTab: 'import',
  setBulkChekkTab: (bulkChekkTab) => set({ bulkChekkTab }),
  bulkHistory: [],
  setBulkHistory: (bulkHistory) => set({ bulkHistory }),
  bulkFile: null,
  setBulkFile: (bulkFile) => set({ bulkFile }),
  isDragging: false,
  setIsDragging: (isDragging) => set({ isDragging }),
  bulkProcessing: false,
  setBulkProcessing: (bulkProcessing) => set({ bulkProcessing }),
  bulkProgress: { current: 0, total: 0, status: '' },
  setBulkProgress: (bulkProgress) => set({ bulkProgress }),
  bulkResults: [],
  setBulkResults: (bulkResults) => set({ bulkResults }),
  pendingHandles: [],
  setPendingHandles: (pendingHandles) => set({ pendingHandles }),

  // Enrichment initial state
  enriching: false,
  setEnriching: (enriching) => set({ enriching }),
  enrichmentStatus: 'idle',
  setEnrichmentStatus: (enrichmentStatus) => set({ enrichmentStatus }),
  emailTooltip: null,
  setEmailTooltip: (emailTooltip) => set({ emailTooltip }),

  // Checklist initial state
  checklistTab: 'configure',
  setChecklistTab: (checklistTab) => set({ checklistTab }),
  checklistForm: {
    jobTitle: '',
    jd: '',
    experience: '',
    languages: [],
    location: '',
    archetypes: [],
    tiers: [],
    reachability: [],
    loading: false,
  },
  setChecklistForm: (checklistForm) => set({ checklistForm }),
  activeSearches: [],
  setActiveSearches: (activeSearches) => set({ activeSearches }),
  deleteConfirmId: null,
  setDeleteConfirmId: (deleteConfirmId) => set({ deleteConfirmId }),
  checklistFilters: { location: '', minScore: 0 },
  setChecklistFilters: (checklistFilters) => set({ checklistFilters }),
}))
