import { Loader2, TrendingUp, Lock, Search } from 'lucide-react'
import { useVibeStore } from '../../store'
import { RARITY_COLORS } from '../../constants/archetypes'
import {
  Rocket, BookOpen, Layers, Target, Cpu, Heart, Hammer,
  GitPullRequest, Code, Gem, Wrench, Coffee, Compass,
  Ghost, Zap
} from 'lucide-react'

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
  const color = RARITY_COLORS[rarity?.toUpperCase() || ''] || 'var(--brand-blue)'

  return <Icon size={size} color={color} />
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

interface AnalyticsTabProps {
  setActiveTab: (tab: 'analyze' | 'history' | 'analytics' | 'settings') => void
}

export default function AnalyticsTab({ setActiveTab }: AnalyticsTabProps) {
  const {
    user,
    authLoading,
    analytics,
    analyticsLoading,
    tierFilter,
    setTierFilter
  } = useVibeStore()

  return (
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
                {analytics.distribution && Object.entries(analytics.distribution).length > 0 ? (
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
  )
}
