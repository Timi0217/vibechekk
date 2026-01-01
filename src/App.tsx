import { useState, useEffect, useRef } from 'react'
import { Clock, Search, TrendingUp, ChevronDown, ChevronRight, ArrowLeft, Copy, AlertTriangle, BadgeCheck, Zap, FileDown, User, BookOpen, Layers, Plus, Loader2, Heart, Star, Hammer, Code, Cpu, Target, GitPullRequest, Gem, Wrench, Rocket, Coffee, Compass, Ghost, Settings, Lock, Info, Binoculars, LogOut, X, Trash, Radio, ClipboardList, Upload, FileSpreadsheet, Shield } from 'lucide-react'
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

// Map archetype labels to their rarity tiers (fallback when rarity not set)
const getRarityFromLabel = (label: string): string => {
  const l = label?.toUpperCase() || '';
  // LEGENDARY tier
  if (l.includes('TITAN') || l.includes('PIONEER') || l.includes('VISIONARY')) return 'LEGENDARY';
  // ULTRA RARE tier
  if (l.includes('ARCHITECT') || l.includes('PRODIGY') || l.includes('SPECIALIST')) return 'ULTRA RARE';
  // RARE tier
  if (l.includes('HIDDEN GEM') || l.includes('MAINTAINER') || l.includes('CONTRIBUTOR')) return 'RARE';
  // UNCOMMON tier
  if (l.includes('BUILDER') || l.includes('CRAFTSPERSON') || l.includes('TINKERER')) return 'UNCOMMON';
  // COMMON tier
  return 'COMMON';
}

const getRarityColor = (rarity: string, label?: string) => {
  // If rarity not set properly, derive from label
  let r = rarity?.toUpperCase();
  if (!r || r === 'UNKNOWN' || r === 'UNDEFINED') {
    r = getRarityFromLabel(label || '');
  }
  if (r === 'LEGENDARY') return '#f59e0b';
  if (r === 'ULTRA RARE') return '#8b5cf6';
  if (r === 'RARE') return '#3b82f6';
  if (r === 'UNCOMMON') return '#10b981';
  return '#64748b';
}

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

