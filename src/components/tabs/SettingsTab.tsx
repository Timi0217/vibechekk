import { LogOut, User, Shield, Trash, Heart, ClipboardList, FileSpreadsheet } from 'lucide-react'
import { useVibeStore } from '../../store'
import { BACKEND_URL } from '../../constants'

interface SettingsTabProps {
  handleGoogleLogin: () => Promise<void>
  handleUpgradeToPro: () => Promise<void>
  logout: () => void
}

export default function SettingsTab({ handleGoogleLogin, handleUpgradeToPro, logout }: SettingsTabProps) {
  const {
    user, setUser,
    isLoggingIn,
    usageInfo, setUsageInfo,
    referralInfo,
    githubLinked, setGithubLinked,
    githubUsername, setGithubUsername,
    showInviteModal, setShowInviteModal
  } = useVibeStore()

  return (
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

                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    letterSpacing: '-0.01em',
                    marginBottom: '2px'
                  }}>
                    {user.name}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '11px',
                    color: 'var(--text-dim)',
                    fontWeight: 500,
                    marginBottom: '8px'
                  }}>
                    {user.email}
                  </p>

                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: user.tier === 'PRO'
                      ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                      : '#f3f4f6',
                    fontSize: '9px',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    color: user.tier === 'PRO' ? 'white' : 'var(--text-dim)',
                    border: user.tier === 'PRO' ? 'none' : '1px solid #e5e7eb',
                    boxShadow: user.tier === 'PRO'
                      ? '0 4px 12px rgba(124, 58, 237, 0.25), 0 0 0 1px rgba(124, 58, 237, 0.1)'
                      : 'none'
                  }}>
                    {user.tier === 'PRO' && <Heart size={10} fill="white" />}
                    {user.tier} TIER
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Info */}
            {usageInfo && (
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    CHEKKS THIS WEEK
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-purple)' }}>
                    {usageInfo.used} / {usageInfo.limit === Infinity ? '∞' : usageInfo.limit}
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: usageInfo.limit === Infinity ? '100%' : `${Math.min((usageInfo.used / usageInfo.limit) * 100, 100)}%`,
                    height: '100%',
                    background: usageInfo.limit === Infinity
                      ? 'linear-gradient(90deg, #7c3aed 0%, #6d28d9 100%)'
                      : usageInfo.used >= usageInfo.limit
                        ? '#ef4444'
                        : 'linear-gradient(90deg, #7c3aed 0%, #6d28d9 100%)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            {/* Referral Info */}
            {referralInfo && referralInfo.referralCode && (
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      REFERRAL PROGRAM
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {referralInfo.progressToReward.rewardDescription}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      letterSpacing: '0.03em',
                      boxShadow: '0 2px 8px rgba(124, 58, 237, 0.2)'
                    }}
                  >
                    INVITE
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                  Progress: {referralInfo.progressToReward.current} / {referralInfo.progressToReward.target}
                </div>
                <div style={{ width: '100%', height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min((referralInfo.progressToReward.current / referralInfo.progressToReward.target) * 100, 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            {/* GitHub Stats Card */}
            {githubLinked && githubUsername && (
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  GITHUB CONNECTED
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#171717',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.840 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                      @{githubUsername}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                      Connected
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upgrade CTA - Only show if not PRO */}
            {user.tier !== 'PRO' && (
              <div style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                borderRadius: '16px',
                padding: '20px',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)'
              }}>
                {/* Decorative elements */}
                <div style={{
                  position: 'absolute',
                  top: '-30%',
                  right: '-10%',
                  width: '150px',
                  height: '150px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  filter: 'blur(40px)'
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Heart size={18} fill="white" />
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, letterSpacing: '0.02em' }}>
                      UPGRADE TO PRO
                    </h3>
                  </div>

                  <p style={{ margin: '0 0 16px 0', fontSize: '11px', opacity: 0.95, lineHeight: '1.5' }}>
                    Unlock unlimited chekks, bulk analysis, and exclusive features
                  </p>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                      <Heart size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 700, display: 'block' }}>UNLIMITED CHEKKS</span>
                        <span style={{ fontSize: '10px', opacity: 0.75 }}>No weekly limits on profile analysis</span>
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

                          // Update backend
                          try {
                            const vibeToken = localStorage.getItem('vibeToken');
                            const response = await fetch(`${BACKEND_URL}/api/admin/set-tier`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${vibeToken}`
                              },
                              body: JSON.stringify({ tier })
                            });
                            if (response.ok) {
                              // Re-fetch usage to get new limits
                              const usageRes = await fetch(`${BACKEND_URL}/api/usage`, {
                                headers: { 'Authorization': `Bearer ${vibeToken}` }
                              });
                              if (usageRes.ok) {
                                const usageData = await usageRes.json();
                                setUsageInfo(usageData);
                              }
                            }
                          } catch (error) {
                            console.error('Failed to update tier:', error);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '6px',
                          background: user.tier === tier ? '#10b981' : 'white',
                          color: user.tier === tier ? 'white' : 'var(--text-dim)',
                          fontSize: '10px',
                          fontWeight: 600,
                          border: user.tier === tier ? 'none' : '1px solid #e5e7eb',
                          cursor: 'pointer'
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
                gap: '10px',
                border: '1px solid #dadce0',
                cursor: isLoggingIn ? 'default' : 'pointer',
                transition: 'all 0.15s ease-in-out',
                opacity: isLoggingIn ? 0.6 : 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
              }}
              onMouseOver={(e) => {
                if (!isLoggingIn) {
                  e.currentTarget.style.background = '#f8f9fa';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoggingIn) {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
              </svg>
              {isLoggingIn ? 'Signing in...' : 'Continue with Google'}
            </button>

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
  )
}
