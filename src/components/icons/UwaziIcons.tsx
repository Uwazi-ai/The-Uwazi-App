import React from "react";

interface IconProps {
  size?: number;
  className?: string;
}

const IconBase = ({
  children,
  size = 20,
  className = "",
}: {
  children: React.ReactNode;
  size?: number;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {children}
  </svg>
);

export const HomeIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <path
      d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V10.5Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      fill="currentColor" fillOpacity="0.12"
    />
  </IconBase>
);

export const CivicFeedIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08" />
    <path d="M7 8H17M7 12H14M7 16H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="14" y="12" width="3" height="4" rx="0.5" fill="currentColor" fillOpacity="0.5" />
  </IconBase>
);

export const AskUwaziIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <path
      d="M12 3C7.03 3 3 6.58 3 11C3 12.9 3.74 14.65 5 16.06L4 21L9.19 19.14C10.1 19.37 11.04 19.5 12 19.5C16.97 19.5 21 15.92 21 11.5C21 7.08 16.97 3.5 12 3.5L12 3Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      fill="currentColor" fillOpacity="0.10"
    />
    <path d="M9 11H9.01M12 11H12.01M15 11H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </IconBase>
);

export const LearnIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <path d="M4 19V6C4 4.9 4.9 4 6 4H18C19.1 4 20 4.9 20 6V19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4 19H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M9 4V12L12 10L15 12V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
    <path d="M4 19C4 19 4 21 6 21H18C20 21 20 19 20 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </IconBase>
);

export const VotingHubIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08" />
    <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconBase>
);

export const LegislationIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <path
      d="M14 3H6C4.9 3 4 3.9 4 5V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V9L14 3Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      fill="currentColor" fillOpacity="0.08"
    />
    <path d="M14 3V9H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 13H16M8 17H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </IconBase>
);

export const ProgressIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <rect x="3" y="14" width="4" height="7" rx="1" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" />
    <rect x="10" y="9" width="4" height="12" rx="1" fill="currentColor" fillOpacity="0.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="17" y="4" width="4" height="17" rx="1" fill="currentColor" fillOpacity="0.8" stroke="currentColor" strokeWidth="1.5" />
  </IconBase>
);

export const SettingsIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
    <path
      d="M12 2L13.09 5.26C13.67 5.44 14.21 5.72 14.69 6.07L18 4.58L19.42 6L17.93 9.31C18.28 9.79 18.56 10.33 18.74 10.91L22 12L18.74 13.09C18.56 13.67 18.28 14.21 17.93 14.69L19.42 18L18 19.42L14.69 17.93C14.21 18.28 13.67 18.56 13.09 18.74L12 22L10.91 18.74C10.33 18.56 9.79 18.28 9.31 17.93L6 19.42L4.58 18L6.07 14.69C5.72 14.21 5.44 13.67 5.26 13.09L2 12L5.26 10.91C5.44 10.33 5.72 9.79 6.07 9.31L4.58 6L6 4.58L9.31 6.07C9.79 5.72 10.33 5.44 10.91 5.26L12 2Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      fill="currentColor" fillOpacity="0.08"
    />
  </IconBase>
);

export const AdminOverviewIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
    <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
    <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
    <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
  </IconBase>
);

export const UsersIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
    <path d="M3 21C3 17.69 5.69 15 9 15C10.56 15 12 15.6 13.1 16.59" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="17" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
    <path d="M14.5 21H19.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M17 18.5V23.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </IconBase>
);

export const AnalyticsIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <path d="M3 17L8 12L12 15L17 9L21 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 21H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="12" r="1.5" fill="currentColor" fillOpacity="0.5" />
    <circle cx="12" cy="15" r="1.5" fill="currentColor" fillOpacity="0.5" />
    <circle cx="17" cy="9" r="1.5" fill="currentColor" fillOpacity="0.5" />
    <circle cx="21" cy="11" r="1.5" fill="currentColor" fillOpacity="0.5" />
  </IconBase>
);

export const IntelligenceIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <path
      d="M12 3C8.69 3 6 5.69 6 9C6 10.56 6.58 11.97 7.54 13.06C6.59 13.56 6 14.57 6 15.75C6 17.54 7.46 19 9.25 19H14.75C16.54 19 18 17.54 18 15.75C18 14.57 17.41 13.56 16.46 13.06C17.42 11.97 18 10.56 18 9C18 5.69 15.31 3 12 3Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      fill="currentColor" fillOpacity="0.1"
    />
    <path d="M9.5 9.5C9.5 8.12 10.62 7 12 7C13.38 7 14.5 8.12 14.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M10 19V21M14 19V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </IconBase>
);

