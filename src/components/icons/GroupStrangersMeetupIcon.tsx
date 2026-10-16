import React from 'react';

/** Three connected figures — white on CTAs via `currentColor`. */
const GroupStrangersMeetupIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    viewBox="0 0 80 50"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden
    {...props}
  >
    <circle cx="14.5" cy="9" r="5.4" />
    <path d="M14.5 14.5 8.5 22 6 42.5 12.5 41.5 14.5 35 16.5 41.5 23 42.5 20.5 22 14.5 14.5Z" />

    <circle cx="40" cy="8" r="5.9" />
    <path d="M40 14 26.5 20 22.5 43 31.5 43 40 30.5 48.5 43 57.5 43 53.5 20 40 14Z" />

    <circle cx="65.5" cy="9" r="5.4" />
    <path d="M65.5 14.5 71.5 22 74 42.5 67.5 41.5 65.5 35 63.5 41.5 57 42.5 59.5 22 65.5 14.5Z" />
  </svg>
);

export default GroupStrangersMeetupIcon;
