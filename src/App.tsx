import { useState, useEffect, useRef } from 'react'
import { Clock, Sliders, Search, TrendingUp, ChevronRight, ArrowLeft, Copy, AlertTriangle, BadgeCheck, Zap, FileDown, User, Box, BookOpen, Layers, Plus, Loader2, Heart, Beaker, Star, Hammer, Code, MessageSquare, Bug, Award } from 'lucide-react'
import { BACKEND_URL } from './constants'
import './App.css'

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
    // TIER 4 - LEGENDARY
    'the foundation builder': Bug,
    'the technical titan': BookOpen,
    'the industry shaper': Award,

    // TIER 3 - RARE
    'the open source champion': Heart,
    'the system architect': Layers,
    'the deep specialist': Search,

    // TIER 2 - UNCOMMON
    'the open source contributor': MessageSquare,
    'the independent builder': Sliders,
    'the product engineer': Box,

    // TIER 1 - COMMON
    'the hidden gem': Star,
    'the practical builder': Hammer,
    'the feature engineer': Code,
    'the experimental developer': Beaker,
    'the beginner student': BookOpen,
  }

  const rarityColors: Record<string, string> = {
    'LEGENDARY': '#b45309',
    'RARE': '#7c3aed',
    'UNCOMMON': '#2563eb',
    'COMMON': '#64748b'
  }

  const normalizedLabel = label?.toLowerCase().trim().replace(/^the\s+/, '');
  const Icon = ArchetypeMap[label?.toLowerCase().trim()] || ArchetypeMap['the ' + normalizedLabel] || ArchetypeMap[normalizedLabel] || Zap
  const color = rarityColors[rarity?.toUpperCase() || ''] || 'var(--brand-blue)'

  return <Icon size={size} color={color} />
}

