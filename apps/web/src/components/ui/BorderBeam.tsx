import type { CSSProperties } from 'react';

interface BorderBeamProps {
  /** Time for one full loop around the border, in seconds. */
  duration?: number;
  /** Beam color — accepts any CSS color, including CSS variables. */
  color?: string;
  /** Border thickness in pixels. */
  borderWidth?: number;
  className?: string;
}

/**
 * Animated beam that travels around the border of its (relatively positioned,
 * overflow-hidden) parent. Inherits the parent's border-radius. Purely
 * decorative — rendered behind interaction via pointer-events: none.
 */
export function BorderBeam({
  duration = 4,
  color = 'var(--accent)',
  borderWidth = 2,
  className = '',
}: BorderBeamProps) {
  const style = {
    '--beam-duration': `${duration}s`,
    '--beam-color': color,
    padding: `${borderWidth}px`,
  } as CSSProperties;

  return <div aria-hidden="true" className={`border-beam ${className}`} style={style} />;
}
