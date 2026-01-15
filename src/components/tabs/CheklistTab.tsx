import { useState, useEffect } from 'react'
import { Search, User, Code, TrendingUp, Lock, Loader } from 'lucide-react'
import { useVibeStore } from '../../store'
import { BACKEND_URL, ARCHETYPES } from '../../constants'

interface SearchResult {
  githubHandle: string
  name: string
  avatarUrl: string
  email: string
  seniority: string
  archetype: string
  matchScore: number
  reachabilityScore: number
  reachabilityBadge: {
    color: 'green' | 'yellow' | 'red'
    label: string
    emoji: string
  }
  reachabilityIndicators: string[]
  stats: {
    totalCommits: number
    totalRepos: number
    totalStars: number
    languages: string[]
  }
}

interface CheklistTabProps {
  handleManualSearch: (handle: string) => void
  handleUpgradeToPro: () => Promise<void>
}

// All available programming languages (popular ones)
const LANGUAGES = [
  'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java',
  'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala',
  'Dart', 'Elixir', 'Haskell', 'Lua', 'R', 'Julia', 'Clojure'
]

// Flatten all archetypes for dropdown
const ALL_ARCHETYPES = Object.values(ARCHETYPES).flat().filter(a => a !== 'THE GHOST')

export default function CheklistTab({ handleManualSearch, handleUpgradeToPro }: CheklistTabProps) {
  const { user } = useVibeStore()

  // Search filters
  const [reverseUsername, setReverseUsername] = useState('')
  const [selectedArchetype, setSelectedArchetype] = useState('')
  const [selectedSeniority, setSelectedSeniority] = useState('')
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])

  // Results and state
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchesRemaining, setSearchesRemaining] = useState<number | null>(null)
  const [error, setError] = useState('')

  // Fetch remaining searches on mount
  useEffect(() => {
    if (user?.tier === 'PRO') {
      fetchSearchesRemaining()
    }
  }, [user])

  const fetchSearchesRemaining = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const res = await fetch(`${BACKEND_URL}/api/chekklist/searches-remaining`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setSearchesRemaining(data.remaining)
      }
    } catch (err) {
      console.error('[Chekklist] Error fetching searches remaining:', err)
    }
  }

  const handleSearch = async () => {
    if (user?.tier !== 'PRO') {
      setError('Chekklist is a PRO feature. Upgrade to access developer search.')
      return
    }

    if (!reverseUsername && !selectedArchetype && !selectedSeniority && selectedLanguages.length === 0) {
      setError('Please select at least one search criteria')
      return
    }

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        setError('Please sign in to use Chekklist')
        setLoading(false)
        return
      }

      const res = await fetch(`${BACKEND_URL}/api/chekklist/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reverseUsername: reverseUsername || undefined,
          archetype: selectedArchetype || undefined,
          seniority: selectedSeniority || undefined,
          languages: selectedLanguages.length > 0 ? selectedLanguages : undefined
        })
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'CHEKKLIST_LIMIT_REACHED') {
          setError(`You've used all your searches for today. Resets at midnight UTC.`)
        } else if (data.code === 'CHEKKLIST_PRO_ONLY') {
          setError('Chekklist is a PRO feature. Upgrade to continue.')
        } else {
          setError(data.error || 'Search failed')
        }
        setLoading(false)
        return
      }

      setResults(data.results || [])
      setSearchesRemaining(data.searchesRemaining)

    } catch (err: any) {
      console.error('[Chekklist] Search error:', err)
      setError('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang)
        ? prev.filter(l => l !== lang)
        : [...prev, lang]
    )
  }

  const clearFilters = () => {
    setReverseUsername('')
    setSelectedArchetype('')
    setSelectedSeniority('')
    setSelectedLanguages([])
    setResults([])
    setError('')
  }

  // Show upgrade prompt for non-PRO users
  if (user?.tier !== 'PRO') {
    return (
      <div className="search-box">
        <h2 className="section-title" style={{ textAlign: 'center', textTransform: 'uppercase' }}>
          CHEKKLIST
        </h2>
        <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '-4px' }}>
          Smart developer search • Find your next teammate
        </div>

        <div style={{
          padding: '32px 20px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #451a03 0%, #2a1005 100%)',
          color: 'white',
          textAlign: 'center',
          marginTop: '20px'
        }}>
          <Lock size={48} style={{ margin: '0 auto 16px', opacity: 0.9 }} />
          <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 800, letterSpacing: '0.5px' }}>
            PRO FEATURE
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '12px', lineHeight: '1.6', opacity: 0.9 }}>
            Search for developers by skills, seniority, archetype, or find profiles similar to your best engineers.
          </p>
          <button
            className="primary-btn"
            onClick={handleUpgradeToPro}
            style={{
              background: 'white',
              color: 'var(--accent)',
              fontWeight: 800,
              width: '100%'
            }}
          >
            UPGRADE TO PRO
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="search-box">
      <h2 className="section-title" style={{ textAlign: 'center', textTransform: 'uppercase' }}>
        CHEKKLIST
      </h2>
      <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '-4px' }}>
        Smart developer search • Find your next teammate
      </div>

      {searchesRemaining !== null && (
        <div style={{
          textAlign: 'center',
          fontSize: '10px',
          color: searchesRemaining > 0 ? 'var(--text-dim)' : '#dc2626',
          fontWeight: 600,
          letterSpacing: '0.5px',
          marginBottom: '12px'
        }}>
          {searchesRemaining > 0 ? `${searchesRemaining} SEARCH${searchesRemaining !== 1 ? 'ES' : ''} REMAINING TODAY` : 'NO SEARCHES LEFT TODAY'}
        </div>
      )}

      {/* Search Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Reverse Search */}
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <User size={12} style={{ display: 'inline', marginRight: '4px', position: 'relative', top: '1px' }} />
            Find developers like (optional)
          </label>
          <input
            className="input-field"
            placeholder="GitHub username"
            value={reverseUsername}
            onChange={e => setReverseUsername(e.target.value)}
            style={{ fontSize: '12px' }}
          />
        </div>

        {/* Archetype */}
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <TrendingUp size={12} style={{ display: 'inline', marginRight: '4px', position: 'relative', top: '1px' }} />
            Archetype (optional)
          </label>
          <select
            className="input-field"
            value={selectedArchetype}
            onChange={e => setSelectedArchetype(e.target.value)}
            style={{ fontSize: '12px' }}
          >
            <option value="">Any</option>
            {ALL_ARCHETYPES.map(arch => (
              <option key={arch} value={arch}>{arch}</option>
            ))}
          </select>
        </div>

        {/* Seniority */}
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Seniority (optional)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['Junior', 'Mid', 'Senior'].map(level => (
              <button
                key={level}
                onClick={() => setSelectedSeniority(selectedSeniority === level ? '' : level)}
                style={{
                  flex: 1,
                  padding: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: selectedSeniority === level ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: selectedSeniority === level ? 'var(--accent)' : 'transparent',
                  color: selectedSeniority === level ? 'white' : 'var(--text)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Code size={12} style={{ display: 'inline', marginRight: '4px', position: 'relative', top: '1px' }} />
            Languages (optional, multi-select)
          </label>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            maxHeight: '120px',
            overflowY: 'auto',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)'
          }}>
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                onClick={() => toggleLanguage(lang)}
                style={{
                  padding: '4px 10px',
                  fontSize: '10px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: selectedLanguages.includes(lang) ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: selectedLanguages.includes(lang) ? 'var(--accent)' : 'transparent',
                  color: selectedLanguages.includes(lang) ? 'white' : 'var(--text)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button
          className="primary-btn"
          onClick={handleSearch}
          disabled={loading || searchesRemaining === 0}
          style={{ flex: 1, minHeight: '44px' }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <Loader size={16} className="spin" />
              <span>SEARCHING...</span>
            </div>
          ) : (
            <>
              <Search size={16} style={{ display: 'inline', marginRight: '6px', position: 'relative', top: '2px' }} />
              SEARCH
            </>
          )}
        </button>
        {results.length > 0 && (
          <button
            className="secondary-btn"
            onClick={clearFilters}
            style={{ padding: '0 16px', fontSize: '11px', fontWeight: 700 }}
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          borderRadius: '8px',
          background: '#fee2e2',
          color: '#dc2626',
          fontSize: '11px',
          fontWeight: 600,
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px'
          }}>
            {results.length} Results
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
            {results.map(result => (
              <div
                key={result.githubHandle}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}
              >
                <img
                  src={result.avatarUrl}
                  alt={result.name}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    border: '2px solid var(--border)'
                  }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                      {result.name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      @{result.githubHandle}
                    </span>
                  </div>

                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '6px' }}>
                    {result.seniority} • {result.archetype} • Match: {result.matchScore}%
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', fontSize: '10px' }}>
                    <span>{result.reachabilityBadge.emoji}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-dim)' }}>
                      {result.reachabilityBadge.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                    {result.stats.totalCommits.toLocaleString()} commits • {result.stats.totalRepos} repos • {result.stats.totalStars} stars
                  </div>

                  <button
                    className="primary-btn"
                    onClick={() => handleManualSearch(result.githubHandle)}
                    style={{ fontSize: '10px', padding: '6px 12px', height: 'auto', fontWeight: 700 }}
                  >
                    ANALYZE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div style={{
          marginTop: '32px',
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--text-dim)',
          padding: '20px'
        }}>
          Select filters and click Search to find developers
        </div>
      )}
    </div>
  )
}
