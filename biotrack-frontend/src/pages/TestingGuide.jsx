import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'

export default function TestingGuide() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/FRONTEND_TESTING_GUIDE.txt')
      .then(r => r.text())
      .then(text => { setContent(text); setLoading(false) })
      .catch(() => { setContent('Failed to load guide.'); setLoading(false) })
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'FRONTEND_TESTING_GUIDE.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Parse the raw text into sections for nice rendering
  const renderContent = () => {
    if (!content) return null

    const lines = content.split('\n')
    const elements = []
    let key = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Highlight search matches
      const isMatch = search && line.toLowerCase().includes(search.toLowerCase())

      // Section dividers (===)
      if (/^={10,}$/.test(trimmed)) {
        elements.push(<div key={key++} style={{ borderTop: '2px solid #e2e8f0', margin: '16px 0' }} />)
        continue
      }

      // Section headers (lines between === dividers that are ALL CAPS)
      if (/^[A-Z\s\d—–\-&/:]+$/.test(trimmed) && trimmed.length > 4 && trimmed.length < 80 && !trimmed.startsWith('-')) {
        elements.push(
          <h2 key={key++} style={{
            fontSize: '14px', fontWeight: 700, color: '#1e3a5f',
            background: '#e8f0fe', padding: '8px 14px', borderRadius: '6px',
            borderLeft: '4px solid #1a56db', margin: '16px 0 8px',
            letterSpacing: '0.3px', display: isMatch ? 'block' : undefined,
            boxShadow: isMatch ? '0 0 0 2px #f59e0b' : undefined
          }}>{trimmed}</h2>
        )
        continue
      }

      // Phase / Step headers (--- TEXT ---)
      if (/^---/.test(trimmed)) {
        const label = trimmed.replace(/^---\s*/, '').replace(/\s*---$/, '')
        elements.push(
          <div key={key++} style={{
            fontSize: '13px', fontWeight: 600, color: '#0f172a',
            background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px',
            margin: '12px 0 6px', borderLeft: '3px solid #64748b',
            boxShadow: isMatch ? '0 0 0 2px #f59e0b' : undefined
          }}>{label}</div>
        )
        continue
      }

      // Numbered steps (  STEP N: ... or N. ...)
      if (/^\s*(STEP\s+\d+:|STEP \d+\.)/.test(line)) {
        elements.push(
          <div key={key++} style={{
            fontSize: '13px', fontWeight: 600, color: '#1a56db',
            padding: '4px 0 2px', marginTop: '10px',
            boxShadow: isMatch ? '0 0 0 2px #f59e0b' : undefined
          }}>{line}</div>
        )
        continue
      }

      // ✅ / ❌ lines
      if (trimmed.startsWith('✅') || trimmed.startsWith('❌')) {
        const isOk = trimmed.startsWith('✅')
        elements.push(
          <div key={key++} style={{
            fontSize: '13px', padding: '2px 0',
            color: isOk ? '#059669' : '#dc2626',
            fontWeight: 500,
            background: isMatch ? '#fef9c3' : undefined
          }}>{line}</div>
        )
        continue
      }

      // ERROR / FIX lines
      if (/^(ERROR|FIX)\s*:/.test(trimmed)) {
        const isError = trimmed.startsWith('ERROR')
        elements.push(
          <div key={key++} style={{
            fontSize: '13px', padding: '2px 8px',
            color: isError ? '#dc2626' : '#059669',
            fontWeight: 600, fontFamily: 'monospace',
            background: isMatch ? '#fef9c3' : (isError ? '#fff5f5' : '#f0fdf4'),
            borderRadius: '4px', margin: '2px 0'
          }}>{line}</div>
        )
        continue
      }

      // Table rows (|...|)
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed.split('|').filter(c => c.trim())
        const isSeparator = cells.every(c => /^[-\s]+$/.test(c))
        if (isSeparator) { elements.push(<div key={key++} />) ; continue }
        elements.push(
          <div key={key++} style={{
            display: 'flex', gap: 0, fontFamily: 'monospace', fontSize: '12.5px',
            borderBottom: '1px solid #e2e8f0', padding: '5px 0',
            background: isMatch ? '#fef9c3' : undefined
          }}>
            {cells.map((c, ci) => (
              <div key={ci} style={{ flex: 1, padding: '0 8px', color: ci === 0 ? '#1e293b' : '#475569' }}>{c.trim()}</div>
            ))}
          </div>
        )
        continue
      }

      // Code / command lines (indented with >  or starting with fetch/ALTER/npm/cd)
      if (/^\s*(>|fetch\(|ALTER|npm|cd |http)/.test(line)) {
        elements.push(
          <pre key={key++} style={{
            fontSize: '12px', background: '#0f172a', color: '#e2e8f0',
            padding: '8px 12px', borderRadius: '6px', margin: '6px 0',
            overflowX: 'auto', fontFamily: 'monospace', lineHeight: 1.5,
            boxShadow: isMatch ? '0 0 0 2px #f59e0b' : undefined
          }}>{line.replace(/^\s*>\s*/, '')}</pre>
        )
        continue
      }

      // Blank lines
      if (trimmed === '') {
        elements.push(<div key={key++} style={{ height: '6px' }} />)
        continue
      }

      // Default — regular text
      elements.push(
        <div key={key++} style={{
          fontSize: '13px', color: '#334155', lineHeight: '1.7',
          padding: '1px 0',
          background: isMatch ? '#fef9c3' : undefined
        }}>{line}</div>
      )
    }

    return elements
  }

  const phases = [
    'PHASE 1', 'PHASE 2', 'PHASE 3', 'PHASE 4', 'PHASE 5',
    'PHASE 6', 'PHASE 7', 'PHASE 8', 'PHASE 9', 'PHASE 10', 'PHASE 11'
  ]

  const scrollToPhase = (phase) => {
    const text = document.getElementById('guide-content')
    if (!text) return
    const allDivs = text.querySelectorAll('h2')
    for (const div of allDivs) {
      if (div.textContent.includes(phase)) {
        div.scrollIntoView({ behavior: 'smooth', block: 'start' })
        break
      }
    }
  }

  return (
    <>
      <Navbar title="Frontend Testing Guide" />
      <div className="page-content">
        <div className="page-header">
          <h2>Frontend Testing Guide</h2>
          <p>Complete step-by-step guide for testing every feature of the BioTrack platform</p>
        </div>

        {/* Toolbar */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <input
                className="search-input"
                placeholder="🔍 Search in guide..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 240 }}
              />
              <button className="btn btn-outline btn-sm" onClick={handleCopy}>
                {copied ? '✅ Copied!' : '📋 Copy All'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleDownload}>
                ⬇️ Download .txt
              </button>
              {search && (
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Highlighted: "{search}"
                </span>
              )}
            </div>

            {/* Phase quick-jump */}
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#64748b', alignSelf: 'center' }}>Jump to:</span>
              {phases.map(p => (
                <button
                  key={p}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  onClick={() => scrollToPhase(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Guide content */}
        <div className="card">
          <div className="card-body" id="guide-content" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '24px 28px' }}>
            {loading ? (
              <div className="loading"><div className="spinner" /> Loading guide...</div>
            ) : (
              <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                {renderContent()}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
