import { useState, useEffect, useRef } from 'react'
import { Clock, Search, TrendingUp, ChevronDown, ChevronRight, ArrowLeft, Copy, AlertTriangle, AlertCircle, BadgeCheck, Zap, FileDown, User, BookOpen, Layers, Plus, Loader2, Heart, Star, Hammer, Code, Cpu, Target, GitPullRequest, Gem, Wrench, Rocket, Coffee, Compass, Ghost, Settings, Lock, Info, Binoculars, LogOut, X, Trash, Trash2, Radio, ClipboardList, Upload, FileSpreadsheet, Shield, Minus } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist';
import Papa from 'papaparse';
import html2canvas from 'html2canvas';
// Disable worker to run PDF parsing in main thread (required for Chrome Extension CSP)
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(' ') + '\n';
  }
  return text;
};
import { BACKEND_URL } from './constants'
import './App.css'

const rarityColors: Record<string, string> = {
  'LEGENDARY': '#f59e0b',     // Gold/Amber for top 1%
  'ULTRA RARE': '#8b5cf6',    // Purple for top 5%
  'RARE': '#3b82f6',          // Blue for top 15%
  'UNCOMMON': '#10b981',      // Green for top 30%
  'COMMON': '#64748b'         // Gray for bottom 50%
}

type Tab = 'analyze' | 'history' | 'analytics' | 'settings'

const VibeLogo = ({ size = 20, color = 'currentColor', className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0 }}
    {...props}
  >
    <path
      fill={color === 'currentColor' ? 'var(--accent)' : color}
      d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    />
    <path
      fill="white"
      d="M12 17.5L6 7.5H10L12 12L14 7.5H18L12 17.5Z"
    />
  </svg>
)

const ArchetypeIcon = ({ label, rarity, size = 16 }: { label: string, rarity?: string, size?: number }) => {
  const ArchetypeMap: Record<string, any> = {
    // 🌟🌟🌟 LEGENDARY (Top 1%)
    'the 10x engineer': Rocket,       // Rocket for industry legends launching major projects

    // 🌟🌟 ULTRA RARE (Top 5%)
    'the architect': Layers,          // Layers for system design/architecture
    'the professor': BookOpen,        // Book for educators/teachers

    // ⭐ RARE (Top 15%)
    'the specialist': Target,         // Target for focused deep expertise
    'the systems thinker': Cpu,       // CPU for infrastructure/systems work

    // ◆ UNCOMMON (Top 30%)
    'the maintainer': Heart,          // Heart for keeping OSS alive with love
    'the builder': Hammer,            // Hammer for shipping/building products
    'the contributor': GitPullRequest, // Git PR for collaboration/contributions
    'the craftsperson': Code,         // Code for quality-focused coding
    'the hidden gem': Gem,            // Gem for hidden talent/diamond in rough

    // ● COMMON (Top 50%)
    'the tinkerer': Wrench,           // Wrench for practical tinkering/fixing
    'the grinder': TrendingUp,        // TrendingUp for high activity/momentum
    'the hobbyist': Coffee,           // Coffee for passion/side projects
    'the explorer': Compass,          // Compass for exploring many directions
    'the apprentice': Zap,            // Zap for energy/learning/beginners

    // 👻 GHOST (Insufficient data)
    'the ghost': Ghost,               // Ghost for profiles with no public code
  }


  const normalizedLabel = label?.toLowerCase().trim().replace(/^the\s+/, '');
  const Icon = ArchetypeMap[label?.toLowerCase().trim()] || ArchetypeMap['the ' + normalizedLabel] || ArchetypeMap[normalizedLabel] || Zap
  const color = rarityColors[rarity?.toUpperCase() || ''] || 'var(--brand-blue)'

  return <Icon size={size} color={color} />
}


const getRarityClass = (rarity: string) => {
  const r = rarity?.toUpperCase();
  if (r === 'LEGENDARY') return 'legendary';
  if (r === 'ULTRA RARE') return 'ultra-rare';
  if (r === 'RARE') return 'rare';
  if (r === 'UNCOMMON') return 'uncommon';
  return 'common';
}

// Map archetype labels to their rarity tiers (matches backend DeepSeek classification)
const getRarityFromLabel = (label: string): string => {
  const l = label?.toUpperCase() || '';
  // LEGENDARY tier - Amber #f59e0b
  if (l.includes('10X') || l.includes('PROFESSOR')) return 'LEGENDARY';
  // ULTRA RARE tier - Purple #a855f7
  if (l.includes('ARCHITECT')) return 'ULTRA RARE';
  // RARE tier - Blue #3b82f6
  if (l.includes('SPECIALIST') || l.includes('SYSTEMS THINKER')) return 'RARE';
  // UNCOMMON tier - Green #22c55e
  if (l.includes('MAINTAINER') || l.includes('BUILDER') || l.includes('CONTRIBUTOR') || l.includes('CRAFTSPERSON') || l.includes('HIDDEN GEM')) return 'UNCOMMON';
  // COMMON tier - Stone #78716c
  if (l.includes('TINKERER') || l.includes('GRINDER') || l.includes('HOBBYIST') || l.includes('EXPLORER') || l.includes('APPRENTICE')) return 'COMMON';
  return 'COMMON';
}

const getRarityColor = (rarity: string, label?: string) => {
  // ALWAYS derive from label first if we have one (most accurate)
  // This fixes issues where rarity might be "COMMON" but label is "TINKERER" (UNCOMMON)
  let r = label ? getRarityFromLabel(label) : rarity?.toUpperCase();
  if (!r || r === 'UNKNOWN' || r === 'UNDEFINED' || r === 'COMMON') {
    // Double-check with label fallback
    const fromLabel = getRarityFromLabel(label || '');
    if (fromLabel !== 'COMMON') r = fromLabel;
    else r = rarity?.toUpperCase() || 'COMMON';
  }
  if (r === 'LEGENDARY') return '#f59e0b';
  if (r === 'ULTRA RARE') return '#8b5cf6';
  if (r === 'RARE') return '#3b82f6';
  if (r === 'UNCOMMON') return '#10b981';
  return '#64748b';
}

