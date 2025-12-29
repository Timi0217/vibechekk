import { useState, useEffect, useRef } from 'react'
import { Clock, Search, TrendingUp, ChevronDown, ChevronRight, ArrowLeft, Copy, AlertTriangle, BadgeCheck, Zap, FileDown, User, BookOpen, Layers, Plus, Loader2, Heart, Star, Hammer, Code, Cpu, Target, GitPullRequest, Gem, Wrench, Rocket, Coffee, Compass, Ghost, Settings, Lock } from 'lucide-react'
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

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('analyze')
  const [manualUrl, setManualUrl] = useState('')
  const [tokens, setTokens] = useState({ github: '', deepseek: '', vibeToken: '' })
  const [history, setHistory] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [expandedMerits, setExpandedMerits] = useState<number[]>([])
  const [showFullSummary, setShowFullSummary] = useState(false)
  const [showDetailedSummary, setShowDetailedSummary] = useState(false)
  const [showTechnicalSignal, setShowTechnicalSignal] = useState(false)
  const [showDetailedTechnical, setShowDetailedTechnical] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedSkills, setExpandedSkills] = useState<number[]>([])
  const [loadingStep, setLoadingStep] = useState(0)
  const [tierFilter, setTierFilter] = useState<string | null>(null)
  const [archetypeFilter, setArchetypeFilter] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const activeTabRef = useRef(activeTab)

  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

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
    chrome.storage.local.get(['github_token', 'deepseek_key', 'vibe_token', 'user_data'], (res) => {
      setTokens({
        github: (res.github_token as string) || '',
        deepseek: (res.deepseek_key as string) || '',
        vibeToken: (res.vibe_token as string) || ''
      })
      if (res.user_data) {
        setUser(res.user_data)
      } else {
        setUser(null)
      }
      setAuthLoading(false)
    })

    if (activeTab === 'history') fetchHistory()
    if (activeTab === 'analytics') fetchAnalytics()

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

  const [pendingHandles, setPendingHandles] = useState<string[]>([])

  const handleManualSearch = async () => {
    if (!manualUrl) return

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
        // 6. Auto-open if still on search page
        if (activeTabRef.current === 'analyze') {
          handleOpenReport(finalReport)
        }
      } else {
        alert(`Failed to analyze ${ownerHandle}: ${response?.error || 'Unknown error'}`)
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

      // Send to backend for user creation/login
      const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email: profile.email,
          name: profile.name,
          picture: profile.picture
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

  return (
    <div className="popup-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <VibeLogo size={20} color="var(--brand-blue)" strokeWidth={2.5} />
          <h1 className="logo" style={{ textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>VIBECHEKK</h1>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'rgba(0,0,0,0.03)', padding: '4px 8px', borderRadius: '20px' }}>
          <BadgeCheck size={14} color={user ? 'var(--accent)' : 'var(--text-dim)'} strokeWidth={1.5} />
          <span style={{ fontSize: '10px', fontWeight: 800, color: user ? 'var(--accent)' : 'var(--text-dim)', letterSpacing: '0.5px' }}>
            {user ? user.tier : 'GUEST'} TIER
          </span>
        </div>
      </header>

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
                                {handle || 'Guest Profile'}
                              </h2>
                            </a>
                            {selectedReport.rarity_badge && (
                              <span style={{ fontSize: '14px' }} title={selectedReport.rarity}>{selectedReport.rarity_badge}</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ArchetypeIcon label={selectedReport.label || 'Profile'} rarity={selectedReport.rarity} size={14} />
                            <div className="archetype-tooltip-wrapper">
                              <div className={`archetype-badge ${getRarityClass(selectedReport.rarity)}`}>
                                {stripThe(selectedReport.label) || 'Profile'}
                              </div>
                              <div className="archetype-tooltip">
                                <strong style={{ display: 'block', marginBottom: '4px' }}>{stripThe(selectedReport.label) || 'Profile'}</strong>
                                {selectedReport.archetype_reason || 'Analysis based on GitHub activity.'}
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
                                    {point.evidence.map((ev: string, idx: number) => <li key={idx}>{ev}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <button
                    className="download-card-btn"
                    onClick={() => {
                      if (!user) {
                        setSelectedReport(null);
                        setActiveTab('settings');
                      } else {
                        // TODO: Implement actual PDF download
                        console.log('Downloading report card...');
                      }
                    }}
                  >
                    <FileDown size={16} />
                    DOWNLOAD REPORT CARD
                  </button>
                </div>
              )}
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
                    onClick={() => { setManualUrl(''); }}
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
                <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.5px' }}>
                  3 FREE CHEKKS LEFT THIS WEEK
                </div>
                <div className="referral-card" style={{
                  marginTop: '24px',
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--accent) 0%, #92400e 100%)',
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(180, 83, 9, 0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={15} fill="white" style={{ position: 'relative', top: '-0.5px' }} />
                    <span style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1 }}>Get Unlimited Chekks for Free</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.5', fontWeight: 500, opacity: 0.9 }}>
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
                    justifyContent: 'center'
                  }}
                    onClick={() => {
                      setLoginMessage('Sign up or login to invite friends');
                      setActiveTab('settings');
                    }}
                  >
                    INVITE FRIENDS
                  </button>
                </div>

                <button className="primary-btn" style={{
                  marginTop: '24px',
                  background: 'var(--text-main)',
                  color: 'white',
                  border: 'none',
                  fontSize: '14px',
                  height: '44px',
                  fontWeight: 800,
                  letterSpacing: '1.2px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%'
                }}
                  onClick={() => {
                    setLoginMessage('Sign up or login to upgrade access');
                    setActiveTab('settings');
                  }}
                >
                  UPGRADE FOR UNLIMITED CHEKKS
                </button>
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

                  if (filteredHistory.length === 0) {
                    return <p className="footer-info">{archetypeFilter ? `No ${archetypeFilter} profiles found.` : 'No reports found.'}</p>;
                  }

                  return filteredHistory.map((item: any, i: number) => {
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
                            <span className="history-name">{handle || 'Guest Profile'}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <ArchetypeIcon label={item.label || 'Profile'} rarity={item.rarity} size={12} />
                              <div className={`archetype-badge ${getRarityClass(item.rarity)}`}>
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
                  <h2 style={{ fontSize: '10px', color: 'var(--text-main)', fontWeight: 600, margin: 0, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user ? 'Settings' : 'AUTHORIZATION REQUIRED'}</h2>
                  {user ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Account Card */}
                      <div style={{
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                          {user.picture ? (
                            <img
                              src={user.picture}
                              alt={user.name}
                              style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '16px',
                                border: '2px solid var(--accent)',
                                boxShadow: '0 4px 12px rgba(196, 114, 30, 0.2)'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '16px',
                              background: 'linear-gradient(135deg, var(--accent) 0%, #b45309 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 12px rgba(196, 114, 30, 0.3)'
                            }}>
                              <User size={28} color="white" strokeWidth={2} />
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <h3 style={{
                              fontSize: '16px',
                              fontWeight: 700,
                              margin: '0 0 4px 0',
                              color: 'var(--text-main)',
                              letterSpacing: '-0.02em'
                            }}>
                              {user.name || 'User'}
                            </h3>
                            <p style={{
                              fontSize: '12px',
                              color: 'var(--text-dim)',
                              margin: 0,
                              fontWeight: 500
                            }}>
                              {user.email}
                            </p>
                          </div>
                        </div>

                        {/* Tier Badge */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 14px',
                          borderRadius: '24px',
                          background: 'linear-gradient(135deg, rgba(196, 114, 30, 0.12) 0%, rgba(180, 83, 9, 0.06) 100%)',
                          border: '1px solid rgba(196, 114, 30, 0.2)',
                          marginBottom: '8px'
                        }}>
                          <BadgeCheck size={14} color="var(--accent)" strokeWidth={2.5} />
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: 'var(--accent)',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase'
                          }}>
                            {user.tier || 'Premium'} Member
                          </span>
                        </div>
                      </div>

                      {/* Features Section */}
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
                          Your Benefits
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {[
                            { icon: TrendingUp, label: 'Full Pipeline Analytics', active: true },
                            { icon: Clock, label: 'Unlimited Search History', active: true },
                            { icon: Layers, label: 'Archetype Distribution', active: true },
                            { icon: Zap, label: 'Priority Processing', active: true },
                          ].map((feature, idx) => (
                            <div key={idx} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              background: feature.active ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-gray)',
                              border: feature.active ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid var(--border)'
                            }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: feature.active ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-gray)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <feature.icon size={14} color={feature.active ? '#10b981' : 'var(--text-dim)'} strokeWidth={2} />
                              </div>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: feature.active ? 'var(--text-main)' : 'var(--text-dim)',
                                flex: 1
                              }}>
                                {feature.label}
                              </span>
                              {feature.active && <BadgeCheck size={16} color="#10b981" strokeWidth={2.5} />}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sign Out Button */}
                      <button
                        onClick={logout}
                        style={{
                          width: '100%',
                          padding: '14px',
                          borderRadius: '12px',
                          background: 'transparent',
                          color: '#dc2626',
                          fontSize: '12px',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          border: '1px solid rgba(220, 38, 38, 0.2)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        SIGN OUT
                      </button>
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
                          ].map((tier, i) => (
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
    </div >
  );
}

export default App
