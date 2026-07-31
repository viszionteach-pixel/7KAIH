import React from 'react';

interface SchoolLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-32 h-32',
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${sizeClasses[size]} ${className}`}>
      <img
        src="/logo_smpn10.jpg"
        alt="Logo Official SMPN 10 Balikpapan"
        className="w-full h-full object-contain rounded-full drop-shadow-md transition-all duration-300 hover:scale-105"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};