export const LessonManagerIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <path
      d="M4 19V6C4 4.9 4.9 4 6 4H15L20 9V19C20 20.1 19.1 21 18 21H6C4.9 21 4 20.1 4 19Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      fill="currentColor" fillOpacity="0.08"
    />
    <path d="M15 4V9H20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M9 13L11 11L16 16L14 18L9 13Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.3" />
    <path d="M14 18L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </IconBase>
);

export const AlertsIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22Z" fill="currentColor" fillOpacity="0.5" />
    <path
      d="M6.26 3.67C6.26 3.67 4 6.15 4 12C4 16.42 6.42 18 6.42 18H17.58C17.58 18 20 16.42 20 12C20 6.15 17.74 3.67 17.74 3.67"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      fill="currentColor" fillOpacity="0.10"
    />
    <path d="M12 2V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="18" cy="4" r="3" fill="#9bd34b" stroke="var(--bg-base)" strokeWidth="1.5" />
  </IconBase>
);

export const CRMIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <rect x="4" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08" />
    <circle cx="11" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
    <path d="M6 18C6 15.79 8.24 14 11 14C13.76 14 16 15.79 16 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M17 2H20C20.55 2 21 2.45 21 3V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M17 22H20C20.55 22 21 21.55 21 21V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </IconBase>
);

export const SurveysIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08" />
    <path d="M9 3V5C9 5.55 9.45 6 10 6H14C14.55 6 15 5.55 15 5V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M9 11L10.5 12.5L14 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 16H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </IconBase>
);

export const CivicContentIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <path d="M12 2L22 7L12 12L2 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </IconBase>
);

export const PlatformSettingsIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
    <path
      d="M12 2L13.09 5.26C13.67 5.44 14.21 5.72 14.69 6.07L18 4.58L19.42 6L17.93 9.31C18.28 9.79 18.56 10.33 18.74 10.91L22 12L18.74 13.09C18.56 13.67 18.28 14.21 17.93 14.69L19.42 18L18 19.42L14.69 17.93C14.21 18.28 13.67 18.56 13.09 18.74L12 22L10.91 18.74C10.33 18.56 9.79 18.28 9.31 17.93L6 19.42L4.58 18L6.07 14.69C5.72 14.21 5.44 13.67 5.26 13.09L2 12L5.26 10.91C5.44 10.33 5.72 9.79 6.07 9.31L4.58 6L6 4.58L9.31 6.07C9.79 5.72 10.33 5.44 10.91 5.26L12 2Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      fill="currentColor" fillOpacity="0.08"
    />
  </IconBase>
);

export const SignOutIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <path d="M15 3H19C19.55 3 20 3.45 20 4V20C20 20.55 19.55 21 19 21H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 12H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </IconBase>
);

export const SearchIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08" />
    <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </IconBase>
);

export const NotificationIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <path
      d="M6 10C6 6.69 8.69 4 12 4C15.31 4 18 6.69 18 10V15L20 17H4L6 15V10Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      fill="currentColor" fillOpacity="0.10"
    />
    <path d="M10 17C10 18.1 10.9 19 12 19C13.1 19 14 18.1 14 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </IconBase>
);

export const LocationIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <path
      d="M12 2C8.69 2 6 4.69 6 8C6 12.5 12 20 12 20C12 20 18 12.5 18 8C18 4.69 15.31 2 12 2Z"
      stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.12"
    />
    <circle cx="12" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.3" />
  </IconBase>
);

export const SavedIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <path d="M5 5C5 3.9 5.9 3 7 3H17C18.1 3 19 3.9 19 5V21L12 17L5 21V5Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      fill="currentColor" fillOpacity="0.12"
    />
  </IconBase>
);

export const WatchIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08" />
    <path d="M10 8L17 12L10 16V8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.3" />
  </IconBase>
);

export const MoreIcon = ({ size = 20, className = "" }: IconProps) => (
  <IconBase size={size} className={className}>
    <circle cx="12" cy="5" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="19" r="1.5" fill="currentColor" />
  </IconBase>
);
