'use client';

import { useState } from 'react';

/**
 * The NCCHCA wordmark, with the original "NC" tile as a fallback if the logo
 * cannot be loaded. `tone` picks the variant that reads against the background:
 * "light" for the navy top bar, "dark" for white cards.
 */
export default function Brandmark({
  height = 34,
  tone = 'light',
}: {
  height?: number;
  tone?: 'light' | 'dark';
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="mark" style={{ width: height, height, fontSize: height * 0.22 }}>
        NC
      </div>
    );
  }

  return (
    <img
      className="logo"
      src={tone === 'dark' ? '/logo?v=dark' : '/logo'}
      alt="North Carolina Community Health Center Association"
      style={{ height }}
      onError={() => setFailed(true)}
    />
  );
}
