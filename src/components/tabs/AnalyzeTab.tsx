import { Clock, Plus, Zap } from 'lucide-react'
import { useVibeStore } from '../../store'
import { ReactNode } from 'react'

interface AnalyzeTabProps {
  manualUrl: string
  setManualUrl: (url: string) => void
  handleManualSearch: () => void
  loadingStep: number
  handleUpgradeToPro: () => Promise<void>
  setActiveTab: (tab: 'analyze' | 'history' | 'analytics' | 'settings') => void
  setShowInviteModal: (show: boolean) => void
  proFeaturesContent: ReactNode
}

export default function AnalyzeTab({
  manualUrl,
  setManualUrl,
  handleManualSearch,
  loadingStep,
  handleUpgradeToPro,
  setActiveTab,
  setShowInviteModal,
  proFeaturesContent
}: AnalyzeTabProps) {
  const {
    user,
    usageInfo,
    pendingHandles
  } = useVibeStore()

  return (
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
  )
}
