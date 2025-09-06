import type { SVGProps } from 'react';

export default function SudhaarSetuLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8 3v2" />
      <path d="M16 3v2" />
      <path d="M12 17.5a2.5 2.5 0 0 1-2.5-2.5c0-2.25 2.5-4.5 2.5-4.5s2.5 2.25 2.5 4.5A2.5 2.5 0 0 1 12 17.5Z" />
      <path d="M20 9.5c0-4.5-3.5-8-8-8s-8 3.5-8 8c0 .4.1.8.1 1.2" />
      <path d="M14.5 9.5A6.5 6.5 0 0 1 21 16v2h-2" />
      <path d="M9.5 9.5A6.5 6.5 0 0 0 3 16v2h2" />
      <path d="M7 21h10" />
    </svg>
  );
}
