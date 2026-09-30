import React from 'react';

/** Simple perfume bottle outline — matches Lucide-style stroke icons. */
const PerfumeBottleIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden
    {...props}
  >
    <path
      d="M10 2.25h4a.75.75 0 0 1 .75.75V4l.65 2.6a.75.75 0 0 1-.73.9h-4.34a.75.75 0 0 1-.73-.9L9.25 4V3a.75.75 0 0 1 .75-.75Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M9.25 7.5h5.5l1.15 13.8a1.75 1.75 0 0 1-1.74 1.95H9.84a1.75 1.75 0 0 1-1.74-1.95L9.25 7.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M9.75 11.25h4.5M9.75 14h4.5"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      opacity={0.55}
    />
    <circle cx="12" cy="16.25" r="1" fill="currentColor" opacity={0.45} />
  </svg>
);

export default PerfumeBottleIcon;
