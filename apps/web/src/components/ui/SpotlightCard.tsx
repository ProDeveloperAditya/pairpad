import { useRef, type CSSProperties, type HTMLAttributes, type MouseEvent } from 'react';

interface SpotlightCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Color of the cursor-following glow. */
  glowColor?: string;
}

/**
 * Wraps content with a radial glow that follows the cursor on hover.
 * Pass layout/styling classes via `className` (it merges with the spotlight
 * base class) so it can stand in for an existing styled container.
 */
export function SpotlightCard({
  children,
  className = '',
  glowColor = 'rgba(99, 102, 241, 0.25)',
  style,
  ...rest
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    element.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    element.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
  }

  const mergedStyle = { ...style, '--spot-color': glowColor } as CSSProperties;

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`spotlight-card ${className}`}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </div>
  );
}
