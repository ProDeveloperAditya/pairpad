import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

/**
 * Accent button with a continuous light-sweep shimmer across its surface.
 * Drop-in replacement for `.accent-button` on primary CTAs.
 */
export function ShimmerButton({ children, className = '', ...props }: ShimmerButtonProps) {
  return (
    <button className={`shimmer-button ${className}`} {...props}>
      <span className="shimmer-button__shine" aria-hidden="true" />
      <span className="shimmer-button__label">{children}</span>
    </button>
  );
}
