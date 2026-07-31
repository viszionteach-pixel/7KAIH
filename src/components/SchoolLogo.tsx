import React from 'react';
import { getStoredSchoolConfig } from '../services/storage';

interface SchoolLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  customLogoUrl?: string;
  onClick?: () => void;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({ className = '', size = 'md', customLogoUrl, onClick }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-32 h-32',
  };

  const storedConfig = getStoredSchoolConfig();
  const activeLogo = customLogoUrl || storedConfig.logoUrl || '/logo_smpn10.jpg';

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none ${sizeClasses[size]} ${className} ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
      <img
        src={activeLogo}
        alt="Logo Sekolah"
        className="w-full h-full object-contain rounded-full drop-shadow-md transition-all duration-300 hover:scale-105"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};



