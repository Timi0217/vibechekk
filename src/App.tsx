import { useState, useEffect } from 'react'
import { Clock, Sliders, Search, ExternalLink, TrendingUp, ChevronDown, ChevronRight, Zap, BadgeCheck, ArrowLeft, Copy, AlertTriangle } from 'lucide-react'
import { BACKEND_URL } from './constants'
import './App.css'

type Tab = 'analyze' | 'history' | 'analytics' | 'settings'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('analyze')
  const [manualUrl, setManualUrl] = useState('')
  const [tokens, setTokens] = useState({ github: '', deepseek: '', vibeToken: '' })
  const [history, setHistory] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [atsInput, setAtsInput] = useState({ key: '', type: 'ashby' as 'ashby' | 'greenhouse' })
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [authStep, setAuthStep] = useState<'none' | 'ashby' | 'greenhouse'>('none')
  const [expandedMerits, setExpandedMerits] = useState<number[]>([])
  const [showFullSummary, setShowFullSummary] = useState(false)

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

  const handleManualSearch = async () => {
    if (!manualUrl) return
    setIsLoading(true)
    setExpandedMerits([])
    let normalized = manualUrl.trim().replace(/^@/, '');

    // Extract owner for fallback display
    let ownerHandle = normalized;
    if (normalized.includes('github.com/')) {
      const match = normalized.match(/github\.com\/([^/]+)/i);
      if (match) ownerHandle = match[1];
    }
    ownerHandle = ownerHandle.replace(/^@/, '').split('/')[0];

    const finalUrl = normalized.includes('github.com')
      ? (normalized.startsWith('http') ? normalized : `https://${normalized}`)
      : `https://github.com/${normalized}`;

    chrome.runtime.sendMessage({
      type: 'START_VIBE_CHECK',
      url: finalUrl
    }, (response) => {
      setIsLoading(false)
      if (response && response.success) {
        // Enforce the searched handle if server returns 'Guest' or generic
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
        setSelectedReport(finalReport)
      } else {
        alert(`Failed: ${response?.error || 'Unknown error'}`)
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
      <header>
        <h1 className="logo">Vibechekk</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <BadgeCheck size={16} color={user ? 'var(--accent)' : 'var(--text-dim)'} strokeWidth={1.5} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: user ? 'var(--accent)' : 'var(--text-dim)' }}>
            {user ? user.tier : 'GUEST'} TIER
          </span>
        </div>
      </header>

      <div className="tabs-nav">
        <button className={`tab-btn ${activeTab === 'analyze' ? 'active' : ''}`} onClick={() => setActiveTab('analyze')}>
          <Search size={14} strokeWidth={2} />
        </button>
        <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <Clock size={14} strokeWidth={2} />
        </button>
        <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          <TrendingUp size={14} strokeWidth={2} />
        </button>
        <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <Sliders size={14} strokeWidth={2} />
        </button>
      </div>

      <main>
        {selectedReport ? (
          <div className="detail-view">
            <button className="back-btn" onClick={() => setSelectedReport(null)}>
              <ArrowLeft size={14} style={{ marginRight: '6px' }} strokeWidth={2} />
              Back to {activeTab === 'analyze' ? 'Search' : 'History'}
            </button>
            <div className="report-header">
              <h2 className="detail-name">{selectedReport.candidate?.githubHandle && selectedReport.candidate.githubHandle !== 'Guest' ? selectedReport.candidate.githubHandle : 'Global Analyst'}</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="history-archetype">{selectedReport.archetype} - {selectedReport.label}</span>
              </div>
            </div>

            <div className="detail-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 className="section-title" style={{ marginBottom: 0, textTransform: 'uppercase' }}>SKILL ANALYSIS</h3>
              </div>
              <div className={`trajectory-box ${showFullSummary ? 'expanded' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <p className="trajectory-text" style={{ flex: 1, margin: 0 }}>{selectedReport.trajectorySummary}</p>
                  <button
                    className="copy-icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(selectedReport.trajectorySummary);
                    }}
                    title="Copy summary"
                  >
                    <Copy size={14} strokeWidth={2} />
                  </button>
                </div>

                {(selectedReport.recruiterSummary || selectedReport.recruiter_summary) && (
                  <button
                    className="view-more-btn"
                    onClick={() => setShowFullSummary(!showFullSummary)}
                  >
                    {showFullSummary ? 'view less' : 'view more'}
                  </button>
                )}

                {(showFullSummary && (selectedReport.recruiterSummary || selectedReport.recruiter_summary)) && (
                  <div className="recruiter-summary">
                    <div className="summary-divider"></div>
                    <p className="recruiter-text">{selectedReport.recruiterSummary || selectedReport.recruiter_summary}</p>
                    <button
                      className="copy-summary-btn"
                      onClick={() => {
                        const summary = selectedReport.recruiterSummary || selectedReport.recruiter_summary;
                        const text = `Engineer Analysis: ${selectedReport.candidate?.githubHandle}\n\nTrajectory: ${selectedReport.trajectorySummary}\n\nDetailed Analysis:\n${summary}`;
                        navigator.clipboard.writeText(text);
                        alert('Professional summary copied to clipboard!');
                      }}
                    >
                      <Zap size={12} style={{ marginRight: '6px' }} strokeWidth={2} />
                      Copy for Recruiters
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="detail-section">
              <h3 className="section-title">Highlights</h3>
              <div className="merit-grid">
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
                            <AlertTriangle size={14} style={{ marginRight: '8px', color: '#d32f2f' }} strokeWidth={1.5} />
                          ) : (
                            <BadgeCheck size={14} style={{ marginRight: '8px', color: 'var(--accent)' }} strokeWidth={1.5} />
                          )}
                          <span className="merit-title">{point.title || point}</span>
                        </div>
                        {isExpanded ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}
                      </div>
                      {isExpanded && point.detail && (
                        <div className="merit-detail">
                          {point.detail}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="detail-section" style={{ border: 'none' }}>
              <div className="confidence-pill">
                Confidence: <strong>{selectedReport.confidence}%</strong>
              </div>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'analyze' && (
              <div className="search-box">
                <h2 className="section-title" style={{ textAlign: 'center', textTransform: 'uppercase' }}>CHEKK DEV SKILLS</h2>
                <input
                  className="input-field"
                  placeholder="github.com/username or @handle"
                  value={manualUrl}
                  onChange={e => setManualUrl(e.target.value)}
                />
                <button className="primary-btn" onClick={handleManualSearch} disabled={isLoading || !manualUrl}>
                  {isLoading ? 'RUNNING...' : 'RUN'}
                </button>
                <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.5px' }}>
                  3 FREE ANALYSIS LEFT
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="history-list">
                <h2 className="section-title">Merit History</h2>
                {history.length === 0 ? (
                  <p className="footer-info">No reports found.</p>
                ) : (
                  history.map((item: any, i: number) => (
                    <div key={i} className="history-item" onClick={() => setSelectedReport(item)} style={{ cursor: 'pointer' }}>
                      <div className="history-info">
                        <span className="history-name">{item.candidate?.githubHandle || 'Guest Candidate'}</span>
                        <span className="history-archetype">{item.archetype} - {item.label}</span>
                      </div>
                      <ExternalLink size={14} color="var(--text-dim)" />
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="analytics-view">
                <h2 className="section-title">Talent Pool Insights</h2>
                {analytics ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="history-item">
                      <div className="history-info">
                        <span className="history-dim">Total Candidates Analyzed</span>
                        <span className="history-name" style={{ fontSize: '24px' }}>{analytics.totalChecks}</span>
                      </div>
                    </div>
                    <div className="history-list">
                      {Object.entries(analytics.distribution).map(([arch, count]: any) => (
                        <div key={arch} className="history-item" style={{ padding: '8px 12px' }}>
                          <span className="history-archetype">{arch} Tier</span>
                          <span className="history-name">{count} candidates</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="footer-info">Connect backend to view analytics.</p>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="settings-scroll-container">
                <div className="settings-group">
                  <h2 className="section-title">Premium Analytics Sync</h2>
                  {user ? (
                    <div className="auth-status-card" style={{ width: '100%', maxWidth: '100%' }}>
                      <p className="footer-info" style={{ color: 'var(--text-main)', marginBottom: '8px' }}>Connected as <strong>{user.name || user.email}</strong></p>
                      <p style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, marginBottom: '16px' }}>✓ Premium Analytics Active</p>
                      <button className="secondary-btn logout-btn" onClick={logout}>Disconnect ATS</button>
                    </div>
                  ) : authStep === 'none' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                      <p className="footer-info" style={{ marginBottom: '4px', textAlign: 'left' }}>Analyze more candidates by linking your ATS account.</p>
                      <button className="primary-btn" onClick={() => setAuthStep('ashby')} style={{ background: '#2563eb' }}>
                        Sync with Ashby
                      </button>
                      <button className="primary-btn" onClick={() => setAuthStep('greenhouse')} style={{ background: '#059669' }}>
                        Sync with Greenhouse
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
        )}
      </main>
    </div>
  )
}

export default App
