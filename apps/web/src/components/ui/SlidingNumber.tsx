import { motion } from 'motion/react';

interface SlidingNumberProps {
  value: number;
  className?: string;
}

function Digit({ digit }: { digit: number }) {
  return (
    <span
      className="inline-block overflow-hidden"
      style={{ height: '1em', lineHeight: 1 }}
    >
      <motion.span
        className="flex flex-col"
        animate={{ y: `-${digit}em` }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} style={{ height: '1em', lineHeight: 1 }}>
            {i}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/**
 * Renders an integer where each digit slides vertically into place on change.
 * Non-digit characters (e.g. separators) are rendered statically.
 */
export function SlidingNumber({ value, className = '' }: SlidingNumberProps) {
  const characters = Math.round(value).toString().split('');

  return (
    <span className={`inline-flex ${className}`} style={{ lineHeight: 1 }}>
      {characters.map((character, index) =>
        /\d/.test(character) ? (
          <Digit key={index} digit={Number(character)} />
        ) : (
          <span key={index}>{character}</span>
        )
      )}
    </span>
  );
}
