import { useState, useRef, useEffect } from 'react';

function SearchableSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedLabel = options.find(([id]) => id === value)?.[1] ?? '';

  const filtered = options.filter(([, name]) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  // close on outside click
  useEffect(() => {
    const handleClick = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // focus search input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '10px 12px',
          background: 'var(--surface2)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          color: value ? 'var(--text)' : 'var(--text-muted)',
          fontSize: '0.9rem',
          fontFamily: 'DM Sans, sans-serif',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          transition: 'border-color 0.15s',
        }}
      >
        <span>{value ? selectedLabel : placeholder}</span>
        <span style={{
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.15s'
        }}>▼</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          zIndex: 100,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}>
          {/* Search input */}
          <div style={{ padding: '8px' }}>
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search stations..."
              style={{
                width: '100%',
                padding: '7px 10px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text)',
                fontSize: '0.85rem',
                fontFamily: 'DM Sans, sans-serif',
                outline: 'none',
              }}
            />
          </div>

          {/* Options list */}
          <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{
                padding: '10px 12px',
                color: 'var(--text-muted)',
                fontSize: '0.85rem'
              }}>
                No stations found
              </div>
            )}
            {filtered.map(([id, name]) => (
              <div
                key={id}
                onClick={() => handleSelect(id)}
                style={{
                  padding: '8px 12px',
                  fontSize: '0.875rem',
                  color: id === value ? 'var(--accent)' : 'var(--text)',
                  background: id === value ? 'var(--surface)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                onMouseLeave={e => e.currentTarget.style.background = id === value ? 'var(--surface)' : 'transparent'}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;