const getRarityClass = (rarity: string) => {
  const r = rarity?.toUpperCase();
  if (r === 'LEGENDARY') return 'legendary';
  if (r === 'RARE') return 'rare';
  if (r === 'UNCOMMON') return 'uncommon';
  return 'common';
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('analyze')
  const [manualUrl, setManualUrl] = useState('')
  const [tokens, setTokens] = useState({ github: '', deepseek: '', vibeToken: '' })
  const [history, setHistory] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [atsInput, setAtsInput] = useState({ key: '', type: 'ashby' as 'ashby' | 'greenhouse' })
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [authStep, setAuthStep] = useState<'none' | 'ashby' | 'greenhouse'>('none')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)
  const activeTabRef = useRef(activeTab)

  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  const handleOpenReport = (report: any) => {
    setSelectedReport(report)
  }

  useEffect(() => {
    chrome.storage.local.get(['github_token', 'deepseek_key', 'vibe_token', 'user_data'], (res) => {
      setTokens({
        github: (res.github_token as string) || '',
        deepseek: (res.deepseek_key as string) || '',
        vibeToken: (res.vibe_token as string) || ''
      })
      if (res.user_data) setUser(res.user_data)
    })

    const handleKeyDetected = (message: any) => {
      if (message.type === 'ATS_KEY_DETECTED') {
        setAtsInput({ key: message.key, type: message.atsType })
        setAuthStep(message.atsType)
      }
    }

    chrome.runtime.onMessage.addListener(handleKeyDetected)

    if (activeTab === 'history') fetchHistory()
    if (activeTab === 'analytics') fetchAnalytics()

    return () => chrome.runtime.onMessage.removeListener(handleKeyDetected)
  }, [activeTab])

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
      const res = await fetch(`${BACKEND_URL}/api/analytics`)
      const data = await res.json()
      if (data.success) setAnalytics(data.data)
    } catch (e) {
      console.warn('Analytics failed')
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


  const handleAtsLogin = async (keyOverride?: string) => {
    const key = keyOverride || atsInput.key
    if (!key) return
    setIsLoggingIn(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/ats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: key, type: authStep === 'none' ? atsInput.type : authStep })
      })
      const data = await res.json()
      if (data.success) {
        chrome.storage.local.set({ vibe_token: data.token, user_data: data.user }, () => {
          setTokens({ ...tokens, vibeToken: data.token })
          setUser(data.user)
          setIsLoggingIn(false)
          setAtsInput({ ...atsInput, key: '' })
          setAuthStep('none')
        })
      } else {
        alert(data.error || 'Login failed')
        setIsLoggingIn(false)
      }
    } catch (e) {
      alert('Backend unavailable for login')
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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'white', borderBottom: '1px solid var(--border)' }}>
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
          <Sliders size={14} strokeWidth={2} />
        </button>
      </div>

      <main>
        {selectedReport ? (
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
                        <img
                          src={`https://github.com/${handle}.png?size=48`}
                          alt={handle}
                          className="history-avatar"
                          style={{ width: '48px', height: '48px', borderRadius: '12px' }}
                        />
                      ) : (
                        <div className="history-avatar-placeholder" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
                          <User size={24} color="var(--text-dim)" />
                        </div>
                      )}
                      <div className="history-meta" style={{ gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h2 className="history-name" style={{ fontSize: '18px', margin: 0, letterSpacing: '-0.02em' }}>{handle || 'Guest Profile'}</h2>
                          {selectedReport.rarity_badge && (
                            <span style={{ fontSize: '14px' }} title={selectedReport.rarity}>{selectedReport.rarity_badge}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ArchetypeIcon label={selectedReport.label || 'Profile'} rarity={selectedReport.rarity} size={14} />
                          <div className={`archetype-badge ${getRarityClass(selectedReport.rarity)}`}>
                            {selectedReport.label || 'Profile'}
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

            <div className="trajectory-box expanded" style={{ marginTop: '4px' }}>
              <h3 className="section-title" style={{ marginBottom: '12px', textTransform: 'uppercase' }}>SKILL OVERVIEW</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <p className="trajectory-text" style={{ flex: 1, margin: 0 }}>
                  {selectedReport.recruiterSummary || selectedReport.recruiter_summary || selectedReport.trajectorySummary || selectedReport.trajectory}
                </p>
                <button
                  className="copy-icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    const text = selectedReport.recruiterSummary || selectedReport.recruiter_summary || selectedReport.trajectorySummary;
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
            </div>

            {selectedReport.metadata?.technical_signal && (
              <div className="trajectory-box expanded" style={{ background: 'rgba(33, 150, 243, 0.08)', marginTop: '8px' }}>
                <h3 className="section-title" style={{ marginBottom: '12px', textTransform: 'uppercase' }}>TECHNICAL SIGNAL</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <p className="trajectory-text" style={{ margin: 0, fontWeight: 500, flex: 1 }}>
                    {selectedReport.metadata.technical_signal_detailed || selectedReport.metadata.technical_signal}
                  </p>
                  <button
                    className="copy-icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const text = selectedReport.metadata.technical_signal_detailed || selectedReport.metadata.technical_signal;
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
              </div>
            )}

            {
              selectedReport.metadata?.verified_skills && (
                <div className="detail-section">
                  <div style={{ width: '100%', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}></div>
                  <h3 className="section-title" style={{ marginBottom: '12px', marginTop: '4px' }}>SKILLS VERIFIED FROM CODE</h3>
                  <div className="merit-grid scrollable">
                    {selectedReport.metadata.verified_skills.map((skill: any, i: number) => {
                      const name = skill.name || skill.title || (typeof skill === 'string' ? skill.split('|')[0] : 'Skill');
                      const level = skill.level || (typeof skill === 'string' ? skill.split('|')[1]?.trim() : '');
                      const evidence = skill.evidence || (typeof skill === 'string' ? skill.split('|')[2]?.trim() : '');

                      return (
                        <div key={i} className="merit-card expanded" style={{ cursor: 'default' }}>
                          <div className="merit-header">
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <BadgeCheck size={14} style={{ marginRight: '8px', color: 'var(--accent)' }} strokeWidth={1.5} />
                              <span className="merit-title">{name}</span>
                            </div>
                          </div>
                          <div className="merit-detail">
                            {level && <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Proficiency: {level}</div>}
                            {evidence && <p style={{ margin: '0 0 12px 0' }}>{evidence}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            }


            <div className="detail-section">
              <div style={{ width: '100%', borderBottom: '1px solid var(--border)', marginTop: '8px', marginBottom: '8px' }}></div>
              <h3 className="section-title" style={{ marginBottom: '12px', marginTop: '4px' }}>HIGHLIGHTS</h3>
              <div className="merit-grid">
                {selectedReport.meritPoints.map((point: any, i: number) => {
                  const isNegative = point.type === 'negative';
                  return (
                    <div key={i} className={`merit-card expanded ${isNegative ? 'negative' : ''}`} style={{ cursor: 'default' }}>
                      <div className="merit-header">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {isNegative ? (
                            <AlertTriangle size={14} style={{ marginRight: '8px', color: '#ea580c' }} strokeWidth={1.5} />
                          ) : (
                            <BadgeCheck size={14} style={{ marginRight: '8px', color: 'var(--accent)' }} strokeWidth={1.5} />
                          )}
                          <span className="merit-title">{point.title || point}</span>
                        </div>
                      </div>
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
                    </div>
                  );
                })}
              </div>
              <button className="download-card-btn">
                <FileDown size={16} />
                DOWNLOAD REPORT CARD
              </button>
            </div >
          </div >
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
                  3 FREE ANALYSIS LEFT
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
                    Refer 3 friends and get Vibechekk unlimited free for one month if they each run at least one chekk.
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
                    width: 'fit-content',
                    boxShadow: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    INVITE FRIENDS
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="history-list">
                <h2 className="section-title">History</h2>
                {history.length === 0 ? (
                  <p className="footer-info">No reports found.</p>
                ) : (
                  history.map((item: any, i: number) => {
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
                                {item.label || 'Profile'}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="history-action-icon">
                          <ChevronRight size={16} color="var(--text-dim)" strokeWidth={2.5} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="analytics-view">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 className="section-title" style={{ margin: 0 }}>Insights</h2>
                    <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Pipeline Intelligence
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669' }}>ACTIVE</span>
                  </div>
                </div>

                {analytics ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="stat-card hero" style={{ padding: '20px', background: 'white' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <div className="stat-value" style={{ fontSize: '38px' }}>{analytics.totalChecks}</div>
                        <TrendingUp size={16} color="var(--accent)" strokeWidth={3} style={{ marginBottom: '4px' }} />
                      </div>
                      <div className="stat-label" style={{ opacity: 0.7 }}>TOTAL PROFILES PROCESSED</div>
                    </div>

                    <div className="detail-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 className="section-title" style={{ fontSize: '10px', marginBottom: 0 }}>PROFILE DISTRIBUTION</h3>
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600 }}>BY ARCHETYPE</span>
                      </div>

                      <div className="history-list" style={{ gap: '10px' }}>
                        {Object.entries(analytics.distribution).map(([arch, count]: any) => {
                          const percentage = Math.round((count / analytics.totalChecks) * 100);
                          return (
                            <div key={arch} className="stat-card compact" style={{ background: 'white' }}>
                              <div className="stat-info">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div className="archetype-icon-small">
                                    <ArchetypeIcon label={arch} size={14} />
                                  </div>
                                  <span className="stat-arch-name">{arch}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span className="stat-count" style={{ display: 'block' }}>{count} {count === 1 ? 'profile' : 'profiles'}</span>
                                  <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 800 }}>{percentage}%</span>
                                </div>
                              </div>
                              <div className="percentage-bar-bg" style={{ height: '4px' }}>
                                <div
                                  className="percentage-bar-fill"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
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
                  <h2 className="section-title" style={{ marginBottom: '4px' }}>Analytics</h2>
                  {user ? (
                    <div className="auth-status-card" style={{ width: '100%', maxWidth: '100%' }}>
                      <p className="footer-info" style={{ color: 'var(--text-main)', marginBottom: '8px' }}>Connected as <strong>{user.name || user.email}</strong></p>
                      <p style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, marginBottom: '16px' }}>✓ Premium Analytics Active</p>
                      <button className="secondary-btn logout-btn" onClick={logout}>Disconnect ATS</button>
                    </div>
                  ) : authStep === 'none' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                      <button className="primary-btn" onClick={() => setAuthStep('ashby')} style={{ background: '#2563eb' }}>
                        Connect Ashby
                      </button>
                      <button className="primary-btn" onClick={() => setAuthStep('greenhouse')} style={{ background: '#059669' }}>
                        Connect Greenhouse
                      </button>

                      <div style={{ marginTop: '8px' }}>
                        <p className="footer-info" style={{ marginBottom: '8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-main)' }}>Connect your ATS to:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
                          {[
                            'Analyze profiles in bulk',
                            'See skill trends across your pipeline',
                            'Benchmark against industry standards',
                            'Export reports directly to your ATS'
                          ].map((text, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                              <BadgeCheck size={14} color="var(--accent)" strokeWidth={2} />
                              <span>{text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button className="upgrade-pro-btn">
                        <TrendingUp size={16} strokeWidth={2.5} />
                        UPGRADE TO PRO
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h3 style={{ fontSize: '13px', margin: 0 }}>Connect to {authStep.charAt(0).toUpperCase() + authStep.slice(1)}</h3>
                      <p className="footer-info">
                        1. Go to your {authStep}
                        <a href={authStep === 'ashby' ? 'https://app.ashbyhq.com/settings/api' : 'https://app.greenhouse.io/configure/dev_center/credentials'} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', marginLeft: '4px' }}>
                          API Settings
                        </a><br />
                        2. Copy your API Key<br />
                        3. Paste it below to link your account.
                      </p>
                      <input
                        type="password"
                        className="input-field"
                        placeholder={`${authStep === 'ashby' ? 'Ashby API Key' : 'Greenhouse API Key'}`}
                        value={atsInput.key}
                        onChange={e => setAtsInput({ ...atsInput, key: e.target.value })}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="secondary-btn" onClick={() => { setAuthStep('none'); setAtsInput({ ...atsInput, key: '' }); }} style={{ flex: 1 }}>Cancel</button>
                        <button className="primary-btn" onClick={() => handleAtsLogin()} disabled={isLoggingIn || !atsInput.key} style={{ flex: 2 }}>
                          {isLoggingIn ? 'Syncing...' : 'Complete Connection'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )
        }
      </main >
    </div >
  )
}

export default App
