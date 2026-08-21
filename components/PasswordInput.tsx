'use client';

import { useState } from 'react';

/** Password field with a show/hide eye. */
export default function PasswordInput({
  name, value, onChange, autoComplete, placeholder, required = true, autoFocus = false,
}: {
  name: string;
  value?: string;
  onChange?: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        className="inp"
        style={{ paddingRight: '2.6rem', width: '100%' }}
        type={show ? 'text' : 'password'}
        name={name}
        required={required}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute', right: '.5rem', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', padding: '.25rem',
          lineHeight: 0, color: 'var(--muted)',
        }}
      >
        {show ? (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <path d="M1 1l22 22" />
          </svg>
        ) : (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