const stripThe = (name: string) => {
  if (!name) return name;
  return name.replace(/^THE\s+/i, '');
}

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
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, status: '' })
  const [bulkResults, setBulkResults] = useState<any[]>([])
  const [checklistTab, setChecklistTab] = useState<'configure' | 'active'>('configure')
  const [checklistForm, setChecklistForm] = useState({
    jobTitle: '',
    jd: '',
    experience: '',
    archetypes: [] as string[],
    languages: [] as string[],
    tiers: [] as string[],
    loading: false
  })
  const [activeSearches, setActiveSearches] = useState<any[]>([])
  const [autochekkLogs, setAutochekkLogs] = useState<any[]>([])
  const [pendingAnalyses, setPendingAnalyses] = useState<{ handle: string, name?: string, avatar: string, timestamp: number }[]>([])
  const [githubLinked, setGithubLinked] = useState(false)
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
        setActiveSearches(res.active_searches as any[])
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

            // Simple heuristic to detect if first row is a header
            const firstRow = rows[0].map(c => c.toLowerCase().trim());
            const potentialHeaderIndex = firstRow.findIndex(c =>
              c.includes('username') || c.includes('handle') || c.includes('github') ||
              c.includes('user') || c.includes('email') || c.includes('url')
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
      const response = await fetch(`${BACKEND_URL}/api/lookup/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      for (const email of parsed.emails) {
        const handle = await lookupEmailToHandle(email)
        if (handle) {
          emailResolvedHandles.push(handle)
        }
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

    // 2. CHECK HISTORY (Prevent Duplicates) - DISABLED FOR QA/TESTING
    // The user wants to see the analysis run after flushing the DB.
    // Client-side caching prevents this. Letting it hit the backend ensures fresh data.
    /*
    const existingReport = history.find(h => {
      const hHandle = h.candidate?.githubHandle || h.githubHandle;
      return hHandle?.toLowerCase() === ownerHandle.toLowerCase();
    });

    if (existingReport) {
      handleOpenReport(existingReport);
      setManualUrl('');
      setActiveTab('history');
      return;
    }
    */

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
          maxHeight: showChecklistForm ? '800px' : '0',
          opacity: showChecklistForm ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
          background: 'rgba(255, 255, 255, 0.03)',
          borderTop: showChecklistForm ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
        }}>
          <div style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Tabs Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.08)', padding: '2px', borderRadius: '8px' }}>
                <button
                  onClick={() => setChecklistTab('configure')}
                  style={{
                    padding: '4px 12px',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    background: checklistTab === 'configure' ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.02em'
                  }}
                >
                  CONFIGURE
                </button>
                <button
                  onClick={() => setChecklistTab('active')}
                  style={{
                    padding: '4px 12px',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    background: checklistTab === 'active' ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.02em'
                  }}
                >
                  ACTIVE
                </button>
              </div>
              <X size={14} color="rgba(255,255,255,0.4)" style={{ cursor: 'pointer' }} onClick={() => setShowChecklistForm(false)} />
            </div>

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

                {/* Search Button */}
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
                      timestamp: Date.now(),
                      results: []
                    };

                    setActiveSearches(prev => [newSearch, ...prev]);
                    setChecklistTab('active');

                    try {
                      const tokenData = await chrome.storage.local.get('vibe_token');
                      const token = tokenData.vibe_token;

                      const res = await fetch(`${BACKEND_URL}/api/chekklist/search`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': token ? `Bearer ${token}` : ''
                        },
                        body: JSON.stringify(checklistForm)
                      });
                      const data = await res.json();

                      if (data.success) {
                        setActiveSearches(prev => prev.map(s =>
                          s.id === searchId
                            ? { ...s, status: 'completed', results: data.candidates || [] }
                            : s
                        ));

                        // Update storage with latest searches
                        setActiveSearches(current => {
                          chrome.storage.local.set({ active_searches: current });
                          return current;
                        });
                      } else {
                        setActiveSearches(prev => prev.map(s =>
                          s.id === searchId
                            ? { ...s, status: 'completed', results: [], error: data.error }
                            : s
                        ));
                      }
                    } catch (e) {
                      console.error(e);
                      setActiveSearches(prev => prev.map(s =>
                        s.id === searchId
                          ? { ...s, status: 'completed', results: [], error: 'Search failed' }
                          : s
                      ));
                    } finally {
                      setChecklistForm(prev => ({ ...prev, loading: false }));
                    }
                  }}
                  disabled={checklistForm.loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {checklistForm.loading ? 'SEARCHING...' : 'FIND DEVS'}
                </button>
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
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '4px', color: 'var(--text-main)' }}>{s.title}</div>
                          {s.status === 'completed' ? (
                            <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 500 }}>
                              Found {s.results?.length || 0} candidates
                            </div>
                          ) : (
                            <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></div>
                              Running...
                            </div>
                          )}
                        </div>
                        {s.status === 'completed' && (
                          <ChevronDown size={14} color="var(--text-dim)" style={{ transform: expandedSearchId === s.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        )}
                      </div>

                      {/* Results List */}
                      {expandedSearchId === s.id && s.results && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {s.results.map((c: any, i: number) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px', borderRadius: '8px', background: 'var(--bg-gray)' }}>
                              <img src={c.avatar} alt={c.handle} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>{c.name}</div>
                                  {c.matchScore !== undefined && (
                                    <div style={{
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      color: c.matchScore >= 80 ? '#059669' : c.matchScore >= 50 ? '#d97706' : '#dc2626',
                                      background: c.matchScore >= 80 ? '#d1fae5' : c.matchScore >= 50 ? '#fef3c7' : '#fee2e2',
                                      padding: '1px 4px',
                                      borderRadius: '4px'
                                    }}>
                                      {c.matchScore}%
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  @{c.handle}
                                  {c.archetype && (
                                    <span style={{ fontSize: '9px', background: '#e5e7eb', padding: '0 4px', borderRadius: '4px', color: '#374151', fontWeight: 500 }}>
                                      {c.archetype.replace('THE ', '')}
                                    </span>
                                  )}
                                </div>
                                {c.matchReason && (
                                  <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '2px', lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={c.matchReason}>
                                    {c.matchReason}
                                  </div>
                                )}
                              </div>
                              <a
                                href={`https://github.com/${c.handle}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: 'white',
                                  border: '1px solid var(--border)',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: 'var(--text-main)',
                                  textDecoration: 'none'
                                }}
                              >
                                View
                              </a>
                            </div>
                          ))}
                          {s.results.length === 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', padding: '10px' }}>No candidates found matching criteria.</div>
                          )}
                        </div>
                      )}
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
                    style={{
                      display: 'block',
                      border: bulkFile ? '2px solid #4f46e5' : '2px dashed #e2e8f0',
                      borderRadius: '12px',
                      padding: '30px',
                      textAlign: 'center',
                      background: bulkFile ? 'rgba(79, 70, 229, 0.05)' : '#f8fafc',
                      cursor: bulkProcessing ? 'not-allowed' : 'pointer',
                      marginBottom: '16px',
                      transition: 'all 0.2s ease'
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
                          Click to upload CSV or JSON
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
                          <span style={{ fontWeight: 600 }}>{r.handle}</span>
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
    <div className="popup-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <VibeLogo size={20} color="var(--brand-blue)" strokeWidth={2.5} />
          <h1 className="logo" style={{ textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>VIBECHEKK</h1>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'rgba(0,0,0,0.03)', padding: '4px 8px', borderRadius: '20px' }}>
          <BadgeCheck size={14} color={user?.tier === 'PRO' ? '#b45309' : (user ? 'var(--accent)' : 'var(--text-dim)')} strokeWidth={1.5} />
          <span style={{ fontSize: '10px', fontWeight: 800, color: user?.tier === 'PRO' ? '#b45309' : (user ? 'var(--accent)' : 'var(--text-dim)'), letterSpacing: '0.5px' }}>
            {user?.tier === 'PRO' ? 'PRO' : (user ? 'AUTHENTICATED' : 'GUEST')} TIER
          </span>
        </div>
      </header>

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '24px', marginBottom: '8px' }}>
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                  {(() => {
                    const handle = selectedReport.candidate?.githubHandle && selectedReport.candidate.githubHandle !== 'Guest' ? selectedReport.candidate.githubHandle : '';
                    return (
                      <>
                        {handle ? (
                          <a href={`https://github.com/${handle}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: '12px', overflow: 'hidden' }}>
                            <img
                              src={`https://github.com/${handle}.png?size=48`}
                              alt={handle}
                              className="history-avatar"
                              style={{ width: '48px', height: '48px', display: 'block' }}
                            />
                          </a>
                        ) : (
                          <div className="history-avatar-placeholder" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
                            <User size={24} color="var(--text-dim)" />
                          </div>
                        )}
                        <div className="history-meta" style={{ gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <a
                              href={`https://github.com/${handle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="profile-github-link"
                              style={{ textDecoration: 'none' }}
                            >
                              <h2 className="history-name clickable" style={{ fontSize: '18px', margin: 0, letterSpacing: '-0.02em' }}>
                                {selectedReport.metadata?.userStats?.name || selectedReport.candidate?.name || handle || 'Guest Profile'}
                              </h2>
                            </a>
                            {selectedReport.rarity_badge && (
                              <span style={{ fontSize: '14px' }} title={selectedReport.rarity}>{selectedReport.rarity_badge}</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                      const rawText = selectedReport.archetype_reason || selectedReport.metadata?.archetype_reason || 'Analysis based on GitHub activity.';
                                      const cleanText = rawText.replace('Classified as THE ', 'Classified as ');
                                      navigator.clipboard.writeText(cleanText);
                                      const btn = e.currentTarget;
                                      btn.style.background = 'rgba(34, 197, 94, 0.4)'; // Green flash
                                      setTimeout(() => {
                                        btn.style.background = 'rgba(255,255,255,0.1)';
                                      }, 500);
                                    }}
                                    title="Copy description"
                                  >
                                    <Copy size={12} color="white" />
                                  </div>
                                </div>
                              </div>
                            </div>
                            {selectedReport.rarity_percentile && (
                              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, opacity: 0.8 }}>
                                • {selectedReport.rarity_percentile.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                            {selectedReport.seniority && (
                              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.2px', opacity: 0.8 }}>
                                {selectedReport.seniority.toUpperCase()}
                              </span>
                            )}
                            {selectedReport.star_count !== undefined && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600 }}>
                                <Star size={10} fill="currentColor" /> {selectedReport.star_count} STARS
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
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

              {/* Hidden Vibe Card Template for PDF Generation */}
              {(() => {
                // Tier-based color schemes (solid colors that render in html2canvas)
                const tierThemes: Record<string, {
                  bgTop: string; bgBottom: string; border: string;
                  headerBg: string; accent: string; text: string; badge: string
                }> = {
                  'LEGENDARY': {
                    bgTop: '#2d1f00', bgBottom: '#1a1400', border: '#f59e0b',
                    headerBg: '#f59e0b', accent: '#fcd34d', text: '#fef3c7', badge: '🏆 LEGENDARY'
                  },
                  'ULTRA RARE': {
                    bgTop: '#2d1a4a', bgBottom: '#1a0f2e', border: '#8b5cf6',
                    headerBg: '#8b5cf6', accent: '#c4b5fd', text: '#ede9fe', badge: '💎 ULTRA RARE'
                  },
                  'RARE': {
                    bgTop: '#0c2341', bgBottom: '#061424', border: '#3b82f6',
                    headerBg: '#3b82f6', accent: '#93c5fd', text: '#dbeafe', badge: '⚡ RARE'
                  },
                  'UNCOMMON': {
                    bgTop: '#0a2918', bgBottom: '#051a0f', border: '#10b981',
                    headerBg: '#10b981', accent: '#6ee7b7', text: '#d1fae5', badge: '✦ UNCOMMON'
                  },
                  'COMMON': {
                    bgTop: '#1e293b', bgBottom: '#0f172a', border: '#64748b',
                    headerBg: '#64748b', accent: '#cbd5e1', text: '#e2e8f0', badge: '● COMMON'
                  }
                };

                // Get tier from report, fallback to deriving from label
                let tier = selectedReport.tier?.toUpperCase() || '';
                if (!tier || tier === 'UNKNOWN' || tier === 'UNDEFINED') {
                  tier = getRarityFromLabel(selectedReport.label || selectedReport.archetype || '');
                }
                const theme = tierThemes[tier] || tierThemes['COMMON'];

                return (
                  <div id="vibe-card-template" style={{
                    position: 'fixed',
                    left: '-9999px',
                    top: 0,
                    width: '400px',
                    height: '560px',
                    background: `linear-gradient(180deg, ${theme.bgTop} 0%, ${theme.bgBottom} 100%)`,
                    padding: '8px',
                    boxSizing: 'border-box',
                    fontFamily: "'Inter', 'Segoe UI', sans-serif"
                  }}>
                    {/* Card Frame */}
                    <div style={{
                      width: '100%',
                      height: '100%',
                      border: `6px solid ${theme.border}`,
                      borderRadius: '16px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      background: `linear-gradient(180deg, ${theme.bgTop} 0%, ${theme.bgBottom} 100%)`
                    }}>
                      {/* Header Bar */}
                      <div style={{
                        background: theme.headerBg,
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(0,0,0,0.5)', letterSpacing: '1px' }}>
                            {theme.badge}
                          </div>
                          <div style={{ fontSize: '22px', fontWeight: 900, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                            {selectedReport.candidate?.name || selectedReport.candidate?.githubHandle}
                          </div>
                        </div>
                        <div style={{
                          background: 'rgba(0,0,0,0.25)',
                          borderRadius: '10px',
                          padding: '6px 12px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '26px', fontWeight: 900, color: 'white', lineHeight: 1 }}>
                            {(() => {
                              const qScore = selectedReport.metadata?.quality_score;
                              if (qScore && qScore > 0) return Math.min(99, Math.ceil(qScore * 10));
                              const stars = selectedReport.star_count || 0;
                              return Math.min(99, 40 + Math.min(59, stars * 2));
                            })()}
                          </div>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '1px' }}>VIBE</div>
                        </div>
                      </div>

                      {/* Avatar Section */}
                      <div style={{
                        flex: '0 0 180px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.2)',
                        position: 'relative'
                      }}>
                        {/* Corner decorations */}
                        <div style={{ position: 'absolute', top: '8px', left: '8px', width: '20px', height: '20px', borderTop: `3px solid ${theme.border}`, borderLeft: `3px solid ${theme.border}` }} />
                        <div style={{ position: 'absolute', top: '8px', right: '8px', width: '20px', height: '20px', borderTop: `3px solid ${theme.border}`, borderRight: `3px solid ${theme.border}` }} />
                        <div style={{ position: 'absolute', bottom: '8px', left: '8px', width: '20px', height: '20px', borderBottom: `3px solid ${theme.border}`, borderLeft: `3px solid ${theme.border}` }} />
                        <div style={{ position: 'absolute', bottom: '8px', right: '8px', width: '20px', height: '20px', borderBottom: `3px solid ${theme.border}`, borderRight: `3px solid ${theme.border}` }} />

                        <div style={{
                          width: '130px',
                          height: '130px',
                          borderRadius: '50%',
                          border: `5px solid ${theme.border}`,
                          boxShadow: `0 0 0 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.4)`,
                          overflow: 'hidden',
                          background: theme.headerBg
                        }}>
                          <img
                            src={selectedReport.candidate?.avatar || `https://github.com/${selectedReport.candidate?.githubHandle}.png?size=400`}
                            crossOrigin="anonymous"
                            alt="Avatar"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      </div>

                      {/* Stats Bar */}
                      <div style={{
                        display: 'flex',
                        background: theme.headerBg,
                        borderTop: '2px solid rgba(0,0,0,0.2)',
                        borderBottom: '2px solid rgba(0,0,0,0.2)'
                      }}>
                        {[
                          { label: 'REPOS', value: selectedReport.metadata?.userStats?.totalRepos || '0' },
                          { label: 'STARS', value: selectedReport.star_count || selectedReport.metadata?.userStats?.totalStars || '0' },
                          { label: 'COMMITS', value: selectedReport.metadata?.userStats?.totalCommits || '0' }
                        ].map((stat, i) => (
                          <div key={i} style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '10px 0',
                            borderRight: i < 2 ? '1px solid rgba(0,0,0,0.2)' : 'none'
                          }}>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(0,0,0,0.5)', letterSpacing: '1px' }}>{stat.label}</div>
                            <div style={{ fontSize: '20px', fontWeight: 900, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{stat.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Info Section */}
                      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Archetype */}
                        <div style={{
                          background: 'rgba(0,0,0,0.3)',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          border: `2px solid ${theme.border}`
                        }}>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: theme.accent, letterSpacing: '2px', marginBottom: '4px' }}>
                            ARCHETYPE
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: 'white' }}>
                            {selectedReport.label || selectedReport.archetype || 'Developer'}
                          </div>
                        </div>

                        {/* Signature Trait */}
                        {selectedReport.meritPoints && selectedReport.meritPoints[0] && (
                          <div style={{
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            borderLeft: `4px solid ${theme.border}`
                          }}>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: theme.accent, letterSpacing: '1px', marginBottom: '2px' }}>
                              ★ SIGNATURE TRAIT
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: theme.text, lineHeight: 1.3 }}>
                              {selectedReport.meritPoints[0].title || (typeof selectedReport.meritPoints[0] === 'string' ? selectedReport.meritPoints[0] : 'Code Excellence')}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div style={{
                        background: 'rgba(0,0,0,0.4)',
                        padding: '10px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: `2px solid ${theme.border}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 900, color: theme.border, letterSpacing: '2px' }}>VIBECHEKK</span>
                        </div>
                        <div style={{ fontSize: '11px', color: theme.accent, fontWeight: 600 }}>
                          #{selectedReport.id?.slice(-8).toUpperCase() || 'XXXXXXXX'}
                        </div>
                      </div>
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
                    // Use the hidden template
                    const element = document.getElementById('vibe-card-template');
                    if (!element) return;

                    const btn = document.querySelector('.download-card-btn') as HTMLElement;
                    const originalText = btn.innerHTML;
                    btn.innerText = 'GENERATING PDF...';

                    try {
                      // Allow hidden element to be rendered
                      // html2canvas can capture off-screen if we don't use display:none
                      const canvas = await html2canvas(element, {
                        scale: 2, // High quality
                        useCORS: true,
                        backgroundColor: null
                      });

                      // Create PDF
                      const { jsPDF } = await import('jspdf');
                      const pdf = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: [63.5, 88.9] // Standard Trading Card size (2.5 x 3.5 inches) approx scaling
                      });

                      // Convert canvas to image data
                      const imgData = canvas.toDataURL('image/png');

                      // Add image to PDF (fill page)
                      pdf.addImage(imgData, 'PNG', 0, 0, 63.5, 88.9); // mm

                      // Save
                      pdf.save(`VibeCard-${selectedReport.candidate?.githubHandle || 'Dev'}.pdf`);

                    } catch (err) {
                      console.error('PDF Init failed:', err);
                      alert('Failed to generate card. Please try again.');
                    } finally {
                      btn.innerHTML = originalText;
                    }
                  }
                }}
              >
                <FileDown size={16} />
                DOWNLOAD REPORT CARD
              </button>
            </div>
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

                  // Filter out skeleton cards for handles that already have results
                  const activePending = allPending.filter(p =>
                    !completedHandles.has(p.handle?.toLowerCase())
                  );

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
                          <span className="history-name">{pending.name || pending.handle || 'Analyzing...'}</span>
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

                  if (filteredHistory.length === 0 && pendingAnalyses.length === 0) {
                    return <p className="footer-info">{archetypeFilter ? `No ${archetypeFilter} profiles found.` : 'No reports found.'}</p>;
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
                            <span className="history-name">
                              {(item.metadata?.userStats?.name ? item.metadata.userStats.name : handle) || 'Guest Profile'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <ArchetypeIcon label={item.label || 'Profile'} rarity={item.rarity || getRarityFromLabel(item.label)} size={12} />
                              <div style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                color: getRarityColor(item.rarity, item.label),
                                background: `${getRarityColor(item.rarity, item.label)}15`,
                                border: `1px solid ${getRarityColor(item.rarity, item.label)}30`
                              }}>
                                {stripThe(item.label) || 'Profile'}
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
                      Pipeline Analytics
                    </h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669' }}>ACTIVE</span>
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
        )}
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
  );
}

export default App;
