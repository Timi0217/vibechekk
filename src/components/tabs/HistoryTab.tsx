import { ChevronDown, ChevronRight, Trash2, Ghost, User, Loader2, BadgeCheck } from 'lucide-react'
import { useVibeStore } from '../../store'
import { BACKEND_URL } from '../../constants'
import { RARITY_COLORS } from '../../constants/archetypes'
import {
  Rocket, BookOpen, Layers, Target, Cpu, Heart, Hammer,
  GitPullRequest, Code, Gem, Wrench, TrendingUp, Coffee, Compass, Zap
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

const stripThe = (name: string) => {
  if (!name) return name;
  return name.replace(/^THE\s+/i, '');
}

const getRarityClass = (rarity: string) => {
  const r = rarity?.toUpperCase();
  if (r === 'LEGENDARY') return 'legendary';
  if (r === 'ULTRA RARE') return 'ultra-rare';
  if (r === 'RARE') return 'rare';
  if (r === 'UNCOMMON') return 'uncommon';
  return 'common';
}

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

interface HistoryTabProps {
  fetchHistory: () => Promise<void>
  handleOpenReport: (report: any) => void
}

export default function HistoryTab({ fetchHistory, handleOpenReport }: HistoryTabProps) {
  const {
    user,
    history: historyFromStore,
    setHistory,
    archetypeFilter,
    setArchetypeFilter,
    showClearDropdown,
    setShowClearDropdown,
    pendingHandles,
    pendingAnalyses
  } = useVibeStore()

  // Safety check: ensure history is always an array
  const history = Array.isArray(historyFromStore) ? historyFromStore : [];

  return (
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
        const safePendingHandles = Array.isArray(pendingHandles) ? pendingHandles : [];
        const safePendingAnalyses = Array.isArray(pendingAnalyses) ? pendingAnalyses : [];
        const allPending = [
          ...safePendingHandles.map(h => ({ handle: h, name: undefined as string | undefined, avatar: '', timestamp: Date.now() })),
          ...safePendingAnalyses
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

        if (filteredHistory.length === 0 && safePendingHandles.length === 0 && safePendingAnalyses.length === 0) {
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
  )
}