const formatLastSeen = (dateString: string | null) => {
  if (!dateString) return null;
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? 'month' : 'months'} ago`;
};

const getLastSeenColor = (dateString: string | null) => {
  if (!dateString) return '#6b7280';
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 7) return '#16a34a'; // Green
  if (days <= 30) return '#ca8a04'; // Yellow
  return '#6b7280'; // Gray
};

const pluralizeArchetype = (name: string) => {
  if (!name) return name;
  // Strip "THE " prefix
  let cleaned = name.replace(/^THE\s+/i, '');
  const upper = cleaned.toUpperCase();
  if (upper.includes('CRAFTSPERSON')) return cleaned.replace(/CRAFTSPERSON/i, 'CRAFTSPEOPLE');
  if (upper.includes('HIDDEN GEM')) return cleaned.replace(/HIDDEN GEM/i, 'HIDDEN GEMS');
  if (upper.endsWith('S') || upper.endsWith('X')) return cleaned + 'ES';
  return cleaned + 'S';
}

const formatNumber = (num: number | string | undefined): string => {
  if (num === undefined || num === null) return '0';
  const n = typeof num === 'string' ? parseInt(num) : num;
  if (isNaN(n)) return '0';
  if (n < 1000) return n.toString();
  if (n < 1000000) return (Math.floor(n / 100) / 10).toString() + 'K';
  return (Math.floor(n / 100000) / 10).toString() + 'M';
};

const stripThe = (name: string) => {
  if (!name) return name;
  return name.replace(/^THE\s+/i, '');
}

const EmailTooltip = ({ email, handle, activeTooltip, setActiveTooltip }: {
  email: string | null | undefined,
  handle: string,
  activeTooltip: string | null,
  setActiveTooltip: (h: string | null) => void
}) => {
  if (!email) return null;

  return (
    <div
      style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      onMouseEnter={() => setActiveTooltip(handle)}
      onMouseLeave={() => setActiveTooltip(null)}
    >
      {/* Trigger icon for email removed as requested */}
      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)', opacity: 0.5 }} />
      {activeTooltip === handle && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          padding: '8px 12px',
          background: '#1f2937',
          color: 'white',
          borderRadius: '8px',
          fontSize: '10px',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          pointerEvents: 'auto'
        }}>
          <span style={{ fontWeight: 500 }}>{email}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(email);
              setActiveTooltip(null);
            }}
            style={{
              padding: '4px 10px',
              background: '#374151',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '9px',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.03em'
            }}
          >
            Copy
          </button>
          <div style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid #1f2937'
          }} />
        </div>
      )}
    </div>
  );
};

interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  tier: 'GUEST' | 'AUTHENTICATED' | 'PRO';
  githubLogin?: string;
  usageCount?: number;
}

interface UsageInfo {
  used: number;
  limit: number;
  tier: string;
  resetTime?: string;
}

interface ErrorToast {
  message: string;
  code?: string;
  action?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('analyze')
  const [manualUrl, setManualUrl] = useState('')
  const [tokens, setTokens] = useState({ github: '', deepseek: '', vibeToken: '' })
  const [history, setHistory] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [limitPaywallOpen, setLimitPaywallOpen] = useState(false)
  const [proFeaturePaywallOpen, setProFeaturePaywallOpen] = useState<string | null>(null) // Stores feature name or null
  const [expandedMerits, setExpandedMerits] = useState<number[]>([])
  const [showFullSummary, setShowFullSummary] = useState(false)
  const [showDetailedSummary, setShowDetailedSummary] = useState(false)
  const [showTechnicalSignal, setShowTechnicalSignal] = useState(false)
  const [showDetailedTechnical, setShowDetailedTechnical] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedSkills, setExpandedSkills] = useState<number[]>([])
  const [expandedSearchId, setExpandedSearchId] = useState<number | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)
  const [tierFilter, setTierFilter] = useState<string | null>(null)
  const [archetypeFilter, setArchetypeFilter] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showConcurrentModal, setShowConcurrentModal] = useState(false)
  const [autoChekk, setAutoChekk] = useState(false)
  const [showActivityFeed, setShowActivityFeed] = useState(false)
  const [showChecklistForm, setShowChecklistForm] = useState(false)
  const [showBulkChekkForm, setShowBulkChekkForm] = useState(false)
  const [bulkChekkTab, setBulkChekkTab] = useState<'import' | 'history'>('import')
  const [bulkHistory, setBulkHistory] = useState<any[]>([])
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, status: '' })
  const [bulkResults, setBulkResults] = useState<any[]>([])
  const [enriching, setEnriching] = useState(false)
  const [enrichmentStatus, setEnrichmentStatus] = useState<'idle' | 'success' | 'no_match' | 'error'>('idle')
  const [checklistTab, setChecklistTab] = useState<'configure' | 'active'>('configure')
  const [checklistForm, setChecklistForm] = useState({
    jobTitle: '',
    jd: '',
    experience: '',
    location: '',
    archetypes: [] as string[],
    languages: [] as string[],
    tiers: [] as string[],
    reachability: [] as string[],
    loading: false
  })
  const [activeSearches, setActiveSearches] = useState<any[]>([])
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [checklistFilters, setChecklistFilters] = useState<{ location: string; minScore: number }>({ location: '', minScore: 0 })
  const [autochekkLogs, setAutochekkLogs] = useState<any[]>([])
  const [pendingAnalyses, setPendingAnalyses] = useState<{ handle: string, name?: string, avatar: string, timestamp: number }[]>([])
  const [githubLinked, setGithubLinked] = useState(false)
  const [patchedStats, setPatchedStats] = useState<{ totalRepos?: number; totalCommits?: number; lastActive?: string; totalStars?: number; languages?: number; name?: string; languagesList?: string[] } | null>(null)

  useEffect(() => {
    // Fetch fresh GitHub stats from backend (which uses authenticated API - 5000 req/hour)
    // This repairs stale/missing stats for cached reports
    if (selectedReport && selectedReport.candidate?.githubHandle && selectedReport.candidate.githubHandle !== 'Guest') {
      const handle = selectedReport.candidate.githubHandle;

      fetch(`${BACKEND_URL}/api/github/stats/${encodeURIComponent(handle)}`)
        .then(r => r.ok ? r.json() : null)
        .then(response => {
          if (!response?.success || !response?.data) {
            console.log('[GitHub Stats] Backend fetch failed, using stored data only');
            return;
          }

          const stats = response.data;
          console.log('[GitHub Stats] Fetched from backend:', stats);

          const updates: any = {
            name: stats.name,
            totalRepos: stats.public_repos,
            totalStars: stats.totalStars,
            totalCommits: stats.totalCommits,
            languages: stats.languages,
            languagesList: stats.languagesList || [],
            lastActive: stats.lastActive
          };

          // Extract LinkedIn from GitHub Profile (blog or bio fields)
          let linkedinFromGithub: string | null = null;
          const linkedinRegex = /linkedin\.com\/in\/[\w\-]+/i;
          if (stats.blog && linkedinRegex.test(stats.blog)) {
            linkedinFromGithub = stats.blog.startsWith('http') ? stats.blog : `https://${stats.blog}`;
          } else if (stats.bio && linkedinRegex.test(stats.bio)) {
            const match = stats.bio.match(linkedinRegex);
            if (match) {
              linkedinFromGithub = `https://${match[0]}`;
            }
          }

          // Update selectedReport with LinkedIn if found
          if (linkedinFromGithub) {
            setSelectedReport((prev: any) => {
              if (!prev || prev.candidate?.linkedinUrl) return prev;
              return {
                ...prev,
                candidate: {
                  ...prev.candidate,
                  linkedinUrl: linkedinFromGithub
                }
              };
            });
          }

          // Update history with real name and LinkedIn
          if (updates.name || linkedinFromGithub) {
            setHistory((prev: any[]) => prev.map((item: any) => {
              const itemHandle = item.candidate?.githubHandle || item.githubHandle;
              if (itemHandle?.toLowerCase() === handle.toLowerCase()) {
                return {
                  ...item,
                  candidate: {
                    ...item.candidate,
                    name: updates.name || item.candidate?.name,
                    linkedinUrl: linkedinFromGithub || item.candidate?.linkedinUrl
                  },
                  metadata: {
                    ...item.metadata,
                    userStats: {
                      ...item.metadata?.userStats,
                      name: updates.name || item.metadata?.userStats?.name
                    }
                  }
                };
              }
              return item;
            }));
          }

          setPatchedStats(updates);
        })
        .catch(err => console.error('[GitHub Stats] Error:', err));
    } else {
      setPatchedStats(null);
    }
  }, [selectedReport]);
  const [githubUsername, setGithubUsername] = useState<string | null>(null)
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null)
  const [errorToast, setErrorToast] = useState<ErrorToast | null>(null)
  const [referralInfo, setReferralInfo] = useState<{
    referralCode: string | null;
    referralLink: string | null;
    activeReferrals: number;
    progressToReward: { current: number; target: number; rewardDescription: string };
  } | null>(null)
  const activeTabRef = useRef(activeTab)



  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  // Persist AutoChekk state & logs
  useEffect(() => {
    chrome.storage.local.get(['auto_chekk_enabled', 'autochekk_logs', 'active_searches'], (res) => {
      if (res.auto_chekk_enabled !== undefined) {
        setAutoChekk(!!res.auto_chekk_enabled)
      }
      if (res.autochekk_logs) {
        setAutochekkLogs(res.autochekk_logs as any[])
      }
      if (res.active_searches) {
        // Mark any 'running' searches as 'interrupted' since connection was lost on reload
        const searches = (res.active_searches as any[]).map((s: any) =>
          s.status === 'running'
            ? { ...s, status: 'interrupted', error: 'Search interrupted - extension was reloaded' }
            : s
        );
        setActiveSearches(searches);
      }
      if (res.bulk_history) {
        setBulkHistory(res.bulk_history as any[])
      }
    })

    const listener = (changes: any) => {
      if (changes.autochekk_logs) {
        const logs = changes.autochekk_logs.newValue || [];
        setAutochekkLogs(logs);

        // Get handles that have completed (success or failure) - these have analysis entries WITHOUT analyzing flag
        const completedHandles = new Set(
          logs
            .filter((l: any) => l.type === 'analysis' && !l.data?.analyzing)
            .map((l: any) => l.data?.githubHandle?.toLowerCase())
        );

        // Track analyzing entries for History skeleton cards, excluding completed ones
        const analyzing = logs
          .filter((l: any) => l.type === 'analysis' && l.data?.analyzing)
          .filter((l: any) => !completedHandles.has(l.data?.githubHandle?.toLowerCase()))
          .filter((l: any) => {
            // Filter out stale analyses (> 3 minutes old) to prevent stuck loading states
            const age = Date.now() - (l.timestamp || 0);
            return age < 3 * 60 * 1000;
          })
          .map((l: any) => ({
            handle: l.data?.githubHandle,
            name: l.data?.name,
            avatar: '',
            timestamp: l.timestamp
          }));
        setPendingAnalyses(analyzing);
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, [])

  useEffect(() => {
    // Only allow AutoChekk for PRO users
    // Wait until we've finished loading auth to enforce this
    if (authLoading) return;

    const isPro = user?.tier === 'PRO';
    const shouldBeEnabled = autoChekk && isPro;
    chrome.storage.local.set({ auto_chekk_enabled: shouldBeEnabled });

    // If user is not PRO but autoChekk is true, turn it off
    if (autoChekk && !isPro) {
      setAutoChekk(false);
    }
  }, [autoChekk, user?.tier, authLoading])

  const handleOpenReport = (report: any) => {
    setSelectedReport(report)
    setShowFullSummary(false)
    setShowDetailedSummary(false)
    setShowTechnicalSignal(false)
    setShowDetailedTechnical(false)
    setExpandedSkills([])
    setExpandedMerits([])
  }

  useEffect(() => {
    chrome.storage.local.get(['github_token', 'deepseek_key', 'vibe_token', 'user_data', 'auth_token', 'bulk_history'], (res) => {
      setTokens({
        github: (res.github_token as string) || '',
        deepseek: (res.deepseek_key as string) || '',
        vibeToken: (res.vibe_token as string) || ''
      })
      // Load bulk history from storage
      if (res.bulk_history && Array.isArray(res.bulk_history)) {
        setBulkHistory(res.bulk_history)
      }
      const userData = res.user_data as User | undefined;
      if (userData) {
        setUser(userData)
        // Initialize usage info based on tier
        const tierLimits: Record<string, number> = { GUEST: 2, AUTHENTICATED: 3, PRO: Infinity };
        setUsageInfo({
          used: userData.usageCount || 0,
          limit: tierLimits[userData.tier] || 2,
          tier: userData.tier,
          resetTime: userData.tier === 'PRO' ? 'monthly' : 'hourly'
        });
      } else {
        setUser(null)
        // Guest user - start with 2 free chekks (we'll update this after first request)
        setUsageInfo({
          used: 0,
          limit: 2,
          tier: 'GUEST',
          resetTime: undefined
        });
      }
      // Check if GitHub has been linked (auth_token is set by GitHub OAuth flow)
      // Check if GitHub has been linked (auth_token exists OR user data has github login)
      if (res.auth_token || userData?.githubLogin) {
        setGithubLinked(true)
      }
      // Get GitHub username - ONLY use actual GitHub login, not Google name
      if (userData?.githubLogin) {
        setGithubUsername(userData.githubLogin) // Actual GitHub handle
      } else if (userData?.email?.endsWith('@github.no-email')) {
        // Extract username from generated email like "username@github.no-email"
        setGithubUsername(userData.email.replace('@github.no-email', ''))
      } else if (res.auth_token) {
        // GitHub token exists but no username stored - try to extract from somewhere
        // This fallback shouldn't happen, but just in case
        setGithubUsername(null)
      }
      // NOTE: Don't use userData.name as GitHub username - that's Google name!
      setAuthLoading(false)
    })

    // Listen for storage changes (e.g., when GitHub auth completes in another tab)
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      // If auth token changes (login/re-login), verify user data
      if (changes.auth_token && changes.auth_token.newValue) {
        setGithubLinked(true)
        // Also fetch user data to ensure username is set (in case user_data didn't change)
        chrome.storage.local.get(['user_data'], (res) => {
          const userData = res.user_data as User | undefined;
          if (userData?.githubLogin) {
            setGithubUsername(userData.githubLogin)
          }
        })
      }

      if (changes.user_data && changes.user_data.newValue) {
        const userData = changes.user_data.newValue as User | undefined;
        setUser(userData || null)
        // Update GitHub username when user_data changes
        if (userData?.githubLogin) {
          setGithubUsername(userData.githubLogin)
          setGithubLinked(true) // Ensure linked state is true if we have a handle
        }
      }
    }
    chrome.storage.onChanged.addListener(storageListener)

    if (activeTab === 'history') fetchHistory()
    if (activeTab === 'analytics') fetchAnalytics()

    return () => {
      chrome.storage.onChanged.removeListener(storageListener)
    }
  }, [activeTab, tierFilter])

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/history`)
      const data = await res.json()
      if (data.success) setHistory(data.data)
    } catch (e) {
      console.warn('Backend not reachable')
    }
  }

  // Enrich a candidate with Apollo.io data (LinkedIn, company, etc.)
  const enrichCandidate = async (candidateId: string, email?: string, name?: string) => {
    if (!user || user.tier !== 'PRO') {
      setProFeaturePaywallOpen('Candidate Enrichment');
      return;
    }

    console.log('[Enrich] Starting enrichment for:', { candidateId, email, name });
    setEnriching(true);
    setEnrichmentStatus('idle');

    try {
      const response = await fetch(`${BACKEND_URL}/api/enrich/candidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.vibeToken}`
        },
        body: JSON.stringify({ candidateId, email, name })
      });

      const data = await response.json();
      console.log('[Enrich] API response:', data);

      if (data.success && data.data) {
        console.log('[Enrich] Success! Updating UI with:', data.data);
        // Update the selected report with enrichment data
        setSelectedReport((prev: any) => ({
          ...prev,
          candidate: {
            ...prev.candidate,
            linkedinUrl: data.data.linkedinUrl,
            currentTitle: data.data.currentTitle || data.data.currentRole,
            currentCompany: data.data.currentCompany,
            companyLogoUrl: data.data.companyLogo,
            seniority: data.data.seniority,
            twitterUrl: data.data.socialLinks?.twitter,
            location: data.data.location || prev.candidate?.location
          }
        }));
        setEnrichmentStatus('success');
        // Refresh history to persist
        fetchHistory();
        // Auto-open LinkedIn profile in new tab
        if (data.data.linkedinUrl) {
          window.open(data.data.linkedinUrl, '_blank');
        }
      } else if (data.code === 'NO_MATCH' || data.code === 'NO_EMAIL' || data.error?.includes('No enrichment') || data.error?.includes('No matching')) {
        console.log('[Enrich] No match found:', data.error || data.code);
        setEnrichmentStatus('no_match');
      } else if (data.code === 'PRO_REQUIRED') {
        setProFeaturePaywallOpen('Candidate Enrichment');
      } else {
        console.log('[Enrich] Unknown response:', data);
        setEnrichmentStatus('error');
      }
    } catch (e) {
      console.error('[Enrich] Failed:', e);
      setEnrichmentStatus('error');
    } finally {
      setEnriching(false);
      // Reset status after 5 seconds
      setTimeout(() => setEnrichmentStatus('idle'), 5000);
    }
  }

  const fetchAnalytics = async () => {
    try {
      const url = tierFilter
        ? `${BACKEND_URL}/api/analytics?tier=${encodeURIComponent(tierFilter)}`
        : `${BACKEND_URL}/api/analytics`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) setAnalytics(data.data)
    } catch (e) {
      console.warn('Analytics failed')
    } finally {
      setAnalyticsLoading(false)
    }
  }

  // Fetch usage info from backend
  const fetchUsage = async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (tokens.vibeToken) {
        headers['Authorization'] = `Bearer ${tokens.vibeToken}`
      }
      const res = await fetch(`${BACKEND_URL}/api/usage`, { headers })
      const data = await res.json()
      if (data.success) {
        setUsageInfo({
          used: data.used,
          limit: data.limit,
          tier: data.tier,
          resetTime: data.resetTime
        })
      }
    } catch (e) {
      console.warn('Usage fetch failed, using defaults')
    }
  }

  // Fetch usage on mount and when tokens change
  useEffect(() => {
    fetchUsage()
  }, [tokens.vibeToken])

  // Fetch referral info (only for authenticated users)
  const fetchReferralInfo = async () => {
    if (!tokens.vibeToken) return
    try {
      const res = await fetch(`${BACKEND_URL}/api/referral/info`, {
        headers: { 'Authorization': `Bearer ${tokens.vibeToken}` }
      })
      const data = await res.json()
      if (data.success) {
        setReferralInfo({
          referralCode: data.referralCode,
          referralLink: data.referralLink,
          activeReferrals: data.activeReferrals,
          progressToReward: data.progressToReward
        })
      }
    } catch (e) {
      console.warn('Referral info fetch failed')
    }
  }

  // Fetch referral info when invite modal opens
  useEffect(() => {
    if (showInviteModal && tokens.vibeToken) {
      fetchReferralInfo()
    }
  }, [showInviteModal, tokens.vibeToken])

  // ===== BULKCHEKK FUNCTIONS =====

  // Parse CSV file and extract GitHub handles/emails
  const parseUploadedFile = async (file: File): Promise<{ handles: string[], emails: string[] }> => {
    return new Promise((resolve, reject) => {
      // Use PapaParse for robust CSV parsing (handles quotes, commas, etc.)
      Papa.parse(file, {
        header: false, // We'll detect headers manually to be safer
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const rows = results.data as string[][];
            if (!rows || rows.length === 0) {
              resolve({ handles: [], emails: [] });
              return;
            }

            let dataRows = rows;
            let targetColIndex = 0;

            // Expanded heuristic to detect if first row is a header
            // Covers common recruiter spreadsheet column names
            const firstRow = rows[0].map(c => c.toLowerCase().trim());
            const potentialHeaderIndex = firstRow.findIndex(c =>
              c.includes('username') || c.includes('handle') || c.includes('github') ||
              c.includes('user') || c.includes('email') || c.includes('url') ||
              c.includes('candidate') || c.includes('developer') || c.includes('applicant') ||
              c.includes('profile') || c.includes('link') || c.includes('contact') ||
              c.includes('name') || c.includes('person') || c.includes('engineer')
            );

            if (potentialHeaderIndex >= 0) {
              // Header found
              targetColIndex = potentialHeaderIndex;
              dataRows = rows.slice(1); // Skip header
            }

            // Extract values
            const rawValues: string[] = [];
            for (const row of dataRows) {
              if (row[targetColIndex]) {
                rawValues.push(row[targetColIndex]);
              }
            }

            // Process values (separate emails vs handles)
            const emails: string[] = [];
            const directHandles: string[] = [];

            for (const item of rawValues) {
              if (isEmail(item)) {
                emails.push(item.trim());
              } else {
                const handle = extractGithubHandle(item);
                if (handle) directHandles.push(handle);
              }
            }

            // Deduplicate
            resolve({
              handles: [...new Set(directHandles)],
              emails: [...new Set(emails)]
            });

          } catch (err) {
            reject(err);
          }
        },
        error: (err: any) => {
          reject(err);
        }
      });
    });
  }

  // Extract GitHub handle from various formats (URL, @username, plain username)
  // Returns null for emails - those need backend lookup
  const extractGithubHandle = (input: string): string | null => {
    if (!input) return null
    input = input.trim()

    // GitHub URL: https://github.com/username or github.com/username
    const urlMatch = input.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9][-a-zA-Z0-9]*)(?:\/|$)/i)
    if (urlMatch) return urlMatch[1]

    // @username format
    if (input.startsWith('@')) return input.slice(1)

    // Plain username (validate it looks like a valid GitHub username - NOT an email)
    if (!input.includes('@') && /^[a-zA-Z0-9][-a-zA-Z0-9]*$/.test(input) && input.length <= 39) {
      return input
    }

    return null
  }

  // Check if input looks like an email
  const isEmail = (input: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())
  }

  // Lookup GitHub username from email via backend API
  const lookupEmailToHandle = async (email: string): Promise<string | null> => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tokens.vibeToken) {
        headers['Authorization'] = `Bearer ${tokens.vibeToken}`;
      }
      const response = await fetch(`${BACKEND_URL}/api/lookup/email`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email })
      })
      const data = await response.json()
      return data.success ? data.username : null
    } catch {
      return null
    }
  }

  // Process bulk analysis
  const processBulkAnalysis = async () => {
    if (!bulkFile) return

    setBulkProcessing(true)
    setBulkResults([])
    setBulkProgress({ current: 0, total: 0, status: 'Parsing file...' })

    try {
      const parsed = await parseUploadedFile(bulkFile)

      // Phase 1: Resolve emails to GitHub handles via backend API
      setBulkProgress({ current: 0, total: parsed.emails.length, status: `Looking up ${parsed.emails.length} email(s)...` })

      const emailResolvedHandles: string[] = []

      // Process emails in parallel chunks to prevent hanging
      const chunkSize = 5;
      for (let i = 0; i < parsed.emails.length; i += chunkSize) {
        const chunk = parsed.emails.slice(i, i + chunkSize);

        // Update status for user feedback
        setBulkProgress({
          current: i,
          total: parsed.emails.length,
          status: `Looking up emails ${i + 1}-${Math.min(i + chunkSize, parsed.emails.length)} of ${parsed.emails.length}...`
        });

        // Use Promise.all to look up 5 emails at once
        const chunkResults = await Promise.all(chunk.map(async (email) => {
          try {
            // Add a timeout race to prevent indefinite hanging
            const timeoutPromise = new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 8000)
            );

            // Race the lookup against the timeout
            const handle = await Promise.race([
              lookupEmailToHandle(email),
              timeoutPromise
            ]) as string | null;

            return handle;
          } catch (e) {
            console.warn(`Lookup failed/timed out for ${email}`, e);
            return null;
          }
        }));

        // Add found handles
        chunkResults.forEach(handle => {
          if (handle) emailResolvedHandles.push(handle);
        });

        // Small delay to be nice to the API
        await new Promise(r => setTimeout(r, 500));
      }

      // Combine all handles
      const allHandles = [...parsed.handles, ...emailResolvedHandles].slice(0, 100)

      if (allHandles.length === 0) {
        setBulkProgress({ current: 0, total: 0, status: 'No valid GitHub profiles found in file' })
        setBulkProcessing(false)
        return
      }

      setBulkProgress({ current: 0, total: allHandles.length, status: `Found ${allHandles.length} profiles to analyze` })

      const results: any[] = []
      const batchId = Date.now().toString()

      for (let i = 0; i < allHandles.length; i++) {
        const handle = allHandles[i]
        setBulkProgress({
          current: i + 1,
          total: allHandles.length,
          status: `Analyzing ${handle} (${i + 1}/${allHandles.length})`
        })

        try {
          const response = await fetch(`${BACKEND_URL}/api/analyze`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': tokens.vibeToken ? `Bearer ${tokens.vibeToken}` : ''
            },
            body: JSON.stringify({
              githubUrl: `https://github.com/${handle}`,
              userId: user?.id || 'guest'
            })
          })

          const data = await response.json()

          if (data.success && data.data) {
            results.push({
              handle,
              success: true,
              report: data.data,
              timestamp: Date.now()
            })
          } else {
            results.push({
              handle,
              success: false,
              error: data.error || 'Analysis failed',
              timestamp: Date.now()
            })
          }
        } catch (err: any) {
          results.push({
            handle,
            success: false,
            error: err.message || 'Network error',
            timestamp: Date.now()
          })
        }

        // Update results in real-time
        setBulkResults([...results])

        // Rate limiting - wait 1.5 seconds between requests
        if (i < allHandles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500))
        }
      }

      // Save batch to history
      const successCount = results.filter(r => r.success).length
      const batchRecord = {
        id: batchId,
        filename: bulkFile.name,
        totalProfiles: allHandles.length,
        successCount,
        failedCount: allHandles.length - successCount,
        results,
        timestamp: Date.now()
      }

      const updatedHistory = [batchRecord, ...bulkHistory]
      setBulkHistory(updatedHistory)

      // Save to storage
      chrome.storage.local.set({ bulk_history: updatedHistory })

      setBulkProgress({
        current: allHandles.length,
        total: allHandles.length,
        status: `Complete! ${successCount}/${allHandles.length} profiles analyzed successfully`
      })

      // Switch to history tab to show results
      setTimeout(() => {
        setBulkChekkTab('history')
      }, 2000)

    } catch (err: any) {
      setBulkProgress({ current: 0, total: 0, status: `Error: ${err.message}` })
    } finally {
      setBulkProcessing(false)
      setBulkFile(null)
    }
  }

  // Auto-refresh history when a new analysis completes (detected via logs)
  useEffect(() => {
    if (activeTab === 'history' && autochekkLogs.length > 0) {
      const latest = autochekkLogs[0];
      // If the latest log is a completed analysis (not analyzing), refresh the list
      if (latest.type === 'analysis' && !latest.data?.analyzing) {
        fetchHistory();
      }
    }
  }, [autochekkLogs, activeTab])

  const [pendingHandles, setPendingHandles] = useState<string[]>([])
  const [emailTooltip, setEmailTooltip] = useState<string | null>(null) // tracks which email tooltip is open
  const [showClearDropdown, setShowClearDropdown] = useState(false)

  const handleManualSearch = async () => {
    if (!manualUrl) return

    // Limit concurrent for guests
    if (!user && pendingHandles.length >= 1) {
      setShowConcurrentModal(true)
      return
    }

    // 1. Normalize
    let normalized = manualUrl.trim().replace(/^@/, '');
    let ownerHandle = normalized;
    if (normalized.includes('github.com/')) {
      const match = normalized.match(/github\.com\/([^/]+)/i);
      if (match) ownerHandle = match[1];
    }
    ownerHandle = ownerHandle.replace(/^@/, '').split('/')[0];

    // 2. CHECK HISTORY (Prevent Duplicate Analysis)
    // If profile already exists in history, just open it instead of re-analyzing
    const existingReport = history.find((h: any) => {
      const hHandle = h.candidate?.githubHandle || h.githubHandle;
      return hHandle?.toLowerCase() === ownerHandle.toLowerCase();
    });

    if (existingReport) {
      handleOpenReport(existingReport);
      setManualUrl('');
      setActiveTab('history');
      return;
    }

    // 3. Prevent duplicate active processing
    if (pendingHandles.includes(ownerHandle)) {
      alert(`Analysis for ${ownerHandle} is already in progress.`);
      return;
    }

    const finalUrl = normalized.includes('github.com')
      ? (normalized.startsWith('http') ? normalized : `https://${normalized}`)
      : `https://github.com/${normalized}`;

    // 4. Queue the request & Start Simulation
    setPendingHandles(prev => [ownerHandle, ...prev]);
    setManualUrl('');
    setLoadingStep(1); // Restart visual feedback for this new item

    // Simulate progress steps (Purely visual for the "Run" button)
    // We clear these timeouts when this specific request finishes, but effectively
    // the UI will just show the step for the *latest* one, which is fine.
    setTimeout(() => setLoadingStep(2), 1500);
    setTimeout(() => setLoadingStep(3), 3500);
    setTimeout(() => setLoadingStep(4), 6000);
    setTimeout(() => setLoadingStep(5), 9000);
    setTimeout(() => setLoadingStep(6), 12500);
    setTimeout(() => setLoadingStep(7), 16000);

    chrome.runtime.sendMessage({
      type: 'START_VIBE_CHECK',
      url: finalUrl
    }, (response) => {
      // 5. Cleanup on completion
      setPendingHandles(prev => prev.filter(h => h !== ownerHandle));
      setLoadingStep(0);

      if (response && response.success) {
        const finalReport = {
          ...response.data,
          candidate: {
            ...response.data.candidate,
            githubHandle: response.data.candidate?.githubHandle === 'Guest' || !response.data.candidate?.githubHandle
              ? ownerHandle
              : response.data.candidate.githubHandle
          }
        };
        setHistory((prev: any[]) => [finalReport, ...prev])

        // Update usage info (increment used count)
        if (usageInfo) {
          setUsageInfo({ ...usageInfo, used: usageInfo.used + 1 });
        }

        // 6. Auto-open if still on search page
        if (activeTabRef.current === 'analyze') {
          handleOpenReport(finalReport)
        }
      } else {
        const err = response?.error || 'Unknown error';
        const code = response?.code || '';

        // Handle different error types with user-friendly messages
        if (code === 'GUEST_LIMIT_REACHED' || code === 'USAGE_LIMIT_REACHED' || err.includes('Limit reached') || err.includes('Upgrade to Pro')) {
          setLimitPaywallOpen(true);
          // Update usage info if provided
          if (response?.used !== undefined && response?.limit !== undefined) {
            setUsageInfo({
              used: response.used,
              limit: response.limit,
              tier: response.tier || (user?.tier || 'GUEST'),
              resetTime: response.resetTime
            });
          }
        } else if (code === 'SESSION_EXPIRED' || code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN') {
          setErrorToast({
            message: 'Session expired',
            code: code,
            action: 'Please sign in again to continue.'
          });
          // Auto-dismiss after 5 seconds
          setTimeout(() => setErrorToast(null), 5000);
        } else if (err.includes('Too many requests')) {
          setErrorToast({
            message: 'Slow down!',
            code: 'RATE_LIMITED',
            action: 'Please wait a moment before trying again.'
          });
          setTimeout(() => setErrorToast(null), 5000);
        } else {
          setErrorToast({
            message: `Could not analyze ${ownerHandle}`,
            action: err
          });
          setTimeout(() => setErrorToast(null), 5000);
        }
      }
    })
  }

  // Helper to trigger analysis directly with a handle (for Chekklist CHEKK buttons)
  const triggerAnalysis = (handle: string) => {
    const url = `https://github.com/${handle}`;

    // Check limits without switching tabs
    if (!user && pendingHandles.length >= 1) {
      setShowConcurrentModal(true);
      return;
    }

    if (pendingHandles.includes(handle)) {
      return;
    }

    setPendingHandles(prev => [handle, ...prev]);

    chrome.runtime.sendMessage({
      type: 'START_VIBE_CHECK',
      url: url
    }, (response) => {
      setPendingHandles(prev => prev.filter(h => h !== handle));

      if (response && response.success) {
        const finalReport = {
          ...response.data,
          candidate: {
            ...response.data.candidate,
            githubHandle: response.data.candidate?.githubHandle === 'Guest' || !response.data.candidate?.githubHandle
              ? handle
              : response.data.candidate.githubHandle
          }
        };
        setHistory((prev: any[]) => {
          // Prevent duplicate entries
          const exists = prev.some((h: any) => {
            const existingHandle = h.candidate?.githubHandle || h.githubHandle;
            return existingHandle?.toLowerCase() === handle.toLowerCase();
          });
          if (exists) return prev;
          return [finalReport, ...prev];
        });

        if (usageInfo) {
          setUsageInfo({ ...usageInfo, used: usageInfo.used + 1 });
        }
        // Don't auto-open report - stay on Chekklist
      } else {
        const err = response?.error || 'Unknown error';
        const code = response?.code || '';

        if (code === 'GUEST_LIMIT_REACHED' || code === 'USAGE_LIMIT_REACHED') {
          setLimitPaywallOpen(true);
        } else {
          setErrorToast({
            message: `Could not analyze ${handle}`,
            action: err
          });
          setTimeout(() => setErrorToast(null), 5000);
        }
      }
    });
  }

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true)
    try {
      // Get real Google OAuth token using Chrome Identity API
      const auth = await chrome.identity.getAuthToken({ interactive: true })

      if (!auth || !auth.token) {
        throw new Error('Failed to get authentication token')
      }

      const token = auth.token

      // Fetch user profile from Google
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!profileRes.ok) {
        throw new Error('Failed to fetch Google profile')
      }

      const profile = await profileRes.json()

      // Check for referral code from landing page cookie
      let referralCode = null;
      try {
        // Check local development domain first
        const cookie = await chrome.cookies.get({ url: 'https://vibechekk.dev', name: 'referral_code' });
        if (cookie) {
          referralCode = cookie.value;
          console.log('Applying referral code:', referralCode);
        }
      } catch (e) {
        console.log('No referral cookie found or permission denied');
      }

      // Send to backend for user creation/login
      const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          referralCode // Pass referral code if found
        })
      })

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`)
      }

      const data = await res.json()
      if (data.success) {
        chrome.storage.local.set({ vibe_token: data.token, user_data: data.user }, () => {
          setTokens({ ...tokens, vibeToken: data.token })
          setUser(data.user)
          setIsLoggingIn(false)
        })
      } else {
        alert(data.error || 'Google login failed')
        setIsLoggingIn(false)
      }
    } catch (e: any) {
      console.error('Auth error:', e)
      alert(`Authentication failed: ${e.message || 'Unknown error'}`)
      setIsLoggingIn(false)
    }
  }




  const logout = () => {
    chrome.storage.local.remove(['vibe_token', 'user_data'], () => {
      setTokens({ ...tokens, vibeToken: '' })
      setUser(null)
    })
  }

  // Handle Stripe checkout for Pro upgrade
  const handleUpgradeToPro = async () => {
    if (!tokens.vibeToken) {
      alert('Please sign in first to upgrade to Pro')
      return
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.vibeToken}`
        }
      })

      const data = await response.json()

      if (data.success && data.url) {
        // Open Stripe Checkout in new tab
        window.open(data.url, '_blank')
      } else {
        alert(data.error || 'Failed to start checkout')
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      alert('Failed to connect to payment service')
    }
  }

  const proFeaturesContent = (
    <>
      <div
        style={{
          width: '100%',
          borderRadius: '16px',
          marginBottom: '12px',
          position: 'relative',
          overflow: 'visible',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: (showActivityFeed) ? '0 4px 16px rgba(0, 0, 0, 0.12)' : '0 2px 8px rgba(0, 0, 0, 0.06)',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
          border: showActivityFeed ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent'
        }}
      >
        {/* Decorative background element for the whole card */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        {/* Card Header Part */}
        <div
          onClick={() => setShowActivityFeed(!showActivityFeed)}
          style={{
            width: '100%',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 1,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            flexShrink: 0,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Binoculars size={22} color="white" strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1px' }}>
              <span style={{
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'white'
              }}>
                AUTOCHEKK
              </span>
              <span style={{
                fontSize: '8px',
                fontWeight: 900,
                color: user?.tier === 'PRO' ? '#1a1a1a' : 'rgba(255, 255, 255, 0.9)',
                background: user?.tier === 'PRO'
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'rgba(255, 255, 255, 0.15)',
                padding: '2px 6px',
                borderRadius: '3px',
                letterSpacing: '0.02em',
                lineHeight: 1
              }}>
                PRO
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Chekk devs as you browse
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="autochekk-tooltip-wrapper">
                <Info
                  size={13}
                  color="rgba(255, 255, 255, 0.5)"
                  style={{ cursor: 'help', opacity: 0.7, transform: 'translateY(0.5px)' }}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="autochekk-tooltip" style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '0',
                  marginBottom: '8px',
                  background: 'white',
                  color: '#1a1a1a',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 500,
                  width: '200px',
                  textAlign: 'left',
                  lineHeight: 1.4,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  opacity: 0,
                  visibility: 'hidden',
                  transition: 'all 0.2s ease',
                  pointerEvents: 'none',
                  zIndex: 1000
                }}>
                  Automatically find and analyze Github profiles across all webpages you visit
                </div>
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowActivityFeed(!showActivityFeed); }}
                style={{
                  cursor: 'pointer',
                  opacity: showActivityFeed ? 0.9 : 0.4,
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  flexShrink: 0
                }}
                title={showActivityFeed ? "Hide Activity Feed" : "Show Activity Feed"}
              >
                <Radio size={13} color={(autoChekk && showActivityFeed) ? "#22c55e" : "white"} strokeWidth={2.5} />
              </div>
            </div>
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (user?.tier !== 'PRO') {
                setProFeaturePaywallOpen('AutoChekk');
                return;
              }
              setAutoChekk(!autoChekk);
            }}
            style={{
              width: '52px',
              height: '30px',
              borderRadius: '15px',
              background: autoChekk
                ? '#22c55e'
                : 'rgba(255,255,255,0.3)',
              position: 'relative',
              transition: 'all 0.3s ease',
              flexShrink: 0,
              cursor: 'pointer'
            }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '3px',
              left: autoChekk ? '25px' : '3px',
              transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </div>
        </div>

        {/* Autochekk Live Activity Feed Dropdown */}
        <div style={{
          maxHeight: showActivityFeed ? '800px' : '0',
          opacity: showActivityFeed ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
          background: 'rgba(255, 255, 255, 0.03)',
          borderTop: showActivityFeed ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
        }}>
          <div style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.5)',
                  margin: 0,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    display: 'inline-block',
                    boxShadow: '0 0 8px rgba(34, 197, 94, 0.4)',
                    animation: 'pulse 2s infinite'
                  }}></span>
                  ACTIVITY FEED
                </h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowActivityFeed(false); }}
                  title="Collapse Activity Feed"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.4)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ChevronRight size={14} style={{ transform: 'rotate(-90deg)' }} />
                </button>
                {autochekkLogs.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      chrome.storage.local.set({ autochekk_logs: [], dedup_cache: [] });
                      setAutochekkLogs([]);
                      setPendingAnalyses([]);
                      chrome.tabs.query({}, (tabs) => {
                        tabs.forEach(tab => {
                          if (tab.id) {
                            chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_SCANNED_CACHE' }).catch(() => { });
                          }
                        });
                      });
                    }}
                    title="Clear Activity Log"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <Trash size={12} />
                  </button>
                )}
              </div>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '160px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {autochekkLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px 0', color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px' }}>
                  Waiting for new profiles...
                </div>
              ) : (
                autochekkLogs.map((log) => (
                  <div key={log.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    fontSize: '11px'
                  }}>
                    {log.type === 'discovery' && (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Search size={10} color="var(--text-dim)" />
                      </div>
                    )}
                    {log.type === 'resolution' && (
                      log.data?.avatar ? (
                        <img src={log.data.avatar} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} />
                      ) : (
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={10} color="white" />
                        </div>
                      )
                    )}
                    {log.data?.analyzing && (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(124, 58, 237, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Clock size={10} color="#a78bfa" />
                      </div>
                    )}
                    {log.type === 'analysis' && !log.data?.analyzing && (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(124, 58, 237, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Zap size={10} color="#a78bfa" fill="#a78bfa" />
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px' }}>
                        {log.data?.analyzing
                          ? 'Analyzing...'
                          : log.type === 'analysis'
                            ? (log.data?.error
                              ? 'Analysis Failed'
                              : (log.data?.archetype ? `${log.data.archetype.replace(/^THE\s+/i, '')} DISCOVERED` : 'Analysis Complete'))
                            : log.type === 'resolution'
                              ? (log.data?.success === false ? 'GitHub Not Found' : 'GitHub Found')
                              : 'Email Detected'}
                      </span>
                      {log.type === 'discovery' && (
                        <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.data?.email || log.message}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CHEKKLIST Card */}
      <div style={{
        marginBottom: '12px',
        borderRadius: '16px',
        overflow: 'visible',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: showChecklistForm ? '0 4px 16px rgba(0, 0, 0, 0.12)' : '0 2px 8px rgba(0, 0, 0, 0.06)',
        background: 'linear-gradient(135deg, #450a0a 0%, #2a0505 100%)',
        border: showChecklistForm ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent',
        position: 'relative'
      }}>
        {/* Blob container with overflow hidden */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '16px',
          overflow: 'hidden',
          pointerEvents: 'none'
        }}>
          <div style={{
            position: 'absolute',
            right: '-125px',
            top: '-60px',
            width: '220px',
            height: '220px',
            borderRadius: '40px',
            transform: 'rotate(20deg)',
            background: 'rgba(255,255,255,0.05)',
            zIndex: 0
          }} />
        </div>

        <div
          onClick={() => {
            if (user?.tier !== 'PRO') {
              setProFeaturePaywallOpen('Chekklist');
              return;
            }
            setShowChecklistForm(!showChecklistForm);
          }}
          style={{
            width: '100%',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '16px 20px'
          }}
        >
          {/* Icon */}
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ClipboardList size={24} color="white" strokeWidth={2.5} />
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'white'
              }}>
                CHEKKLIST
              </span>
              <span style={{
                fontSize: '8px',
                fontWeight: 900,
                color: user?.tier === 'PRO' ? '#1a1a1a' : 'rgba(255, 255, 255, 0.9)',
                background: user?.tier === 'PRO'
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'rgba(255, 255, 255, 0.15)',
                padding: '2px 6px',
                borderRadius: '3px',
                letterSpacing: '0.02em',
                lineHeight: 1
              }}>
                PRO
              </span>
            </div>
            <span style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: 500
            }}>
              Find 50 devs for your JD
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="chekklist-tooltip-wrapper">
                <Info
                  size={13}
                  color="rgba(255, 255, 255, 0.5)"
                  style={{ cursor: 'help' }}
                />
                <div className="chekklist-tooltip" style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '0',
                  marginBottom: '8px',
                  background: 'white',
                  color: '#1a1a1a',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 500,
                  width: '200px',
                  textAlign: 'left',
                  lineHeight: 1.4,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  opacity: 0,
                  visibility: 'hidden',
                  transition: 'all 0.2s ease',
                  zIndex: 1000,
                  pointerEvents: 'none'
                }}>
                  Paste your job description and get 50 matched GitHub profiles
                </div>
              </div>
              {/* Search toggle icon */}
              <div
                onClick={(e) => { e.stopPropagation(); setShowChecklistForm(!showChecklistForm); }}
                style={{
                  cursor: 'pointer',
                  opacity: (showChecklistForm || activeSearches.length > 0) ? 1 : 0.5,
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  flexShrink: 0
                }}
                title={showChecklistForm ? "Hide Search Form" : "Open Search Form"}
              >
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: activeSearches.length > 0 ? '#22c55e' : (showChecklistForm ? '#f59e0b' : 'transparent'),
                  border: `1.5px solid ${activeSearches.length > 0 ? '#22c55e' : (showChecklistForm ? '#f59e0b' : 'rgba(255, 255, 255, 0.6)')}`,
                  transition: 'all 0.2s ease',
                  boxShadow: activeSearches.length > 0 ? '0 0 8px rgba(34, 197, 94, 0.6)' : (showChecklistForm ? '0 0 8px rgba(245, 158, 11, 0.6)' : 'none')
                }} />
              </div>
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight
            size={18}
            color="rgba(255, 255, 255, 0.5)"
            style={{
              flexShrink: 0,
              transform: showChecklistForm ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer'
            }}
          />
        </div>


        {/* Chekklist Form Dropdown */}
        <div style={{
          maxHeight: showChecklistForm ? '560px' : '0',
          opacity: showChecklistForm ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
          background: 'rgba(255, 255, 255, 0.03)',
          borderTop: showChecklistForm ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header - Fixed */}
          <div style={{ padding: '20px 20px 10px 20px', flexShrink: 0 }}>
            {/* Tabs Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{
                display: 'flex',
                gap: '0',
                background: 'rgba(255,255,255,0.08)',
                padding: '3px',
                borderRadius: '8px',
                position: 'relative'
              }}>
                {/* Sliding background */}
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  bottom: '3px',
                  left: checklistTab === 'configure' ? '3px' : 'calc(50% + 1px)',
                  width: 'calc(50% - 4px)',
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 0
                }} />
                <button
                  onClick={() => setChecklistTab('configure')}
                  style={{
                    padding: '6px 16px',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.02em',
                    position: 'relative',
                    zIndex: 1,
                    flex: 1
                  }}
                >
                  CONFIGURE
                </button>
                <button
                  onClick={() => setChecklistTab('active')}
                  style={{
                    padding: '6px 16px',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.02em',
                    position: 'relative',
                    zIndex: 1,
                    flex: 1
                  }}
                >
                  ACTIVE
                </button>
              </div>
              <X size={14} color="rgba(255,255,255,0.4)" style={{ cursor: 'pointer' }} onClick={() => setShowChecklistForm(false)} />
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="custom-scrollbar" style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 20px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>


            {checklistTab === 'configure' ? (
              <>
                {/* Job Title */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px', letterSpacing: '0.04em' }}>
                    JOB TITLE
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Frontend Engineer"
                    value={checklistForm.jobTitle}
                    onChange={(e) => setChecklistForm({ ...checklistForm, jobTitle: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '11px',
                      fontFamily: 'inherit',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'white',
                      marginBottom: '10px'
                    }}
                  />
                </div>

                {/* Job Description */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px', letterSpacing: '0.04em' }}>
                    JOB DESCRIPTION
                  </label>
                  <textarea
                    placeholder="Paste your job description here..."
                    value={checklistForm.jd}
                    onChange={(e) => setChecklistForm({ ...checklistForm, jd: e.target.value })}
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '11px',
                      fontFamily: 'inherit',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'white'
                    }}
                  />
                  <label
                    className="upload-btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '8px',
                      padding: '8px 14px',
                      borderRadius: '20px',
                      border: '1.5px dashed #d1d5db',
                      background: 'white',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#6b7280',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      width: 'fit-content'
                    }}
                  >
                    <Upload size={12} />
                    Upload PDF or TXT
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          let text = '';
                          if (file.type === 'application/pdf') {
                            const arrayBuffer = await file.arrayBuffer();
                            text = await extractTextFromPDF(arrayBuffer);
                          } else {
                            text = await file.text();
                          }
                          setChecklistForm(prev => ({ ...prev, jd: text }));
                        } catch (err) {
                          console.error('File parsing error:', err);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Years of Experience */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Years of Experience
                  </label>
                  <select
                    value={checklistForm.experience}
                    onChange={(e) => setChecklistForm({ ...checklistForm, experience: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '11px',
                      fontFamily: 'inherit',
                      background: 'var(--bg-gray)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Any experience</option>
                    <option value="0-2">0-2 years</option>
                    <option value="2-5">2-5 years</option>
                    <option value="5-10">5-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>

                {/* Languages */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Languages / Skills
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {['Python', 'TypeScript', 'JavaScript', 'Go', 'Rust', 'Java', 'C++', 'Ruby'].map(lang => (
                      <button
                        key={lang}
                        onClick={() => {
                          const langs = checklistForm.languages.includes(lang)
                            ? checklistForm.languages.filter(l => l !== lang)
                            : [...checklistForm.languages, lang];
                          setChecklistForm({ ...checklistForm, languages: langs });
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 600,
                          border: checklistForm.languages.includes(lang) ? '1px solid #7c3aed' : '1px solid var(--border)',
                          background: checklistForm.languages.includes(lang) ? 'rgba(124, 58, 237, 0.1)' : 'white',
                          color: checklistForm.languages.includes(lang) ? '#7c3aed' : 'var(--text-dim)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. San Francisco, USA or Remote"
                    value={checklistForm.location}
                    onChange={(e) => setChecklistForm({ ...checklistForm, location: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '11px',
                      fontFamily: 'inherit',
                      background: 'white',
                      color: 'var(--text-main)'
                    }}
                  />
                </div>

                {/* Archetypes - All 15 from deepseek.ts */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Preferred Archetypes
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      // LEGENDARY - Amber #f59e0b
                      { name: 'THE 10X ENGINEER', color: '#f59e0b' },
                      { name: 'THE PROFESSOR', color: '#f59e0b' },
                      // ULTRA RARE - Purple #a855f7
                      { name: 'THE ARCHITECT', color: '#a855f7' },
                      // RARE - Blue #3b82f6
                      { name: 'THE SPECIALIST', color: '#3b82f6' },
                      { name: 'THE SYSTEMS THINKER', color: '#3b82f6' },
                      { name: 'THE MAINTAINER', color: '#3b82f6' },
                      // UNCOMMON - Green #22c55e
                      { name: 'THE BUILDER', color: '#22c55e' },
                      { name: 'THE CONTRIBUTOR', color: '#22c55e' },
                      { name: 'THE CRAFTSPERSON', color: '#22c55e' },
                      { name: 'THE HIDDEN GEM', color: '#22c55e' },
                      { name: 'THE TINKERER', color: '#22c55e' },
                      // COMMON - Stone #78716c
                      { name: 'THE GRINDER', color: '#78716c' },
                      { name: 'THE HOBBYIST', color: '#78716c' },
                      { name: 'THE EXPLORER', color: '#78716c' },
                      { name: 'THE APPRENTICE', color: '#78716c' }
                    ].map(arch => {
                      const isSelected = checklistForm.archetypes.includes(arch.name);
                      return (
                        <button
                          key={arch.name}
                          onClick={() => {
                            const archs = isSelected
                              ? checklistForm.archetypes.filter(a => a !== arch.name)
                              : [...checklistForm.archetypes, arch.name];
                            setChecklistForm({ ...checklistForm, archetypes: archs });
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '9px',
                            fontWeight: 600,
                            border: `1px solid ${arch.color}`,
                            background: isSelected ? arch.color : 'white',
                            color: isSelected ? 'white' : arch.color,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {arch.name.replace('THE ', '')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tiers - 5 tiers from deepseek.ts */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Tier Filter
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      { name: 'LEGENDARY', badge: '🌟🌟🌟', color: '#f59e0b' },
                      { name: 'ULTRA RARE', badge: '🌟🌟', color: '#a855f7' },
                      { name: 'RARE', badge: '⭐', color: '#3b82f6' },
                      { name: 'UNCOMMON', badge: '◆', color: '#22c55e' },
                      { name: 'COMMON', badge: '●', color: '#78716c' }
                    ].map(tier => {
                      const isSelected = checklistForm.tiers.includes(tier.name);
                      return (
                        <button
                          key={tier.name}
                          onClick={() => {
                            const tierArchetypes: Record<string, string[]> = {
                              'LEGENDARY': ['THE 10X ENGINEER', 'THE PROFESSOR'],
                              'ULTRA RARE': ['THE ARCHITECT'],
                              'RARE': ['THE SPECIALIST', 'THE SYSTEMS THINKER', 'THE MAINTAINER'],
                              'UNCOMMON': ['THE BUILDER', 'THE CONTRIBUTOR', 'THE CRAFTSPERSON', 'THE HIDDEN GEM', 'THE TINKERER'],
                              'COMMON': ['THE GRINDER', 'THE HOBBYIST', 'THE EXPLORER', 'THE APPRENTICE']
                            };

                            const associatedArchetypes = tierArchetypes[tier.name] || [];
                            let newTiers;
                            let newArchetypes;

                            if (isSelected) {
                              // Deselecting: Remove tier and its archetypes from selection
                              newTiers = checklistForm.tiers.filter(t => t !== tier.name);
                              newArchetypes = checklistForm.archetypes.filter(a => !associatedArchetypes.includes(a));
                            } else {
                              // Selecting: Add tier and its archetypes
                              newTiers = [...checklistForm.tiers, tier.name];
                              // Add associated archetypes without duplicates
                              const combined = new Set([...checklistForm.archetypes, ...associatedArchetypes]);
                              newArchetypes = Array.from(combined);
                            }

                            setChecklistForm({ ...checklistForm, tiers: newTiers, archetypes: newArchetypes });
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 600,
                            border: `1px solid ${tier.color}`,
                            background: isSelected ? tier.color : 'white',
                            color: isSelected ? 'white' : tier.color,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {tier.badge} {tier.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reachability */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Reachability
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      { name: 'HIGH', label: 'HIGH REACHABILITY', signal: '🟢', color: '#16a34a' },
                      { name: 'MEDIUM', label: 'MEDIUM REACHABILITY', signal: '🟡', color: '#ca8a04' },
                      { name: 'LOW', label: 'LOW REACHABILITY', signal: '🔴', color: '#dc2626' }
                    ].map(reach => {
                      const isSelected = checklistForm.reachability.includes(reach.label);
                      return (
                        <button
                          key={reach.name}
                          onClick={() => {
                            const newReach = isSelected
                              ? checklistForm.reachability.filter(r => r !== reach.label)
                              : [...checklistForm.reachability, reach.label];
                            setChecklistForm({ ...checklistForm, reachability: newReach });
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 600,
                            border: `1px solid ${reach.color}40`,
                            background: isSelected ? `${reach.color}15` : 'white',
                            color: isSelected ? reach.color : 'var(--text-dim)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span style={{ fontSize: '10px' }}>{reach.signal}</span>
                          {reach.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </>
            ) : (
              activeSearches.length > 0 ? (
                <div style={{ padding: '10px' }}>
                  {activeSearches.map(s => (
                    <div key={s.id} style={{
                      padding: '12px',
                      background: 'white',
                      marginBottom: '8px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      overflow: 'hidden'
                    }}>
                      <div
                        onClick={() => setExpandedSearchId(expandedSearchId === s.id ? null : s.id)}
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '12px' }}
                      >
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.3' }}>{s.title}</div>
                          {s.status === 'completed' ? (
                            <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 500, lineHeight: '1.3' }}>
                              Found {s.results?.length || 0} candidates
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                <span>{s.progressMessage || 'Searching...'}</span>
                                {s.results?.length > 0 && (
                                  <span style={{ color: 'var(--accent)', marginLeft: 'auto' }}>
                                    {s.results.length} found
                                  </span>
                                )}
                              </div>
                              <div style={{
                                height: '4px',
                                background: '#e5e7eb',
                                borderRadius: '2px',
                                overflow: 'hidden',
                                width: '100%'
                              }}>
                                <div style={{
                                  height: '100%',
                                  background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
                                  borderRadius: '2px',
                                  width: `${s.progressPercent || 0}%`,
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, alignSelf: 'center' }}>
                          {s.status === 'completed' && (
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: '#e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <ChevronDown size={14} color="#374151" strokeWidth={2.5} style={{ transform: expandedSearchId === s.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </div>
                          )}
                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(s.id);
                            }}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              border: 'none',
                              background: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease',
                              flexShrink: 0
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#dc2626';
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#ef4444';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title="Delete search"
                          >
                            <Minus size={12} color="white" strokeWidth={3} />
                          </button>
                        </div>
                      </div>

                      {/* Results List */}
                      {expandedSearchId === s.id && s.results && (() => {
                        // Get unique locations from results
                        const uniqueLocations = [...new Set(s.results.map((c: any) => c.location).filter(Boolean))] as string[];

                        // Apply filters
                        const filteredResults = s.results
                          .filter((c: any) => {
                            if (checklistFilters.location && c.location !== checklistFilters.location) return false;
                            if (checklistFilters.minScore > 0 && (c.matchScore || 0) < checklistFilters.minScore) return false;
                            return true;
                          })
                          // Sort by most recently active first (hottest leads)
                          .sort((a: any, b: any) => {
                            const aDate = a.lastActive ? new Date(a.lastActive).getTime() : 0;
                            const bDate = b.lastActive ? new Date(b.lastActive).getTime() : 0;
                            return bDate - aDate;
                          });

                        return (
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                            {/* Filter Bar */}
                            <div style={{
                              display: 'flex',
                              gap: '8px',
                              marginBottom: '10px',
                              alignItems: 'center'
                            }}>
                              {/* Location Filter */}
                              <select
                                value={checklistFilters.location}
                                onChange={(e) => setChecklistFilters(prev => ({ ...prev, location: e.target.value }))}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border)',
                                  fontSize: '9px',
                                  fontWeight: 600,
                                  background: checklistFilters.location ? '#dbeafe' : 'white',
                                  color: 'var(--text-main)',
                                  cursor: 'pointer',
                                  minWidth: '80px'
                                }}
                              >
                                <option value="">📍 All Locations</option>
                                {uniqueLocations.map((loc, i) => (
                                  <option key={i} value={loc}>{loc}</option>
                                ))}
                              </select>

                              {/* Clear Filters */}
                              {checklistFilters.location && (
                                <button
                                  onClick={() => setChecklistFilters({ location: '', minScore: 0 })}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    fontSize: '9px',
                                    fontWeight: 600,
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <X size={10} />
                                  Clear
                                </button>
                              )}

                              {/* Chekk All Button */}
                              <button
                                onClick={() => {
                                  // Trigger analysis for all filtered results
                                  // Stagger 3 seconds apart to avoid rate limiting
                                  const toProcess = filteredResults;
                                  toProcess.forEach((c: any, index: number) => {
                                    setTimeout(() => {
                                      triggerAnalysis(c.handle);
                                    }, index * 3000); // 3 seconds between each
                                  });
                                }}
                                style={{
                                  marginLeft: 'auto',
                                  padding: '5px 12px',
                                  borderRadius: '5px',
                                  background: 'var(--primary)',
                                  border: 'none',
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  color: 'white',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.03em'
                                }}
                              >
                                Chekk All
                              </button>
                            </div>

                            {/* Results - Premium Card Design */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              maxHeight: '300px',
                              overflowY: 'auto',
                              paddingRight: '4px'
                            }}>
                              {filteredResults.map((c: any, i: number) => (
                                <div
                                  key={i}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    background: 'white',
                                    border: '1px solid var(--border)',
                                    transition: 'all 0.2s ease',
                                    cursor: 'default'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--accent)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(180, 83, 9, 0.08)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                >
                                  <img
                                    src={c.avatar}
                                    alt={c.name}
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '6px',
                                      flexShrink: 0
                                    }}
                                  />
                                  <div style={{
                                    flex: 1,
                                    minWidth: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px'
                                  }}>
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}>
                                      <span style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: 'var(--text-main)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}>
                                        {c.name || c.handle}
                                        {c.claimed && <BadgeCheck size={12} color="#059669" fill="#d1fae5" />}
                                      </span>
                                      {c.archetype && (
                                        <span style={{
                                          fontSize: '8px',
                                          fontWeight: 700,
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          background: c.tier === 'LEGENDARY' ? '#fef3c7' : c.tier === 'ULTRA RARE' ? '#f3e8ff' : c.tier === 'RARE' ? '#dbeafe' : '#f0fdf4',
                                          color: c.tier === 'LEGENDARY' ? '#b45309' : c.tier === 'ULTRA RARE' ? '#7c3aed' : c.tier === 'RARE' ? '#1d4ed8' : '#15803d',
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.02em',
                                          whiteSpace: 'nowrap',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}>
                                          {c.reachabilitySignal && <span title="Reachability">{c.reachabilitySignal}</span>}
                                          {c.archetype.replace('THE ', '')}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{
                                      fontSize: '9px',
                                      color: 'var(--text-dim)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      flexWrap: 'wrap'
                                    }}>
                                      <EmailTooltip
                                        email={c.email}
                                        handle={c.handle}
                                        activeTooltip={emailTooltip}
                                        setActiveTooltip={setEmailTooltip}
                                      />
                                      {/* LinkedIn badge from Apollo enrichment */}
                                      {c.linkedinUrl && (
                                        <a
                                          href={c.linkedinUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: '#0077b5',
                                            color: 'white',
                                            textDecoration: 'none',
                                            fontSize: '8px',
                                            fontWeight: 600
                                          }}
                                        >
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                          </svg>
                                          LinkedIn
                                        </a>
                                      )}
                                      {/* Company & title from enrichment */}
                                      {c.currentCompany && (
                                        <span style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          color: 'var(--text-secondary)'
                                        }}>
                                          {c.companyLogoUrl && (
                                            <img
                                              src={c.companyLogoUrl}
                                              alt=""
                                              style={{ width: '12px', height: '12px', borderRadius: '2px', objectFit: 'contain' }}
                                            />
                                          )}
                                          <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {c.currentTitle ? `${c.currentTitle} @ ${c.currentCompany}` : c.currentCompany}
                                          </span>
                                        </span>
                                      )}
                                      {/* Seniority badge */}
                                      {c.seniority && (
                                        <span style={{
                                          fontSize: '7px',
                                          padding: '1px 4px',
                                          borderRadius: '3px',
                                          background: c.seniority.toLowerCase().includes('senior') || c.seniority.toLowerCase().includes('director') || c.seniority.toLowerCase().includes('vp')
                                            ? '#fef3c7'
                                            : 'var(--bg-tertiary)',
                                          color: c.seniority.toLowerCase().includes('senior') || c.seniority.toLowerCase().includes('director') || c.seniority.toLowerCase().includes('vp')
                                            ? '#b45309'
                                            : 'var(--text-dim)',
                                          fontWeight: 600,
                                          textTransform: 'uppercase'
                                        }}>
                                          {c.seniority}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                    {pendingHandles.includes(c.handle) ? (
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '5px 10px',
                                        borderRadius: '5px',
                                        background: 'var(--accent)',
                                        color: 'white',
                                        fontSize: '9px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.03em',
                                        minWidth: '52px'
                                      }}>
                                        <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                                        Analyzing
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => triggerAnalysis(c.handle)}
                                          style={{
                                            padding: '5px 10px',
                                            borderRadius: '5px',
                                            background: 'var(--primary)',
                                            border: 'none',
                                            fontSize: '9px',
                                            fontWeight: 700,
                                            color: 'white',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.03em'
                                          }}
                                        >
                                          Chekk
                                        </button>
                                        <a
                                          href={`https://github.com/${c.handle}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{
                                            padding: '5px 8px',
                                            borderRadius: '5px',
                                            background: 'var(--bg-gray)',
                                            fontSize: '9px',
                                            fontWeight: 600,
                                            color: 'var(--text-dim)',
                                            textDecoration: 'none',
                                            flexShrink: 0,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.03em'
                                          }}
                                        >
                                          View
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {filteredResults.length === 0 && (
                                <div style={{
                                  fontSize: '11px',
                                  color: 'var(--text-dim)',
                                  textAlign: 'center',
                                  padding: '20px',
                                  background: 'var(--bg-gray)',
                                  borderRadius: '8px'
                                }}>
                                  No candidates match your filters.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '11px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔍</div>
                  <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>No active searches</p>
                  <p style={{ opacity: 0.7, lineHeight: 1.4 }}>
                    Configure your first search to find<br />developers matching your criteria.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Footer - Fixed Button only for Configure */}
          {checklistTab === 'configure' && (
            <div style={{ padding: '0 20px 20px 20px', flexShrink: 0 }}>
              <button
                onClick={async () => {
                  if (checklistForm.loading) return;

                  setChecklistForm(prev => ({ ...prev, loading: true }));
                  console.log('Search with:', checklistForm);

                  const searchId = Date.now();
                  const newSearch = {
                    id: searchId,
                    title: checklistForm.jobTitle || 'Untitled Search',
                    status: 'running',
                    progressMessage: '🔍 Initializing search...',
                    timestamp: Date.now(),
                    results: []
                  };

                  setActiveSearches(prev => [newSearch, ...prev]);
                  setChecklistTab('active');

                  try {
                    const tokenData = await chrome.storage.local.get('vibe_token');
                    const token = tokenData.vibe_token;

                    // Update progress: Searching GitHub
                    setActiveSearches(prev => prev.map(s =>
                      s.id === searchId
                        ? { ...s, progressMessage: '🔎 Searching GitHub for developers...', progressPercent: 0 }
                        : s
                    ));

                    // Build SSE URL with query params
                    const params = new URLSearchParams({
                      jobTitle: checklistForm.jobTitle,
                      jd: checklistForm.jd || '',
                      experience: checklistForm.experience || '',
                      location: (checklistForm as any).location || ''
                    });

                    // Add auth token (EventSource doesn't support headers)
                    if (token) {
                      params.append('token', token);
                    }

                    // Add languages as separate params
                    checklistForm.languages.forEach(lang => params.append('languages', lang));
                    checklistForm.archetypes.forEach(arch => params.append('archetypes', arch));
                    checklistForm.tiers.forEach(tier => params.append('tiers', tier));
                    checklistForm.reachability.forEach(reach => params.append('reachability', reach));

                    // Use SSE for progressive loading
                    const eventSource = new EventSource(
                      `${BACKEND_URL}/api/chekklist/stream?${params.toString()}`
                    );

                    eventSource.addEventListener('status', (e) => {
                      const data = JSON.parse(e.data);
                      setActiveSearches(prev => prev.map(s =>
                        s.id === searchId
                          ? {
                            ...s,
                            progressMessage: data.message,
                            progressPercent: data.progress || 0,
                            analyzed: data.analyzed,
                            total: data.total
                          }
                          : s
                      ));
                    });

                    eventSource.addEventListener('candidate', (e) => {
                      const candidate = JSON.parse(e.data);
                      setActiveSearches(prev => prev.map(s =>
                        s.id === searchId
                          ? { ...s, results: [...(s.results || []), candidate] }
                          : s
                      ));
                    });

                    // Listen for enrichment updates (LinkedIn, company data from Apollo)
                    eventSource.addEventListener('enrichment', (e) => {
                      const enrichData = JSON.parse(e.data);
                      setActiveSearches(prev => prev.map(s => {
                        if (s.id !== searchId) return s;
                        // Update the matching candidate with enrichment data
                        const updatedResults = (s.results || []).map((c: any) =>
                          c.handle === enrichData.handle
                            ? { ...c, ...enrichData, enriched: true }
                            : c
                        );
                        return { ...s, results: updatedResults };
                      }));
                    });

                    eventSource.addEventListener('complete', (e) => {
                      const data = JSON.parse(e.data);
                      eventSource.close();
                      setActiveSearches(prev => prev.map(s =>
                        s.id === searchId
                          ? { ...s, status: 'completed', progressMessage: data.message }
                          : s
                      ));
                      // Save to storage
                      setActiveSearches(current => {
                        chrome.storage.local.set({ active_searches: current });
                        return current;
                      });
                      setChecklistForm(prev => ({ ...prev, loading: false }));
                    });

                    // Single error handler - preserves results if connection lost after receiving candidates
                    eventSource.onerror = () => {
                      eventSource.close();
                      setActiveSearches(prev => prev.map(s =>
                        s.id === searchId
                          ? { ...s, status: 'completed', results: s.results || [], error: s.results?.length ? undefined : 'Connection lost' }
                          : s
                      ));
                      setChecklistForm(prev => ({ ...prev, loading: false }));
                    };

                  } catch (e) {
                    console.error(e);
                    setActiveSearches(prev => prev.map(s =>
                      s.id === searchId
                        ? { ...s, status: 'completed', results: [], error: 'Search failed' }
                        : s
                    ));
                    setChecklistForm(prev => ({ ...prev, loading: false }));
                  }
                }}
                disabled={checklistForm.loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                }}
              >
                {checklistForm.loading ? 'SEARCHING...' : 'FIND QUALITY DEVS'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BULKCHEKK Card */}
      <div style={{
        position: 'relative',
        marginBottom: '12px',
        borderRadius: '16px',
        overflow: 'visible',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: showBulkChekkForm ? '0 4px 16px rgba(0, 0, 0, 0.12)' : '0 2px 8px rgba(0, 0, 0, 0.06)',
        background: 'linear-gradient(135deg, #020617 0%, #172554 100%)',
        border: showBulkChekkForm ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent'
      }}>
        {/* Blob container with overflow hidden */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '16px',
          overflow: 'hidden',
          pointerEvents: 'none'
        }}>
          <div style={{
            position: 'absolute',
            right: '-30px',
            top: '-30px',
            width: '160px',
            height: '160px',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
            zIndex: 0
          }} />
        </div>

        {/* Content Layer */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header / Toggle */}
          <div
            onClick={() => {
              if (user?.tier !== 'PRO') {
                setProFeaturePaywallOpen('BulkChekk');
                return;
              }
              setShowBulkChekkForm(!showBulkChekkForm);
            }}
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              gap: '14px',
              position: 'relative'
            }}
          >
            {/* Icon Box */}
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <FileSpreadsheet size={24} color="white" strokeWidth={2.5} />
            </div>

            {/* Text Info */}
            <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'white',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}>
                  BULKCHEKK
                </span>
                <span style={{
                  fontSize: '8px',
                  fontWeight: 900,
                  color: user?.tier === 'PRO' ? '#1a1a1a' : 'rgba(255, 255, 255, 0.9)',
                  background: user?.tier === 'PRO'
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'rgba(255, 255, 255, 0.15)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  letterSpacing: '0.02em',
                  lineHeight: 1
                }}>
                  PRO
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500, display: 'block' }}>
                Analyze devs via CSV
              </span>

              {/* Mini Icons Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="bulkchekk-tooltip-wrapper">
                  <Info
                    size={13}
                    color="rgba(255, 255, 255, 0.5)"
                    style={{ cursor: 'help', opacity: 0.7 }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="bulkchekk-tooltip" style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '0',
                    marginBottom: '8px',
                    background: 'white',
                    color: '#1a1a1a',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 500,
                    width: '200px',
                    textAlign: 'left',
                    lineHeight: 1.4,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    opacity: 0,
                    visibility: 'hidden',
                    transition: 'all 0.2s ease',
                    pointerEvents: 'none',
                    zIndex: 1000
                  }}>
                    Upload a CSV with Github usernames to analyze multiple profiles at once
                  </div>
                </div>
                {/* Status Dot */}
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: showBulkChekkForm ? '#f59e0b' : 'transparent',
                  border: `1.5px solid ${showBulkChekkForm ? '#f59e0b' : 'rgba(255, 255, 255, 0.6)'}`,
                  transition: 'all 0.2s ease',
                  boxShadow: showBulkChekkForm ? '0 0 8px rgba(245, 158, 11, 0.6)' : 'none'
                }} />
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight
              size={18}
              color="rgba(255, 255, 255, 0.5)"
              style={{
                flexShrink: 0,
                transform: showBulkChekkForm ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          </div>
          {/* Form Content (Correctly Animated) */}
          <div style={{
            maxHeight: showBulkChekkForm ? '500px' : '0',
            opacity: showBulkChekkForm ? 1 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
            background: 'rgba(255, 255, 255, 0.03)',
            borderTop: showBulkChekkForm ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
          }}>
            <div style={{ padding: '20px' }}>
              {/* Tabs Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.08)', padding: '2px', borderRadius: '8px' }}>
                  <button
                    onClick={() => setBulkChekkTab('import')}
                    style={{
                      padding: '4px 12px',
                      fontSize: '10px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      background: bulkChekkTab === 'import' ? 'rgba(255,255,255,0.15)' : 'transparent',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      letterSpacing: '0.02em'
                    }}
                  >
                    IMPORT
                  </button>
                  <button
                    onClick={() => setBulkChekkTab('history')}
                    style={{
                      padding: '4px 12px',
                      fontSize: '10px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      background: bulkChekkTab === 'history' ? 'rgba(255,255,255,0.15)' : 'transparent',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      letterSpacing: '0.02em'
                    }}
                  >
                    HISTORY
                  </button>
                </div>
              </div>

              {bulkChekkTab === 'import' ? (
                <>
                  {/* File upload area */}
                  <input
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    id="bulk-file-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setBulkFile(file)
                    }}
                  />
                  <label
                    htmlFor="bulk-file-input"
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDragging(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDragging(false)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDragging(false)
                      const file = e.dataTransfer.files?.[0]
                      if (file && file.name.endsWith('.csv')) {
                        setBulkFile(file)
                      }
                    }}
                    style={{
                      display: 'block',
                      border: isDragging ? '2px dashed #4f46e5' : (bulkFile ? '2px solid #4f46e5' : '2px dashed #e2e8f0'),
                      borderRadius: '12px',
                      padding: '30px',
                      textAlign: 'center',
                      background: isDragging ? 'rgba(79, 70, 229, 0.1)' : (bulkFile ? 'rgba(79, 70, 229, 0.05)' : '#f8fafc'),
                      cursor: bulkProcessing ? 'not-allowed' : 'pointer',
                      marginBottom: '16px',
                      transition: 'all 0.2s ease',
                      transform: isDragging ? 'scale(1.02)' : 'scale(1)'
                    }}
                  >
                    {bulkFile ? (
                      <>
                        <FileSpreadsheet size={32} color="#4f46e5" style={{ marginBottom: '10px' }} />
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#4f46e5' }}>
                          {bulkFile.name}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                          Click to change file
                        </div>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet size={32} color="#cbd5e1" style={{ marginBottom: '10px' }} />
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                          Click or drag CSV here
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                          Max 100 profiles per batch
                        </div>
                      </>
                    )}
                  </label>

                  {/* Progress indicator */}
                  {bulkProcessing && (
                    <div style={{
                      background: 'rgba(79, 70, 229, 0.1)',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#4f46e5', marginBottom: '8px' }}>
                        {bulkProgress.status}
                      </div>
                      {bulkProgress.total > 0 && (
                        <>
                          <div style={{
                            height: '6px',
                            background: '#e2e8f0',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            marginBottom: '6px'
                          }}>
                            <div style={{
                              height: '100%',
                              background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                              width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
                            {bulkProgress.current} of {bulkProgress.total} profiles
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Real-time results preview */}
                  {bulkResults.length > 0 && (
                    <div style={{
                      maxHeight: '120px',
                      overflowY: 'auto',
                      marginBottom: '16px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      padding: '8px'
                    }}>
                      {bulkResults.slice(-5).map((r, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          fontSize: '10px',
                          color: r.success ? '#059669' : '#dc2626'
                        }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: r.success ? '#059669' : '#dc2626'
                          }} />
                          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {r.handle}
                            {r.report?.metadata?.claimed && <BadgeCheck size={10} color="#059669" fill="#d1fae5" />}
                          </span>
                          <span style={{ opacity: 0.7 }}>
                            {r.success ? (r.report?.archetype || 'Analyzed') : r.error}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={processBulkAnalysis}
                    disabled={!bulkFile || bulkProcessing}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: (!bulkFile || bulkProcessing)
                        ? '#94a3b8'
                        : 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: (!bulkFile || bulkProcessing) ? 'not-allowed' : 'pointer',
                      opacity: (!bulkFile || bulkProcessing) ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {bulkProcessing ? 'PROCESSING...' : 'START BULK ANALYSIS'}
                  </button>
                </>
              ) : (
                /* History Tab */
                <div style={{ minHeight: '150px' }}>
                  {bulkHistory.length === 0 ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '150px',
                      color: 'rgba(255,255,255,0.5)',
                      gap: '12px'
                    }}>
                      <Clock size={24} style={{ opacity: 0.5 }} />
                      <span style={{ fontSize: '11px' }}>No past imports found</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                      {bulkHistory.map((batch, i) => (
                        <div
                          key={batch.id || i}
                          style={{
                            padding: '12px',
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>
                              {batch.filename || `Batch ${i + 1}`}
                            </span>
                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
                              {new Date(batch.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{
                              fontSize: '10px',
                              padding: '4px 8px',
                              background: 'rgba(16, 185, 129, 0.2)',
                              color: '#10b981',
                              borderRadius: '4px',
                              fontWeight: 600
                            }}>
                              ✓ {batch.successCount || 0} success
                            </div>
                            {batch.failedCount > 0 && (
                              <div style={{
                                fontSize: '10px',
                                padding: '4px 8px',
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                borderRadius: '4px',
                                fontWeight: 600
                              }}>
                                ✗ {batch.failedCount} failed
                              </div>
                            )}
                          </div>
                          {/* Show results preview */}
                          {batch.results && batch.results.length > 0 && (
                            <div style={{ marginTop: '10px', fontSize: '10px' }}>
                              {batch.results.filter((r: any) => r.success).slice(0, 3).map((r: any, idx: number) => (
                                <div key={idx} style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '4px 0',
                                  borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                                }}>
                                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>{r.handle}</span>
                                  <span style={{
                                    color: '#f59e0b',
                                    fontWeight: 600,
                                    fontSize: '9px'
                                  }}>
                                    {r.report?.archetype || 'Analyzed'}
                                  </span>
                                </div>
                              ))}
                              {batch.results.filter((r: any) => r.success).length > 3 && (
                                <div style={{ color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                  +{batch.results.filter((r: any) => r.success).length - 3} more profiles
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </>
  );
  return (
    <>
      <div className="popup-container">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/public/icon48.png" alt="Vibechekk" style={{ width: '24px', height: '24px' }} />
            <h1 className="logo" style={{ textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>VIBECHEKK</h1>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'rgba(0,0,0,0.03)', padding: '4px 8px', borderRadius: '20px' }}>
            <BadgeCheck size={14} color={user?.tier === 'PRO' ? '#b45309' : (user ? 'var(--accent)' : 'var(--text-dim)')} strokeWidth={1.5} />
            <span style={{ fontSize: '10px', fontWeight: 800, color: user?.tier === 'PRO' ? '#b45309' : (user ? 'var(--accent)' : 'var(--text-dim)'), letterSpacing: '0.5px' }}>
              {user?.tier === 'PRO' ? 'PRO' : (user ? 'AUTHENTICATED' : 'GUEST')} TIER
            </span>
          </div>
        </header>

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '320px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'slideUpFade 0.3s ease'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Trash size={24} color="#dc2626" />
              </div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--text-main)',
                textAlign: 'center',
                margin: '0 0 8px'
              }}>
                Delete Search?
              </h3>
              <p style={{
                fontSize: '13px',
                color: 'var(--text-dim)',
                textAlign: 'center',
                margin: '0 0 24px',
                lineHeight: 1.5
              }}>
                This will permanently remove this search and all its results.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setActiveSearches(prev => {
                      const updated = prev.filter(search => search.id !== deleteConfirmId);
                      chrome.storage.local.set({ active_searches: updated });
                      return updated;
                    });
                    setDeleteConfirmId(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#dc2626',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Toast */}
        {errorToast && (
          <div style={{
            position: 'fixed',
            top: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 10000,
            maxWidth: '350px',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <AlertTriangle size={18} color="#dc2626" />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#991b1b', fontWeight: 600 }}>{errorToast.message}</p>
              {errorToast.action && (
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#b91c1c' }}>{errorToast.action}</p>
              )}
            </div>
            <button
              onClick={() => setErrorToast(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
            >
              <X size={14} color="#dc2626" />
            </button>
          </div>
        )}

        <div className="tabs-nav">
          <div className="tab-slider" style={{
            transform: `translateX(${activeTab === 'analyze' ? '0' :
              activeTab === 'history' ? '100%' :
                activeTab === 'analytics' ? '200%' : '300%'})`
          }} />
          <button className={`tab-btn ${activeTab === 'analyze' ? 'active' : ''}`} onClick={() => { setActiveTab('analyze'); setSelectedReport(null); }}>
            <Search size={14} strokeWidth={2} />
          </button>
          <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => { setActiveTab('history'); setSelectedReport(null); }}>
            <div style={{ position: 'relative' }}>
              <Clock size={14} strokeWidth={2} />
              {pendingHandles.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-8px',
                  width: '14px',
                  height: '14px',
                  background: 'var(--accent)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white'
                }}>
                  <Loader2 size={8} color="white" className="spin" />
                </div>
              )}
            </div>
          </button>
          <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => { setActiveTab('analytics'); setSelectedReport(null); }}>
            <TrendingUp size={14} strokeWidth={2} />
          </button>
          <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setSelectedReport(null); }}>
            <Settings size={14} strokeWidth={2} />
          </button>
        </div>

        <main>
          {authLoading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <Loader2 size={24} className="spin" color="var(--accent)" />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.5px' }}>LOADING...</span>
            </div>
          ) : selectedReport ? (
            (selectedReport.label?.toUpperCase()?.includes('GHOST') || selectedReport.insufficient_data) ? (
              // Insufficient data state (GHOST profile)
              <div className="detail-view">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '24px', marginBottom: '24px' }}>
                  <button className="back-btn" onClick={() => setSelectedReport(null)} style={{
                    padding: '10px',
                    marginLeft: '-8px',
                    background: 'var(--bg-gray)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer'
                  }}>
                    <ArrowLeft size={18} strokeWidth={2.5} color="var(--text-main)" />
                  </button>
                  <div>
                    <h2 className="history-name" style={{ fontSize: '18px', margin: 0, letterSpacing: '-0.02em' }}>{selectedReport.handle || 'Guest Profile'}</h2>
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '64px 32px' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'var(--bg-gray)',
                    borderRadius: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px auto',
                    border: '1px solid var(--border)'
                  }}>
                    <Ghost size={40} color="var(--text-dim)" strokeWidth={1.5} />
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-main)', letterSpacing: '0.5px' }}>GHOST PROFILE</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: '280px', margin: '0 auto', fontWeight: 500 }}>
                    This profile has limited public repositories or code to analyze. They likely work in private repos or enterprise environments.
                  </p>
                </div>
              </div>
            ) : (
              <div className="detail-view">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '24px', marginBottom: '8px', position: 'relative' }}>
                  <button className="back-btn" onClick={() => setSelectedReport(null)} style={{
                    padding: '10px',
                    marginLeft: '-8px',
                    background: 'var(--bg-gray)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer'
                  }}>
                    <ArrowLeft size={18} strokeWidth={2.5} color="var(--text-main)" />
                  </button>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
                    {(() => {
                      const handle = selectedReport.candidate?.githubHandle && selectedReport.candidate.githubHandle !== 'Guest' ? selectedReport.candidate.githubHandle : '';
                      return (
                        <>
                          {/* Left: Profile pic only */}
                          <div style={{ flexShrink: 0 }}>
                            {handle ? (
                              <a href={`https://github.com/${handle}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: '12px', overflow: 'hidden', width: '48px', height: '48px' }}>
                                <img
                                  src={`https://github.com/${handle}.png?size=96`}
                                  alt={handle}
                                  style={{ width: '48px', height: '48px', display: 'block', objectFit: 'cover' }}
                                />
                              </a>
                            ) : (
                              <div className="history-avatar-placeholder" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
                                <User size={24} color="var(--text-dim)" />
                              </div>
                            )}
                          </div>

                          {/* Center: Name and Archetype */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <a
                              href={`https://github.com/${handle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ textDecoration: 'none', display: 'block', overflow: 'hidden' }}
                            >
                              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {patchedStats?.name || selectedReport.candidate?.name || selectedReport.metadata?.userStats?.name || handle || 'Guest Profile'}
                              </h2>
                            </a>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                              {/* Left: Icon and Badge */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                <ArchetypeIcon label={selectedReport.label || 'Profile'} rarity={selectedReport.rarity || getRarityFromLabel(selectedReport.label)} size={14} />
                                <div className="archetype-tooltip-wrapper">
                                  <div className={`archetype-badge ${getRarityClass(selectedReport.rarity || getRarityFromLabel(selectedReport.label))}`}>
                                    {stripThe(selectedReport.label) || 'Profile'}
                                  </div>
                                  <div className="archetype-tooltip">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                      <div>
                                        <strong style={{ display: 'block', marginBottom: '4px' }}>{stripThe(selectedReport.label) || 'Profile'}</strong>
                                        {(selectedReport.archetype_reason || selectedReport.metadata?.archetype_reason || 'Analysis based on GitHub activity.').replace('Classified as THE ', 'Classified as ')}
                                      </div>
                                      <div
                                        style={{ cursor: 'pointer', padding: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText((selectedReport.archetype_reason || selectedReport.metadata?.archetype_reason || '').replace('Classified as THE ', 'Classified as '));
                                        }}
                                        title="Copy description"
                                      >
                                        <Copy size={12} color="white" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Email and LinkedIn icons */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                {/* Email Button */}
                                {(() => {
                                  const email = selectedReport.candidate?.email || selectedReport.metadata?.email || selectedReport.metadata?.userStats?.email;
                                  const hasEmail = !!email;
                                  const emailCopied = copiedId === 'profile-email';
                                  return (
                                    <div style={{ position: 'relative' }}>
                                      <button
                                        onClick={async () => {
                                          if (hasEmail) {
                                            await navigator.clipboard.writeText(email);
                                            setCopiedId('profile-email');
                                            setTimeout(() => setCopiedId(null), 2000);
                                          }
                                        }}
                                        disabled={!hasEmail}
                                        title={hasEmail ? `Copy ${email}` : 'No email on file'}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: '26px',
                                          height: '26px',
                                          borderRadius: '6px',
                                          background: emailCopied ? 'rgba(16, 185, 129, 0.25)' : hasEmail ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.08)',
                                          border: 'none',
                                          cursor: hasEmail ? 'pointer' : 'not-allowed',
                                          transition: 'all 0.15s ease',
                                          opacity: hasEmail ? 1 : 0.5,
                                        }}
                                      >
                                        {emailCopied ? (
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                          </svg>
                                        ) : (
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={hasEmail ? "#10b981" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                          </svg>
                                        )}
                                      </button>
                                      {emailCopied && (
                                        <div style={{
                                          position: 'absolute',
                                          top: '-28px',
                                          left: '50%',
                                          transform: 'translateX(-50%)',
                                          background: '#10b981',
                                          color: 'white',
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          fontSize: '10px',
                                          fontWeight: 600,
                                          whiteSpace: 'nowrap',
                                          zIndex: 10,
                                          animation: 'fadeIn 0.15s ease-out',
                                        }}>
                                          Copied!
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* LinkedIn Button */}
                                {(() => {
                                  const linkedinUrl = selectedReport.candidate?.linkedinUrl;
                                  if (linkedinUrl) {
                                    return (
                                      <a
                                        href={linkedinUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Open LinkedIn profile"
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: '26px',
                                          height: '26px',
                                          borderRadius: '6px',
                                          background: 'rgba(0, 119, 181, 0.12)',
                                          transition: 'all 0.15s ease',
                                        }}
                                      >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="#0077b5">
                                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                        </svg>
                                      </a>
                                    );
                                  } else if (user?.tier === 'PRO') {
                                    return (
                                      <button
                                        onClick={() => enrichCandidate(
                                          selectedReport.candidate?.id,
                                          selectedReport.candidate?.email || selectedReport.metadata?.email,
                                          selectedReport.candidate?.name || selectedReport.metadata?.userStats?.name
                                        )}
                                        disabled={enriching}
                                        title={enrichmentStatus === 'no_match' ? 'Not found' : enrichmentStatus === 'error' ? 'Enrichment failed' : 'Find LinkedIn profile'}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: '26px',
                                          height: '26px',
                                          borderRadius: '6px',
                                          background: enrichmentStatus === 'no_match' ? 'rgba(245, 158, 11, 0.15)' : enrichmentStatus === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 119, 181, 0.12)',
                                          border: 'none',
                                          cursor: enriching ? 'wait' : 'pointer',
                                          opacity: enriching ? 0.6 : 1,
                                          transition: 'all 0.15s ease',
                                        }}
                                      >
                                        {enriching ? (
                                          <Loader2 size={13} color="#0077b5" style={{ animation: 'spin 1s linear infinite' }} />
                                        ) : enrichmentStatus === 'no_match' ? (
                                          <AlertCircle size={13} color="#f59e0b" />
                                        ) : enrichmentStatus === 'error' ? (
                                          <AlertCircle size={13} color="#ef4444" />
                                        ) : (
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="#94a3b8">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                          </svg>
                                        )}
                                      </button>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Last seen - absolutely positioned at bottom right, sitting on divider */}
                  {/* Last seen - absolutely positioned at bottom right, sitting on divider */}
                  {(patchedStats?.lastActive || selectedReport.metadata?.lastActive) && (
                    <div style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: getLastSeenColor(patchedStats?.lastActive || selectedReport.metadata.lastActive) }} />
                      <span style={{ fontSize: '9px', color: 'var(--text-dim)', fontWeight: 500 }}>
                        {formatLastSeen(patchedStats?.lastActive || selectedReport.metadata.lastActive)}
                      </span>
                    </div>
                  )}

                </div>

                {/* Stats Bar (Repositories, Stars, Commits, Languages) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  width: '100%',
                  marginBottom: '8px'
                  /* Removed horizontal padding to align with sections below */
                }}>
                  {[
                    {
                      label: 'REPOS',
                      value: patchedStats?.totalRepos !== undefined ? patchedStats.totalRepos : (selectedReport.metadata?.userStats?.totalRepos || selectedReport.candidate?.public_repos || 0)
                    },
                    {
                      label: 'COMMITS',
                      value: patchedStats?.totalCommits !== undefined ? patchedStats.totalCommits : (selectedReport.metadata?.userStats?.totalCommits || 0)
                    },
                    {
                      label: 'LANGUAGES',
                      value: patchedStats?.languages !== undefined && patchedStats.languages > 0
                        ? patchedStats.languages
                        : ((selectedReport.metadata?.userStats?.languages?.length || 0) > 0
                          ? selectedReport.metadata.userStats.languages.length
                          : (selectedReport.metadata?.verified_skills?.length > 0
                            ? new Set(selectedReport.metadata.verified_skills.map((s: any) => (typeof s === 'string' ? s.split('|')[0] : s.name).trim())).size
                            : 0)),
                      tooltip: patchedStats?.languagesList?.join(', ') || selectedReport.metadata?.userStats?.languages?.join(', ')
                    },
                    {
                      label: 'STARS',
                      value: patchedStats?.totalStars !== undefined ? patchedStats.totalStars : (selectedReport.metadata?.userStats?.totalStars || 0)
                    }
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="stat-card"
                      style={{
                        background: 'white',
                        aspectRatio: '1 / 1', /* Force perfect square */
                        height: 'auto',
                        width: '100%',
                        padding: '0',
                        borderRadius: '12px', /* Slightly more rounded for modern look */
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        boxShadow: 'none', /* Flat look per pic 2 modern vibe */
                        cursor: stat.tooltip ? 'help' : 'default',
                        position: 'relative'
                      }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', lineHeight: '1' }}>
                        {formatNumber(stat.value)}
                      </span>
                      <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>{stat.label}</span>
                      {stat.tooltip && (
                        <div className="stat-tooltip" style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 'max-content',
                          maxWidth: '180px',
                          marginBottom: '10px',
                          padding: '10px 14px',
                          background: 'rgba(15, 23, 42, 0.98)',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: 500,
                          borderRadius: '10px',
                          whiteSpace: 'normal',
                          textAlign: 'center',
                          lineHeight: '1.4',
                          opacity: 0,
                          visibility: 'hidden',
                          transition: 'opacity 0.2s, visibility 0.2s, transform 0.2s',
                          pointerEvents: 'none',
                          zIndex: 100,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          {stat.tooltip}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="detail-section">
                  <button
                    onClick={() => {
                      setShowFullSummary(!showFullSummary);
                      if (!showFullSummary) setShowDetailedSummary(false);
                    }}
                    className="section-header-btn"
                  >
                    <h3 className="section-title" style={{ marginBottom: 0, textTransform: 'uppercase' }}>SKILL OVERVIEW</h3>
                    {showFullSummary ? <ChevronDown size={16} strokeWidth={2} /> : <ChevronRight size={16} strokeWidth={2} />}
                  </button>

                  {showFullSummary && (
                    <div className="trajectory-box expanded">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <p className="trajectory-text" style={{ flex: 1, margin: 0 }}>
                          {showDetailedSummary
                            ? (selectedReport.recruiterSummary || selectedReport.recruiter_summary)
                            : (selectedReport.trajectorySummary || selectedReport.trajectory)
                          }
                        </p>
                        <button
                          className="copy-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            const text = showDetailedSummary
                              ? (selectedReport.recruiterSummary || selectedReport.recruiter_summary)
                              : selectedReport.trajectorySummary;
                            navigator.clipboard.writeText(text);
                            setCopiedId('summary');
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                        >
                          {copiedId === 'summary' ? (
                            <BadgeCheck size={14} strokeWidth={2} color="var(--accent)" />
                          ) : (
                            <Copy size={14} strokeWidth={2} />
                          )}
                        </button>
                      </div>

                      {(selectedReport.recruiterSummary || selectedReport.recruiter_summary) && (
                        <button
                          className="view-more-btn"
                          onClick={() => setShowDetailedSummary(!showDetailedSummary)}
                          style={{ marginTop: '12px' }}
                        >
                          {showDetailedSummary ? 'view less' : 'view more'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {selectedReport.metadata?.technical_signal && (
                  <div className="detail-section">
                    <button
                      onClick={() => {
                        setShowTechnicalSignal(!showTechnicalSignal);
                        if (!showTechnicalSignal) setShowDetailedTechnical(false);
                      }}
                      className="section-header-btn"
                    >
                      <h3 className="section-title" style={{ marginBottom: 0, textTransform: 'uppercase' }}>TECHNICAL SIGNAL</h3>
                      {showTechnicalSignal ? <ChevronDown size={16} strokeWidth={2} /> : <ChevronRight size={16} strokeWidth={2} />}
                    </button>

                    {showTechnicalSignal && (
                      <div className="trajectory-box expanded" style={{ background: 'rgba(33, 150, 243, 0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                          <p className="trajectory-text" style={{ margin: 0, fontWeight: 500, flex: 1 }}>
                            {showDetailedTechnical && selectedReport.metadata.technical_signal_detailed
                              ? selectedReport.metadata.technical_signal_detailed
                              : selectedReport.metadata.technical_signal
                            }
                          </p>
                          <button
                            className="copy-icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              const text = showDetailedTechnical && selectedReport.metadata.technical_signal_detailed
                                ? selectedReport.metadata.technical_signal_detailed
                                : selectedReport.metadata.technical_signal;
                              navigator.clipboard.writeText(text);
                              setCopiedId('signal');
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                          >
                            {copiedId === 'signal' ? (
                              <BadgeCheck size={14} strokeWidth={2} color="var(--accent)" />
                            ) : (
                              <Copy size={14} strokeWidth={2} />
                            )}
                          </button>
                        </div>

                        {selectedReport.metadata.technical_signal_detailed && (
                          <button
                            className="view-more-btn"
                            onClick={() => setShowDetailedTechnical(!showDetailedTechnical)}
                            style={{ marginTop: '12px' }}
                          >
                            {showDetailedTechnical ? 'view less' : 'view more'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
                }

                {
                  selectedReport.metadata?.verified_skills?.length > 0 && (
                    <div className="detail-section">
                      <div style={{ width: '100%', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}></div>
                      <h3 className="section-title" style={{ marginBottom: '12px', marginTop: '4px' }}>SKILLS VERIFIED FROM CODE</h3>
                      <div className="merit-grid scrollable">
                        {selectedReport.metadata.verified_skills.map((skill: any, i: number) => {
                          const isExpanded = expandedSkills.includes(i);
                          const toggle = () => setExpandedSkills(prev => prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i]);

                          const name = skill.name || skill.title || (typeof skill === 'string' ? skill.split('|')[0] : 'Skill');
                          const level = skill.level || (typeof skill === 'string' ? skill.split('|')[1]?.trim() : '');
                          const evidence = skill.evidence || (typeof skill === 'string' ? skill.split('|')[2]?.trim() : '');

                          return (
                            <div key={i} className={`merit-card ${isExpanded ? 'expanded' : ''}`} onClick={toggle} style={{ cursor: 'pointer' }}>
                              <div className="merit-header">
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <BadgeCheck size={14} style={{ marginRight: '8px', color: 'var(--accent)' }} strokeWidth={1.5} />
                                  <span className="merit-title">{name}</span>
                                </div>
                                {isExpanded ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}
                              </div>
                              {isExpanded && (
                                <div className="merit-detail">
                                  {level && <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Proficiency: {level}</div>}
                                  {evidence && <p style={{ margin: '0 0 12px 0' }}>{evidence}</p>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                }


                {selectedReport.meritPoints?.length > 0 && !(selectedReport.label?.toUpperCase()?.includes('GHOST') || selectedReport.insufficient_data) && (
                  <div className="detail-section">
                    <div style={{ width: '100%', borderBottom: '1px solid var(--border)', marginTop: '8px', marginBottom: '8px' }}></div>
                    <h3 className="section-title" style={{ marginBottom: '12px', marginTop: '4px' }}>HIGHLIGHTS</h3>
                    <div className="merit-grid scrollable">
                      {selectedReport.meritPoints.map((point: any, i: number) => {
                        const isExpanded = expandedMerits.includes(i);
                        const isNegative = point.type === 'negative';
                        const toggle = () => {
                          setExpandedMerits((prev: number[]) =>
                            prev.includes(i) ? prev.filter((idx: number) => idx !== i) : [...prev, i]
                          );
                        };
                        return (
                          <div key={i} className={`merit-card ${isExpanded ? 'expanded' : ''} ${isNegative ? 'negative' : ''}`} onClick={toggle} style={{ cursor: 'pointer' }}>
                            <div className="merit-header">
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                {isNegative ? (
                                  <AlertTriangle size={14} style={{ marginRight: '8px', color: '#ea580c' }} strokeWidth={1.5} />
                                ) : (
                                  <BadgeCheck size={14} style={{ marginRight: '8px', color: 'var(--accent)' }} strokeWidth={1.5} />
                                )}
                                <span className="merit-title">{point.title || point}</span>
                              </div>
                              {isExpanded ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}
                            </div>
                            {isExpanded && (
                              <div className="merit-detail">
                                <p style={{ margin: '0 0 12px 0' }}>{point.detail}</p>

                                {point.business_impact && (
                                  <div style={{ background: isNegative ? 'rgba(234, 88, 12, 0.05)' : 'rgba(0, 0, 0, 0.03)', padding: '10px', borderRadius: '6px', marginBottom: '12px', borderLeft: `3px solid ${isNegative ? '#ea580c' : 'var(--accent)'}` }}>
                                    <strong style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: '4px', letterSpacing: '0.5px' }}>Business Impact</strong>
                                    <span style={{ fontSize: '11px', color: 'var(--text-main)', lineHeight: '1.4' }}>{point.business_impact}</span>
                                  </div>
                                )}

                                {point.evidence && Array.isArray(point.evidence) && point.evidence.length > 0 && (
                                  <div>
                                    <strong style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>Evidence</strong>
                                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      ```
                                      {point.evidence.map((ev: string, idx: number) => <li key={idx}>{ev}</li>)}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Hidden Professional Report Template for PDF Generation */}
                {(() => {
                  // Professional B2B color palette - Airbnb/Notion inspired
                  const colors = {
                    white: '#ffffff',
                    slate900: '#0f172a',
                    slate700: '#334155',
                    slate500: '#64748b',
                    slate400: '#94a3b8',
                    slate300: '#cbd5e1',
                    slate200: '#e2e8f0',
                    slate100: '#f1f5f9',
                    slate50: '#f8fafc',
                    teal: '#0d9488',
                    tealLight: '#14b8a6',
                    tealBg: '#f0fdfa'
                  };

                  const userStats = selectedReport.metadata?.userStats || selectedReport.candidate?.userStats || {};

                  // Use patched stats if available (fetched from client-side GitHub API) for consistency with UI
                  const lastActive = patchedStats?.lastActive || selectedReport.metadata?.lastActive;

                  // For the PDF, use our specific repo count from the analysis session if available
                  const regexMatch = selectedReport.metadata?.archetype_reason?.match(/(\d+)\s+repositories/);
                  let totalRepos = 0;

                  if (regexMatch && regexMatch[1]) {
                    totalRepos = parseInt(regexMatch[1]);
                  } else if (patchedStats && patchedStats.totalRepos !== undefined) {
                    totalRepos = patchedStats.totalRepos;
                  } else {
                    totalRepos = userStats.totalRepos || userStats.public_repos || selectedReport.candidate?.public_repos || 0;
                  }

                  let totalStars = (patchedStats && patchedStats.totalStars !== undefined) ? patchedStats.totalStars : (userStats.totalStars || 0);
                  const totalCommits = (patchedStats && patchedStats.totalCommits !== undefined) ? patchedStats.totalCommits : (userStats.totalCommits || 0);

                  const verifiedSkills = selectedReport.metadata?.verified_skills || [];
                  const meritPoints = selectedReport.meritPoints || selectedReport.metadata?.highlights || [];

                  // Robust Languages extraction - use patchedStats first for consistency
                  let languages = patchedStats?.languagesList || userStats.languages || [];
                  if ((!languages || languages.length === 0) && verifiedSkills.length > 0) {
                    languages = [...new Set(verifiedSkills.map((s: any) => {
                      const name = typeof s === 'string' ? s.split('|')[0] : (s.name || '');
                      return name.trim();
                    }))].filter(n => n);
                  }

                  // Get candidate name - if name equals handle (username), prefer the handle for display
                  const rawName = userStats.name || selectedReport.candidate?.name || '';
                  const handle = selectedReport.candidate?.githubHandle || '';
                  // If name is empty or equals the handle, just use handle; otherwise use real name
                  const candidateName = (rawName && rawName.toLowerCase() !== handle.toLowerCase()) ? rawName : (handle || 'Developer');
                  const avatar = selectedReport.candidate?.avatar || `https://github.com/${handle}.png?size=400`;

                  // Get archetype from multiple sources for reliability
                  const archetypeRaw = selectedReport.label || selectedReport.archetype || selectedReport.metadata?.label || selectedReport.metadata?.archetype;
                  let displayArchetype = (archetypeRaw && archetypeRaw.trim() && !['PROFILE', 'GHOST'].includes(archetypeRaw.toUpperCase()) ? archetypeRaw : '').replace(/^THE\s+/i, '');

                  // If displayArchetype is still empty, derive it from the reason if possible
                  if (!displayArchetype) {
                    const reason = selectedReport.archetype_reason || selectedReport.metadata?.archetype_reason || '';
                    const match = reason.match(/Classified as ([^.]+)/i);
                    if (match && match[1]) {
                      displayArchetype = match[1].split(' because')[0].trim();
                    }
                  }

                  // Final fallback
                  if (!displayArchetype || displayArchetype.toUpperCase() === 'PROFILE') {
                    displayArchetype = 'Developer';
                  }

                  const linkedinUrl = selectedReport.candidate?.linkedinUrl;
                  const email = selectedReport.metadata?.email;

                  let assessmentSummary = selectedReport.archetype_reason || selectedReport.metadata?.archetype_reason || '';
                  assessmentSummary = assessmentSummary.replace(/Classified as THE /i, 'Classified as ');
                  if (!assessmentSummary) {
                    assessmentSummary = `Classified as ${displayArchetype} based on comprehensive repository analysis, code quality patterns, and development activity.`;
                  }

                  // Dynamic Stats configuration
                  const statsList = [];
                  statsList.push({ label: 'Repos', value: totalRepos });
                  statsList.push({ label: 'Commits', value: totalCommits });
                  statsList.push({ label: 'Languages', value: languages.length });
                  statsList.push({ label: 'Stars', value: totalStars });

                  return (
                    <div id="vibe-card-template" style={{
                      position: 'fixed',
                      left: '-9999px',
                      top: 0,
                      width: '595px',
                      minHeight: '842px',
                      background: colors.white,
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      color: colors.slate700,
                      boxSizing: 'border-box',
                      lineHeight: 1.5
                    }
                    }>
                      {/* === HEADER === */}
                      < div style={{
                        padding: '40px 48px 32px',
                        borderBottom: `1px solid ${colors.slate100}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
                          {/* Profile Photo */}
                          <div style={{
                            width: '88px',
                            height: '88px',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                          }}>
                            <img
                              src={avatar}
                              crossOrigin="anonymous"
                              alt={candidateName}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.currentTarget.style.background = colors.slate100; }}
                            />
                          </div>

                          {/* Name & Classification */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' }}>
                              <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.slate900, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                                {candidateName}
                              </h1>
                              {/* Archetype Badge */}
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                background: colors.tealBg,
                                border: `1px solid ${colors.teal}30`,
                                borderRadius: '8px',
                                padding: '6px 12px',
                                flexShrink: 0
                              }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: colors.teal, letterSpacing: '0.5px' }}>
                                  {displayArchetype.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            {/* Contact Links */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', fontSize: '13px', color: colors.slate500 }}>
                              {handle && <a href={`https://github.com/${handle}`} target="_blank" rel="noopener noreferrer" style={{ color: colors.teal, fontWeight: 500, textDecoration: 'none' }}>GitHub</a>}
                              {linkedinUrl && <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: colors.teal, fontWeight: 500, textDecoration: 'none' }}>LinkedIn</a>}
                              {/* Email removed from PDF for cleaner display */}
                            </div>
                          </div>

                          {/* Vibechekk Branding */}
                          <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '100px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: colors.slate400, whiteSpace: 'nowrap' }}>Vibechekk</div>
                            <div style={{ fontSize: '11px', color: colors.slate400, marginTop: '2px' }}>Technical Assessment</div>
                          </div>
                        </div>
                      </div>

                      {/* === CONTENT === */}
                      <div style={{ padding: '32px 48px' }}>

                        {/* Stats Row */}
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                          {statsList.map((stat, i) => (
                            <div key={i} style={{ flex: 1, background: colors.slate50, borderRadius: '12px', padding: '16px 8px', textAlign: 'center' }}>
                              <div style={{ fontSize: '24px', fontWeight: 700, color: colors.slate900 }}>{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</div>
                              <div style={{ fontSize: '10px', fontWeight: 600, color: colors.slate500, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{stat.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Technical Skills */}
                        <div style={{ marginBottom: '32px' }}>
                          <h2 style={{ fontSize: '11px', fontWeight: 700, color: colors.teal, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px 0' }}>Technical Skills</h2>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {languages.slice(0, 8).map((lang: string, i: number) => (
                              <span key={`lang-${i}`} style={{ background: colors.teal, color: colors.white, padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{lang}</span>
                            ))}
                            {verifiedSkills.slice(0, 8).map((skill: any, i: number) => {
                              const skillName = typeof skill === 'string' ? skill.split('|')[0] : (skill.name || 'Skill');
                              const isDup = languages.some((l: string) => l.toLowerCase() === skillName.toLowerCase());
                              if (isDup) return null;
                              return <span key={`skill-${i}`} style={{ background: colors.white, color: colors.slate700, padding: '5px 13px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, border: `1px solid ${colors.slate300}` }}>{skillName}</span>;
                            })}
                          </div>
                        </div>

                        {/* Executive Summary */}
                        <div style={{ marginBottom: '32px' }}>
                          <h2 style={{ fontSize: '11px', fontWeight: 700, color: colors.teal, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px 0' }}>Executive Summary</h2>
                          <div style={{ background: colors.slate50, borderRadius: '12px', padding: '20px 24px', borderLeft: `4px solid ${colors.teal}`, fontSize: '14px', color: colors.slate700, lineHeight: 1.7 }}>
                            {assessmentSummary}
                          </div>
                        </div>

                        {/* Key Strengths */}
                        {meritPoints.length > 0 && (
                          <div style={{ marginBottom: '32px' }}>
                            <h2 style={{ fontSize: '11px', fontWeight: 700, color: colors.teal, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px 0' }}>Key Strengths</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              {meritPoints.slice(0, 4).map((point: any, i: number) => (
                                <div key={i} style={{ background: colors.white, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.slate200}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: colors.slate900, marginBottom: '8px', lineHeight: 1.3 }}>
                                    {point.title || (typeof point === 'string' ? point : 'Technical Excellence')}
                                  </div>
                                  {point.detail && (
                                    <div style={{ fontSize: '13px', color: colors.slate500, lineHeight: 1.5 }}>
                                      {point.detail}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* === FOOTER === */}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 48px', borderTop: `1px solid ${colors.slate100}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.white }}>
                        <div style={{ fontSize: '11px', color: colors.slate400 }}>Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                        <div style={{ fontSize: '11px', color: colors.slate400 }}>vibechekk.dev</div>
                      </div>
                    </div>
                  );
                })()}


                <button
                  className="download-card-btn"
                  onClick={async () => {
                    if (!user) {
                      setSelectedReport(null);
                      setActiveTab('settings');
                    } else {
                      const frontElement = document.getElementById('vibe-card-template');
                      if (!frontElement) return;

                      const btn = document.querySelector('.download-card-btn') as HTMLElement;
                      const originalText = btn.innerHTML;
                      btn.innerText = 'GENERATING PDF...';

                      try {
                        // Capture card
                        const frontCanvas = await html2canvas(frontElement, {
                          scale: 2,
                          useCORS: true,
                          backgroundColor: null
                        });

                        // Create Single Page PDF (Dynamic Height)
                        const { jsPDF } = await import('jspdf');
                        const canvasWidth = frontCanvas.width;
                        const canvasHeight = frontCanvas.height;

                        // Fix width to A4 standard (210mm), calculate height dynamically
                        const pdfWidth = 210;
                        const pdfHeight = (canvasHeight * pdfWidth) / canvasWidth;

                        const pdf = new jsPDF({
                          orientation: 'portrait',
                          unit: 'mm',
                          format: [pdfWidth, pdfHeight] // Custom page size matching content exactly
                        });

                        const frontImg = frontCanvas.toDataURL('image/png');
                        pdf.addImage(frontImg, 'PNG', 0, 0, pdfWidth, pdfHeight);

                        // --- Add Clickable Hotspots for Links ---
                        // Coordinate calculation (mm):
                        // Scale Factor = pdfWidth (210) / 595 (CSS px)

                        const k = 210 / 595; // mm per css-pixel
                        const startX = 160 * k; // 56.4mm
                        const linkY = 135 * k; // approx 47.6mm
                        const linkHeight = 6; // clickable height mm

                        // GitHub Link ("GitHub" text is short approx 15mm)
                        if (selectedReport.candidate?.githubHandle) {
                          const linkWidth = 15;
                          pdf.link(startX, linkY, linkWidth, linkHeight, { url: `https://github.com/${selectedReport.candidate.githubHandle}` });
                        }

                        // LinkedIn Link (Starts after gap 16px -> 5.6mm)
                        const gap = 16 * k;
                        const ghWidth = 15; // Width of "GitHub"
                        if (selectedReport.candidate?.linkedinUrl) {
                          const linkWidth = 20; // Width of "LinkedIn"
                          pdf.link(startX + ghWidth + gap, linkY, linkWidth, linkHeight, { url: selectedReport.candidate.linkedinUrl });
                        }

                        const nameParts = (selectedReport.metadata?.userStats?.name || selectedReport.candidate?.name || 'Developer').split(' ');
                        const fileName = `vibechekk - ${nameParts[0]} ${nameParts.slice(1).join(' ')}.pdf`.trim();
                        pdf.save(fileName);

                      } catch (err: any) {
                        console.error('PDF generation failed:', err);
                        console.error('Error stack:', err?.stack);
                        alert(`Failed to generate card: ${err?.message || 'Unknown error'}. Please try again.`);
                      } finally {
                        btn.innerHTML = originalText;
                      }
                    }
                  }}
                >
                  <FileDown size={16} />
                  DOWNLOAD REPORT
                </button>
              </div >
            )


          ) : (
            <>
              {activeTab === 'analyze' && (
                <div className="search-box">
                  <h2 className="section-title" style={{ textAlign: 'center', textTransform: 'uppercase' }}>CHEKK DEV SKILLS</h2>
                  <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '-4px' }}>
                    Analyze code quality & originality from GitHub
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input-field"
                      placeholder="github.com/username or @handle"
                      value={manualUrl}
                      onChange={e => setManualUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && manualUrl && handleManualSearch()}
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      onClick={handleManualSearch}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        padding: '4px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--text-dim)'
                      }}
                      title="New Analysis"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                  <button className="primary-btn" onClick={handleManualSearch} disabled={!manualUrl} style={{ minHeight: '44px' }}>
                    {manualUrl ? 'RUN' : (pendingHandles.length > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <Clock size={16} className="spin" />
                        <span>
                          {pendingHandles.length === 1 ? (
                            loadingStep === 1 ? 'FETCHING PROFILE...' :
                              loadingStep === 2 ? 'LOCATING TOP REPOS...' :
                                loadingStep === 3 ? 'ANALYZING CODE STRUCTURE...' :
                                  loadingStep === 4 ? 'CHECKING ORIGINALITY...' :
                                    loadingStep === 5 ? 'EXTRACTING EVIDENCE...' :
                                      loadingStep === 6 ? 'GENERATING IMPACT ANALYSIS...' :
                                        'FINALIZING REPORT...'
                          ) : `PROCESSING ${pendingHandles.length} PROFILES...`}
                        </span>
                      </div>
                    ) : 'RUN')}
                  </button>
                  {/* Only show usage limits and upgrade prompts for non-PRO users */}
                  {user?.tier !== 'PRO' && (
                    <>
                      <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.5px' }}>
                        {usageInfo ? (
                          usageInfo.used >= usageInfo.limit ? (
                            <span style={{ color: '#dc2626' }}>NO CHEKKS LEFT - {user ? 'UPGRADE TO PRO' : 'SIGN IN FOR MORE'}</span>
                          ) : (
                            `${usageInfo.limit - usageInfo.used} FREE CHEKK${usageInfo.limit - usageInfo.used !== 1 ? 'S' : ''} LEFT THIS WEEK`
                          )
                        ) : '2 FREE CHEKKS REMAINING'}
                      </div>
                      <div className="referral-card" style={{
                        marginTop: '24px',
                        padding: '20px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #451a03 0%, #2a1005 100%)',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(69, 26, 3, 0.25)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {/* Decorative circles like the purple card */}
                        <div style={{
                          position: 'absolute',
                          top: '-40px',
                          right: '-40px',
                          width: '120px',
                          height: '120px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.1)'
                        }} />
                        <div style={{
                          position: 'absolute',
                          bottom: '-20px',
                          left: '-20px',
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.05)'
                        }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                          <Zap size={15} fill="white" style={{ position: 'relative', top: '-0.5px' }} />
                          <span style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1 }}>Get Unlimited Chekks for Free</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.5', fontWeight: 500, opacity: 0.9, position: 'relative' }}>
                          Refer 3 friends and get unlimited chekks for one week free if they each run at least one chekk.
                        </p>
                        <button className="primary-btn" style={{
                          marginTop: '8px',
                          background: 'white',
                          color: 'var(--accent)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0 16px',
                          height: '34px',
                          fontSize: '11px',
                          fontWeight: 800,
                          justifyContent: 'center',
                          position: 'relative'
                        }}
                          onClick={() => {
                            setActiveTab('settings');
                            if (user) {
                              setShowInviteModal(true);
                            }
                          }}
                        >
                          INVITE FRIENDS
                        </button>
                      </div>

                      <button className="primary-btn" style={{
                        marginTop: '24px',
                        background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
                        color: 'white',
                        border: 'none',
                        fontSize: '13px',
                        height: '52px',
                        fontWeight: 800,
                        letterSpacing: '1px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%'
                      }}
                        onClick={handleUpgradeToPro}
                      >
                        UPGRADE FOR UNLIMITED CHEKKS
                      </button>

                    </>
                  )
                  }

                  {
                    user?.tier === 'PRO' && (
                      <div style={{ marginTop: '20px' }}>
                        {proFeaturesContent}
                      </div>
                    )
                  }

                </div>
              )}

              {activeTab === 'history' && (
                <div className="history-list">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '10px', color: 'var(--text-main)', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {archetypeFilter ? pluralizeArchetype(archetypeFilter) : 'History'}
                    </h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {archetypeFilter && (
                        <button
                          onClick={() => setArchetypeFilter(null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'uppercase'
                          }}
                        >
                          Clear Filter
                        </button>
                      )}
                      {history.length > 0 && (
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setShowClearDropdown(!showClearDropdown)}
                            style={{
                              background: 'var(--bg-gray)',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              color: 'var(--text-dim)',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textTransform: 'uppercase',
                              padding: '4px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Trash2 size={12} />
                            Clear
                            <ChevronDown size={10} style={{ transform: showClearDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                          </button>
                          {showClearDropdown && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              marginTop: '4px',
                              background: 'white',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              zIndex: 100,
                              minWidth: '140px',
                              overflow: 'hidden'
                            }}>
                              <button
                                onClick={async () => {
                                  try {
                                    await fetch(`${BACKEND_URL}/api/history/clear-ghosts`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ userId: user?.id })
                                    });
                                    fetchHistory();
                                    setShowClearDropdown(false);
                                  } catch (e) {
                                    console.error('Failed to clear ghosts:', e);
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: 'var(--text-main)',
                                  textAlign: 'left'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-gray)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                              >
                                <Ghost size={14} />
                                Clear Ghosts
                              </button>
                              <div style={{ height: '1px', background: 'var(--border)' }} />
                              <button
                                onClick={async () => {
                                  if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
                                    try {
                                      await fetch(`${BACKEND_URL}/api/history/clear`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: user?.id })
                                      });
                                      setHistory([]);
                                      setShowClearDropdown(false);
                                    } catch (e) {
                                      console.error('Failed to clear history:', e);
                                    }
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: '#ef4444',
                                  textAlign: 'left'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                              >
                                <Trash2 size={14} />
                                Clear All
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {(() => {
                    const filteredHistory = archetypeFilter
                      ? history.filter((item: any) => item.label?.toUpperCase() === archetypeFilter.toUpperCase())
                      : history;

                    // Get handles that already have results in history
                    const completedHandles = new Set(history.map((item: any) =>
                      (item.candidate?.githubHandle || item.githubHandle || '').toLowerCase()
                    ));

                    // Combine BOTH manual (pendingHandles) and autochekk (pendingAnalyses) into one list
                    const allPending = [
                      ...pendingHandles.map(h => ({ handle: h, name: undefined as string | undefined, avatar: '', timestamp: Date.now() })),
                      ...pendingAnalyses
                    ];

                    // Filter out skeleton cards ONLY if the handle is fully processed and in history
                    // If it's pending, we should show the loader even if a past result exists (re-analysis case)
                    // But standard logic is: if in history, don't show pending. 
                    // Let's refine: Show pending if it's NOT in filtered history.
                    const activePending = allPending.filter(p => true); // Show all pending states for now to debug visibility

                    // Actually, let's stick to the filter but ensure it's case-insensitive and robust
                    // const activePending = allPending.filter(p => !completedHandles.has(p.handle?.toLowerCase()));

                    // Skeleton cards for pending analyses (only those not in history yet)
                    const skeletonCards = activePending.map((pending, i) => (
                      <div key={`pending-${pending.handle}-${i}`} className="history-item" style={{ opacity: 0.8, animation: 'pulse 1.5s infinite' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                          {pending.handle ? (
                            <img
                              src={`https://github.com/${pending.handle}.png?size=40`}
                              alt={pending.handle}
                              className="history-avatar"
                              style={{ opacity: 0.7 }}
                            />
                          ) : (
                            <div className="history-avatar-placeholder">
                              <Loader2 size={20} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
                            </div>
                          )}
                          <div className="history-meta">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="history-name">{pending.handle || 'Analyzing...'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Loader2 size={12} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
                              <div style={{
                                background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-gray) 50%, var(--border) 75%)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 1.5s infinite',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '10px',
                                color: 'var(--text-dim)'
                              }}>
                                ANALYZING...
                              </div>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={14} color="var(--text-dim)" />
                      </div>
                    ));

                    if (filteredHistory.length === 0 && pendingHandles.length === 0 && pendingAnalyses.length === 0) {
                      return (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '40px 20px',
                          textAlign: 'center',
                          color: 'var(--text-dim)',
                          background: 'white',
                          borderRadius: '16px',
                          border: '2px dashed var(--border)'
                        }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'var(--bg-gray)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '12px'
                          }}>
                            <Ghost size={24} color="var(--primary)" />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                            {archetypeFilter ? `No ${archetypeFilter} profiles found.` : 'No chekks yet!'}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            Search for a GitHub handle above to see results here.
                          </span>
                        </div>
                      );
                    }

                    const historyCards = filteredHistory.map((item: any, i: number) => {
                      const handle = item.candidate?.githubHandle || item.githubHandle || '';
                      return (
                        <div key={i} className={`history-item ${getRarityClass(item.rarity)}`} onClick={() => handleOpenReport(item)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                            {handle ? (
                              <img
                                src={`https://github.com/${handle}.png?size=40`}
                                alt={handle}
                                className="history-avatar"
                              />
                            ) : (
                              <div className="history-avatar-placeholder">
                                <User size={20} color="var(--text-dim)" />
                              </div>
                            )}
                            <div className="history-meta">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="history-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {item.metadata?.userStats?.name || item.candidate?.name || handle || 'Guest Profile'}
                                  {item.metadata?.claimed && <BadgeCheck size={12} color="#059669" fill="#d1fae5" />}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ArchetypeIcon label={item.label || item.archetype || 'Profile'} rarity={item.rarity || item.tier || getRarityFromLabel(item.label || item.archetype)} size={12} />
                                <div style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  letterSpacing: '0.5px',
                                  textTransform: 'uppercase',
                                  color: getRarityColor(item.rarity || item.tier, item.label || item.archetype),
                                  background: `${getRarityColor(item.rarity || item.tier, item.label || item.archetype)}15`,
                                  border: `1px solid ${getRarityColor(item.rarity || item.tier, item.label || item.archetype)}30`
                                }}>
                                  {stripThe(item.label || item.archetype) || 'Profile'}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="history-action-icon">
                            <ChevronRight size={16} color="var(--text-dim)" strokeWidth={2.5} />
                          </div>
                        </div>
                      );
                    });

                    return <>{skeletonCards}{historyCards}</>;
                  })()}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="analytics-view">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h2 style={{ fontSize: '10px', color: 'var(--text-main)', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Analytics
                      </h2>
                    </div>
                  </div>

                  {analyticsLoading ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '200px',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <Loader2 size={24} className="spin" color="var(--accent)" />
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.5px' }}>LOADING...</span>
                    </div>
                  ) : analytics ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div className="stat-card hero" style={{ padding: '20px', background: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <div className="stat-value" style={{ fontSize: '38px' }}>
                            {tierFilter ? analytics.filteredTotal : analytics.totalChecks}
                          </div>
                          <TrendingUp size={16} color="var(--accent)" strokeWidth={3} style={{ marginBottom: '4px' }} />
                        </div>
                        <div className="stat-label" style={{ opacity: 0.7 }}>
                          {tierFilter ? `${tierFilter} PROFILES` : 'GITHUB PROFILES PROCESSED'}
                        </div>
                      </div>

                      <div className="filter-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h3 className="section-title" style={{ fontSize: '10px', marginBottom: 0 }}>FILTER BY TIER</h3>
                          {tierFilter && (
                            <button
                              onClick={() => setTierFilter(null)}
                              style={{ background: 'none', border: 'none', padding: 0, fontSize: '10px', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }}
                            >
                              CLEAR
                            </button>
                          )}
                        </div>
                        <div className="tier-filter-container">
                          {[
                            { name: 'LEGENDARY', color: '#d97706' },
                            { name: 'ULTRA RARE', color: '#7c3aed' },
                            { name: 'RARE', color: '#0891b2' },
                            { name: 'UNCOMMON', color: '#059669' },
                            { name: 'COMMON', color: '#6b7280' }
                          ].map(tier => {
                            const isActive = tierFilter === tier.name;
                            const count = analytics.tierBreakdown?.[tier.name] || 0;
                            return (
                              <button
                                key={tier.name}
                                className={`tier-filter-btn ${isActive ? 'active' : ''}`}
                                onClick={() => setTierFilter(isActive ? null : tier.name)}
                                style={isActive ? {
                                  color: 'white',
                                  background: tier.color,
                                  borderColor: tier.color
                                } : undefined}
                              >
                                {tier.name}
                                <span className="count">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="detail-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h3 className="section-title" style={{ fontSize: '10px', marginBottom: 0 }}>
                            {tierFilter ? `${tierFilter} DISTRIBUTION` : 'PROFILE DISTRIBUTION'}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '9px', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.05em' }}>BY ARCHETYPE</span>
                            {!user && <Lock size={10} color="var(--text-dim)" strokeWidth={3} />}
                          </div>
                        </div>

                        <div className={`locked-container ${!user ? 'locked' : ''}`}>
                          <div className="history-list" style={{ gap: '10px', pointerEvents: !user ? 'none' : 'auto' }}>
                            {Object.entries(analytics.distribution).length > 0 ? (
                              Object.entries(analytics.distribution)
                                .sort(([, a]: any, [, b]: any) => b - a)
                                .map(([arch, count]: any) => {
                                  const baseTotal = tierFilter ? analytics.filteredTotal : analytics.totalChecks;
                                  const percentage = Math.round((count / Math.max(baseTotal, 1)) * 100);
                                  return (
                                    <div
                                      key={arch}
                                      className="stat-card compact"
                                      style={{ background: 'white' }}
                                    >
                                      <div className="stat-info">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          <div className="archetype-icon-small">
                                            <ArchetypeIcon label={arch} size={14} />
                                          </div>
                                          <span className="stat-arch-name">{pluralizeArchetype(arch)}</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                          <span className="stat-count" style={{ display: 'block' }}>{count} {count === 1 ? 'profile' : 'profiles'}</span>
                                          <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 800 }}>{percentage}%</span>
                                        </div>
                                      </div>
                                      <div className="percentage-bar-bg" style={{ height: '4px' }}>
                                        <div
                                          className="percentage-bar-fill"
                                          style={{
                                            width: `${percentage}%`,
                                            background: percentage > 1 ? 'var(--accent)' : 'var(--border)',
                                            borderRadius: '2px'
                                          }}
                                        ></div>
                                      </div>
                                    </div>
                                  );
                                })
                            ) : (
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '48px 24px',
                                textAlign: 'center',
                                gap: '16px'
                              }}>
                                <div style={{
                                  width: '64px',
                                  height: '64px',
                                  borderRadius: '20px',
                                  background: 'linear-gradient(135deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.06) 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '1px dashed var(--border)'
                                }}>
                                  <Search size={28} color="var(--text-dim)" strokeWidth={1.5} style={{ opacity: 0.5 }} />
                                </div>
                                <div>
                                  <p style={{
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: 'var(--text-main)',
                                    margin: '0 0 6px 0',
                                    letterSpacing: '-0.01em'
                                  }}>
                                    No {tierFilter || 'profiles'} discovered yet
                                  </p>
                                  <p style={{
                                    fontSize: '11px',
                                    color: 'var(--text-dim)',
                                    margin: 0,
                                    fontWeight: 500,
                                    lineHeight: 1.5
                                  }}>
                                    Run analyses to populate your pipeline
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {!user && !authLoading && (
                            <div className="paywall-overlay">
                              <div className="paywall-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                <div style={{ marginBottom: '16px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 700, opacity: 0.5, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                    Unlock Full Pipeline Intelligence
                                  </span>
                                </div>
                                <button className="paywall-btn" onClick={() => setActiveTab('settings')}>
                                  <Lock size={14} strokeWidth={3} />
                                  <span>Sign in to Unlock</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="stat-card empty">
                      <p className="footer-info">Connect your ATS to view real-time data trends.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="settings-scroll-container">
                  <div className="settings-group">
                    <h2 style={{ fontSize: '10px', color: 'var(--text-main)', fontWeight: 600, margin: 0, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user ? 'Settings' : 'AUTHENTICATION REQUIRED'}</h2>
                    {user ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Account Card */}
                        <div style={{
                          background: 'white',
                          borderRadius: '16px',
                          padding: '16px',
                          border: '1px solid rgba(0,0,0,0.05)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          {/* Decorative background element */}
                          <div style={{
                            position: 'absolute',
                            top: '-10%',
                            right: '-5%',
                            width: '120px',
                            height: '120px',
                            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(196, 114, 30, 0.05) 100%)',
                            borderRadius: '50%',
                            filter: 'blur(20px)',
                            zIndex: 0
                          }} />

                          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', position: 'relative', zIndex: 1 }}>
                            {user.picture ? (
                              <div style={{ position: 'relative' }}>
                                <img
                                  src={user.picture}
                                  alt={user.name}
                                  style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '22px',
                                    objectFit: 'cover',
                                    border: '2px solid white',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                                  }}
                                />
                                <div style={{
                                  position: 'absolute',
                                  bottom: '2px',
                                  right: '2px',
                                  width: '14px',
                                  height: '14px',
                                  background: '#10b981',
                                  border: '2.5px solid white',
                                  borderRadius: '50%',
                                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                                }} />
                              </div>
                            ) : (
                              <div style={{ position: 'relative' }}>
                                <div style={{
                                  width: '64px',
                                  height: '64px',
                                  borderRadius: '22px',
                                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 10px 25px rgba(124, 58, 237, 0.25)',
                                  color: 'white',
                                  fontSize: '26px',
                                  fontWeight: 800,
                                  position: 'relative',
                                  overflow: 'hidden'
                                }}>
                                  {/* Inner glow/mesh effect */}
                                  <div style={{
                                    position: 'absolute',
                                    top: '-20%',
                                    left: '-20%',
                                    width: '140%',
                                    height: '140%',
                                    background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 70%)',
                                    zIndex: 1
                                  }} />
                                  <span style={{ position: 'relative', zIndex: 2 }}>
                                    {user.name ? user.name.charAt(0).toUpperCase() : <User size={28} />}
                                  </span>
                                </div>
                                <div style={{
                                  position: 'absolute',
                                  bottom: '2px',
                                  right: '2px',
                                  width: '14px',
                                  height: '14px',
                                  background: '#10b981',
                                  border: '2.5px solid white',
                                  borderRadius: '50%',
                                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                                }} />
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                <h3 style={{
                                  fontSize: '18px',
                                  fontWeight: 800,
                                  margin: 0,
                                  color: '#1a1a1a',
                                  letterSpacing: '-0.02em',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {user.name ? user.name.split(' ')[0] : 'User'}
                                </h3>
                              </div>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '4px',
                                width: 'fit-content',
                                padding: '3px 8px',
                                background: user.tier === 'PRO'
                                  ? 'rgba(245, 158, 11, 0.1)'
                                  : 'rgba(124, 58, 237, 0.08)',
                                borderRadius: '6px',
                                border: user.tier === 'PRO'
                                  ? '1px solid rgba(245, 158, 11, 0.2)'
                                  : '1px solid rgba(124, 58, 237, 0.1)'
                              }}>
                                <BadgeCheck
                                  size={10}
                                  color={user.tier === 'PRO' ? '#b45309' : '#7c3aed'}
                                  strokeWidth={2.5}
                                />
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  color: user.tier === 'PRO' ? '#b45309' : '#7c3aed',
                                  letterSpacing: '0.04em'
                                }}>
                                  AUTHENTICATED
                                </span>
                              </div>
                            </div>
                          </div>


                        </div>

                        {/* Attributes hidden for PRO users as they are on search page */}
                        {user?.tier !== 'PRO' && proFeaturesContent}

                        {/* Authentication Perks */}
                        <div style={{
                          background: 'white',
                          borderRadius: '16px',
                          padding: '20px',
                          border: '1px solid var(--border)'
                        }}>
                          <h4 style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: 'var(--text-dim)',
                            margin: '0 0 16px 0',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase'
                          }}>
                            Authentication Perks
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* Pipeline Analytics */}
                            <button
                              onClick={() => { setActiveTab('analytics'); }}
                              style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <TrendingUp size={18} color="#10b981" strokeWidth={2} />
                              </div>
                              <div style={{ textAlign: 'left', flex: 1 }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, display: 'block', color: 'var(--text-main)' }}>
                                  Pipeline Analytics
                                </span>
                                <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 500 }}>
                                  View trends and archetypes
                                </span>
                              </div>
                              <ChevronRight size={18} color="var(--text-dim)" />
                            </button>

                            {/* Get Free Chekks */}
                            <button
                              onClick={() => setShowInviteModal(true)}
                              style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(196, 114, 30, 0.08) 0%, rgba(180, 83, 9, 0.04) 100%)',
                                border: '1px solid rgba(196, 114, 30, 0.2)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'rgba(196, 114, 30, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <Heart size={18} color="var(--accent)" strokeWidth={2} />
                              </div>
                              <div style={{ textAlign: 'left', flex: 1 }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, display: 'block', color: 'var(--text-main)' }}>
                                  Get Free Chekks
                                </span>
                                <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 500 }}>
                                  Invite friends, earn +5 per signup
                                </span>
                              </div>
                              <ChevronRight size={18} color="var(--text-dim)" />
                            </button>

                            {/* Claim Github */}
                            <div style={{ position: 'relative' }}>
                              <button
                                onClick={() => {
                                  if (!githubLinked) {
                                    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || 'PLACEHOLDER';
                                    window.open(`https://github.com/login/oauth/authorize?client_id=${clientId}`, '_blank');
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '14px 16px',
                                  borderRadius: '14px',
                                  background: githubLinked ? 'rgba(71, 85, 105, 0.12)' : 'rgba(36, 41, 46, 0.03)',
                                  border: githubLinked ? '1px solid rgba(71, 85, 105, 0.4)' : '1px solid rgba(36, 41, 46, 0.1)',
                                  cursor: githubLinked ? 'default' : 'pointer',
                                  width: '100%',
                                  transition: 'all 0.2s ease',
                                  outline: 'none'
                                }}
                              >
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '10px',
                                  background: githubLinked ? 'rgba(71, 85, 105, 0.25)' : 'rgba(36, 41, 46, 0.1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {githubLinked ? (
                                    <BadgeCheck size={18} color="#475569" strokeWidth={2} />
                                  ) : (
                                    <Code size={18} color="#24292e" strokeWidth={2} />
                                  )}
                                </div>
                                <div style={{ textAlign: 'left', flex: 1 }}>
                                  <span style={{ fontSize: '13px', fontWeight: 700, display: 'block', color: 'var(--text-main)' }}>
                                    {githubLinked ? 'GitHub Claimed' : 'Claim Github'}
                                  </span>
                                  {githubLinked ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        chrome.storage.local.remove(['auth_token'], () => {
                                          setGithubLinked(false);
                                          setGithubUsername(null);
                                        });
                                      }}
                                      style={{
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: '#18181b',
                                        border: '1px solid #27272a',
                                        cursor: 'pointer',
                                        fontSize: '9px',
                                        fontWeight: 700,
                                        color: 'white',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.3px',
                                        lineHeight: 1.2,
                                        marginTop: '4px'
                                      }}
                                    >
                                      Unclaim
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 500 }}>
                                      Boost reports with private repos
                                    </span>
                                  )}
                                </div>
                                {githubLinked ? (
                                  <div
                                    className="github-info-tooltip"
                                    style={{
                                      position: 'relative',
                                      cursor: 'help',
                                      opacity: 0.5,
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <Info size={18} color="var(--text-dim)" strokeWidth={2} />
                                    <div
                                      className="tooltip-content"
                                      style={{
                                        position: 'absolute',
                                        bottom: '100%',
                                        right: '0',
                                        marginBottom: '6px',
                                        padding: '6px 10px',
                                        background: '#18181b',
                                        color: 'white',
                                        fontSize: '11px',
                                        fontWeight: 500,
                                        borderRadius: '6px',
                                        whiteSpace: 'nowrap',
                                        opacity: 0,
                                        visibility: 'hidden',
                                        transition: 'opacity 0.15s ease, visibility 0.15s ease',
                                        pointerEvents: 'none',
                                        zIndex: 100
                                      }}
                                    >
                                      @{githubUsername || 'your account'}
                                    </div>
                                    <style>{`
                                    .github-info-tooltip:hover .tooltip-content {
                                      opacity: 1 !important;
                                      visibility: visible !important;
                                    }
                                  `}</style>
                                  </div>
                                ) : (
                                  <ChevronRight size={18} color="var(--text-dim)" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Upgrade to Pro Card */}
                        {user.tier !== 'PRO' && (
                          <div style={{
                            background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                            borderRadius: '16px',
                            padding: '24px',
                            color: 'white',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            {/* Decorative circle */}
                            <div style={{
                              position: 'absolute',
                              top: '-30px',
                              right: '-30px',
                              width: '120px',
                              height: '120px',
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.1)'
                            }} />

                            <div style={{ marginBottom: '16px' }}>
                              <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0', letterSpacing: '-0.01em' }}>
                                Upgrade to <span style={{
                                  padding: '2px 6px',
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  color: '#1a1a1a',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 900,
                                  letterSpacing: '0.05em',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginLeft: '6px',
                                  boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)',
                                  verticalAlign: 'middle',
                                  transform: 'translateY(-1px)'
                                }}>PRO</span>
                              </h4>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                                <BadgeCheck size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                                <div>
                                  <span style={{ fontSize: '12px', fontWeight: 800, display: 'block', letterSpacing: '0.05em' }}>UNLIMITED</span>
                                  <span style={{ fontSize: '10px', opacity: 0.75 }}>No chekk limits, analyze your entire ATS</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                                <Binoculars size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                                <div>
                                  <span style={{ fontSize: '12px', fontWeight: 700, display: 'block' }}>AUTOCHEKK</span>
                                  <span style={{ fontSize: '10px', opacity: 0.75 }}>Scan for Github profiles as you browse</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                                <ClipboardList size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                                <div>
                                  <span style={{ fontSize: '12px', fontWeight: 700, display: 'block' }}>CHEKKLIST</span>
                                  <span style={{ fontSize: '10px', opacity: 0.75 }}>Find 50 devs matched to your JD</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <FileSpreadsheet size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                                <div>
                                  <span style={{ fontSize: '12px', fontWeight: 700, display: 'block' }}>BULKCHEKK</span>
                                  <span style={{ fontSize: '10px', opacity: 0.75 }}>Analyze hundreds of profiles from CSV</span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={handleUpgradeToPro}
                              style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '10px',
                                background: 'white',
                                color: '#7c3aed',
                                fontSize: '12px',
                                fontWeight: 800,
                                border: 'none',
                                cursor: 'pointer',
                                letterSpacing: '0.03em'
                              }}
                            >
                              UPGRADE NOW
                            </button>
                          </div>
                        )}

                        {/* Sign Out Button */}
                        <button
                          onClick={logout}
                          style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            background: 'linear-gradient(180deg, #c2410c 0%, #9a3412 100%)',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1), 0 8px 20px -4px rgba(154, 52, 18, 0.3)',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            marginTop: '24px',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.filter = 'brightness(1.1)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1), 0 12px 24px -4px rgba(154, 52, 18, 0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.filter = 'none';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1), 0 8px 20px -4px rgba(154, 52, 18, 0.3)';
                          }}
                        >
                          <LogOut size={16} strokeWidth={2.2} />
                          SIGN OUT
                        </button>

                        {/* Admin-only Danger Zone - Only for timidayokayode@gmail.com */}
                        {user?.email === 'timidayokayode@gmail.com' && (
                          <div style={{ marginTop: '24px', marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Shield size={12} /> Admin Zone
                            </h4>

                            {/* Tier Toggle for Testing */}
                            <div style={{
                              padding: '12px',
                              borderRadius: '10px',
                              background: 'rgba(34, 197, 94, 0.05)',
                              border: '1px solid rgba(34, 197, 94, 0.15)',
                              marginBottom: '12px'
                            }}>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>
                                Test Tier Override
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {(['AUTHENTICATED', 'PRO'] as const).map((tier) => (
                                  <button
                                    key={tier}
                                    onClick={async () => {
                                      // Update local user state
                                      const newUser = { ...user, tier, usageCount: 0 };
                                      setUser(newUser);
                                      // Update chrome storage
                                      chrome.storage.local.set({ user_data: newUser });
                                      // Also update backend tier (for persistent testing)
                                      try {
                                        await fetch(`${BACKEND_URL}/api/admin/set-tier`, {
                                          method: 'POST',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${tokens.vibeToken}`
                                          },
                                          body: JSON.stringify({ tier, resetUsage: true })
                                        });
                                      } catch (e) {
                                        console.log('Admin tier set (local only)');
                                      }
                                      // Update usage info - reset to 0 used
                                      const tierLimits: Record<string, number> = { AUTHENTICATED: 3, PRO: Infinity };
                                      setUsageInfo({ used: 0, limit: tierLimits[tier], tier, resetTime: 'weekly' });
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: '8px',
                                      borderRadius: '6px',
                                      background: user?.tier === tier
                                        ? tier === 'PRO' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                          : 'var(--accent)'
                                        : 'rgba(0,0,0,0.05)',
                                      color: user?.tier === tier ? 'white' : 'var(--text-dim)',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      border: 'none',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    {tier}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Clear Cache Button */}
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to clear all local data (history, caches, login)? This cannot be undone.')) {
                                  chrome.storage.local.clear(() => {
                                    window.location.reload();
                                  });
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                background: 'rgba(239, 68, 68, 0.05)',
                                color: '#ef4444',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: '1px solid rgba(239, 68, 68, 0.15)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                            >
                              <Trash size={14} />
                              Clear Local Cache
                            </button>
                          </div>
                        )}


                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <button
                          onClick={() => handleGoogleLogin()}
                          disabled={isLoggingIn}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            background: 'white',
                            color: '#3c4043',
                            fontSize: '13px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)',
                            border: '1px solid #dadce0'
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 18 18">
                            <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.25h2.91c1.7-1.56 2.68-3.86 2.68-6.6z" />
                            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.25c-.81.54-1.85.87-3.05.87-2.34 0-4.33-1.58-5.03-3.71H.95v2.3C2.43 15.89 5.5 18 9 18z" />
                            <path fill="#FBBC05" d="M3.97 10.73c-.18-.54-.28-1.12-.28-1.73s.1-1.19.28-1.73V4.97H.95C.35 6.19 0 7.56 0 9s.35 2.81.95 4.03l3.02-2.3z" />
                            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 5.5 0 2.43 2.11.95 5.03L3.97 7.33C4.67 5.2 6.66 3.58 9 3.58z" />
                          </svg>
                          {isLoggingIn ? 'SIGNING IN...' : 'CONTINUE WITH GOOGLE'}
                        </button>

                        <div className="benefits-scroll-container" style={{ marginTop: '6px' }}>
                          <div className="benefits-scroll-track">
                            {[
                              'Invite friends',
                              'Save history',
                              'See trends',
                              'Full analytics',
                              'Connect ATS',
                              'Claim profile',
                              'Invite friends',
                              'Save history',
                              'See trends',
                              'Full analytics',
                              'Connect ATS',
                              'Claim profile'
                            ].map((text, i) => (
                              <span key={i} className="benefit-tag">
                                <BadgeCheck size={12} color="var(--accent)" strokeWidth={2.5} />
                                {text}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Tier Showcase */}
                        <div className="tier-showcase" style={{
                          marginTop: '80px',
                          padding: '16px 0'
                        }}>
                          <p style={{
                            fontSize: '9px',
                            color: 'var(--text-dim)',
                            margin: '0 0 14px 0',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            textAlign: 'center'
                          }}>DEV RARITY TIERS</p>

                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                            justifyContent: 'center'
                          }}>
                            {[
                              { name: 'LEGENDARY', color: '#d97706', glow: 'rgba(180, 83, 9, 0.3)' },
                              { name: 'ULTRA RARE', color: '#7c3aed', glow: 'rgba(124, 58, 237, 0.25)' },
                              { name: 'RARE', color: '#0891b2', glow: 'rgba(8, 145, 178, 0.2)' },
                              { name: 'UNCOMMON', color: '#059669', glow: 'rgba(5, 150, 105, 0.2)' },
                              { name: 'COMMON', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.15)' }
                            ].map((tier) => (
                              <div
                                key={tier.name}
                                className="tier-showcase-badge"
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  background: `linear-gradient(135deg, ${tier.color}15 0%, ${tier.color}08 100%)`,
                                  border: `1px solid ${tier.color}20`,
                                  boxShadow: `0 2px 8px ${tier.glow}`,
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  color: tier.color,
                                  letterSpacing: '0.05em',
                                  cursor: 'default',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                {tier.name}
                              </div>
                            ))}
                          </div>

                          <p style={{
                            fontSize: '11px',
                            color: 'var(--text-dim)',
                            margin: '14px 0 0 0',
                            textAlign: 'center',
                            fontWeight: 500
                          }}>
                            Discover where your searches rank
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </>
          )
          }
        </main>

        {/* Invite Friends Modal */}
        {
          showInviteModal && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
              }}
              onClick={() => setShowInviteModal(false)}
            >
              <div
                style={{
                  background: 'white',
                  borderRadius: '20px',
                  padding: '28px',
                  maxWidth: '340px',
                  width: '100%',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, var(--accent) 0%, #b45309 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                    boxShadow: '0 8px 24px rgba(196, 114, 30, 0.3)'
                  }}>
                    <Heart size={28} color="white" strokeWidth={2} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-main)' }}>
                    Invite Friends
                  </h3>
                  {user?.tier !== 'PRO' && (
                    <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                      Refer 3 friends who run a chekk and get <strong style={{ color: 'var(--accent)' }}>1 week unlimited</strong>!
                    </p>
                  )}
                  {user?.tier === 'PRO' && (
                    <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                      Share Vibechekk with your network
                    </p>
                  )}
                  {/* Progress bar for non-Pro, Count for Pro */}
                  {referralInfo && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        color: 'var(--text-dim)',
                        marginBottom: '6px'
                      }}>
                        <span>{user?.tier === 'PRO' ? 'Referrals' : 'Progress'}</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                          {user?.tier === 'PRO'
                            ? referralInfo.activeReferrals
                            : `${referralInfo.progressToReward.current}/${referralInfo.progressToReward.target}`
                          }
                        </span>
                      </div>
                      {user?.tier !== 'PRO' && (
                        <div style={{
                          height: '8px',
                          background: 'var(--bg-gray)',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${(referralInfo.progressToReward.current / referralInfo.progressToReward.target) * 100}%`,
                            background: 'linear-gradient(90deg, var(--accent) 0%, #b45309 100%)',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{
                  background: 'var(--bg-gray)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    flex: 1,
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: 'var(--text-main)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {referralInfo?.referralLink?.replace('https://', '') || (user?.id ? `vibechekk.dev/r/${user.id.slice(0, 8)}` : 'Loading...')}
                  </div>
                  <button
                    onClick={() => {
                      const code = referralInfo?.referralCode || user?.id?.slice(0, 8);
                      if (!code) return;
                      const link = `https://vibechekk.dev/r/${code}`;
                      navigator.clipboard.writeText(link);
                      setCopiedId('modal-referral');
                      setTimeout(() => setCopiedId(null), 2000);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--accent)',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {copiedId === 'modal-referral' ? (
                      <><BadgeCheck size={14} /> COPIED</>
                    ) : (
                      <><Copy size={14} /> COPY</>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => setShowInviteModal(false)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'var(--bg-gray)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  CLOSE
                </button>
              </div>
            </div>
          )
        }

        {/* Concurrent Analysis Modal */}
        {
          showConcurrentModal && (
            <div className="modal-overlay" onClick={() => setShowConcurrentModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '320px', position: 'relative' }}>
                <button
                  onClick={() => setShowConcurrentModal(false)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: 'var(--text-dim)'
                  }}
                >
                  <X size={18} />
                </button>

                <div className="modal-body" style={{ textAlign: 'center', padding: '24px 8px 8px 8px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    background: 'rgba(124, 58, 237, 0.1)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto'
                  }}>
                    <Layers size={28} color="var(--accent)" strokeWidth={2} />
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0', color: '#1a1a1a' }}>Run Concurrent Analyses</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5, margin: '0 0 24px 0' }}>
                    Sign in to analyze multiple profiles at once and unlock your full pipeline speed.
                  </p>
                  <button
                    className="primary-btn"
                    onClick={() => {
                      setShowConcurrentModal(false);
                      setActiveTab('settings');
                    }}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Sign In to Unlock
                  </button>
                </div>
              </div>
            </div>
          )
        }
        {/* Limit Reached Paywall Modal */}
        {
          limitPaywallOpen && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.2s ease-out'
            }} onClick={() => setLimitPaywallOpen(false)}>
              <div
                className="paywall-overlay"
                style={{ position: 'relative', width: '100%', maxWidth: '300px', padding: '32px 24px', animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setLimitPaywallOpen(false)}
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px' }}
                >
                  <X size={18} />
                </button>

                <div style={{ marginBottom: '16px', background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '50%', display: 'inline-flex' }}>
                  <Gem size={32} color="#f59e0b" />
                </div>

                <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>Limit Reached</h3>
                <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                  You've hit your free analysis limit. <br />Upgrade to <strong>Pro</strong> for unlimited access.
                </p>

                <button className="paywall-btn" style={{ width: '100%' }} onClick={() => { setLimitPaywallOpen(false); handleUpgradeToPro(); }}>
                  <Zap size={16} fill="white" />
                  Upgrade Now
                </button>
              </div>
            </div>
          )
        }
        {/* Pro Feature Required Paywall Modal */}
        {
          proFeaturePaywallOpen && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.2s ease-out'
            }} onClick={() => setProFeaturePaywallOpen(null)}>
              <div
                className="paywall-overlay"
                style={{ position: 'relative', width: '100%', maxWidth: '300px', padding: '32px 24px', animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setProFeaturePaywallOpen(null)}
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px' }}
                >
                  <X size={18} />
                </button>

                <div style={{ marginBottom: '16px', background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)', padding: '16px', borderRadius: '50%', display: 'inline-flex' }}>
                  <Lock size={32} color="#7c3aed" />
                </div>

                <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>Pro Feature</h3>
                <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                  This feature is exclusive to <strong>Pro</strong> subscribers. Upgrade to unlock <strong>{proFeaturePaywallOpen}</strong> and more features.
                </p>

                <button className="paywall-btn" style={{ width: '100%' }} onClick={() => { setProFeaturePaywallOpen(null); handleUpgradeToPro(); }}>
                  <Zap size={16} fill="white" />
                  Upgrade to Pro
                </button>
              </div>
            </div>
          )
        }
      </div >
    </>
  );
}

export default App;
