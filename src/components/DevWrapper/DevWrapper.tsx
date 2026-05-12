import React from 'react';

interface DevWrapperProps {
  children: React.ReactNode;
  inDevelopment?: boolean | number; // Supports passing '1' as you requested
}

export default function DevWrapper({ children, inDevelopment }: DevWrapperProps) {
  // If not in development, just render the page normally
  if (!inDevelopment || inDevelopment === 0) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen">
      {/* 1. The Development Overlay */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md border-2 border-dashed border-amber-500 p-8 rounded-2xl shadow-2xl text-center transform -rotate-2 pointer-events-auto">
          <div className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full w-max mx-auto mb-4 uppercase tracking-widest">
            Work in Progress
          </div>
          <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">
            Under Development
          </h1>
          <p className="text-gray-500 font-medium mt-2 max-w-xs">
            We're currently building this feature. Check back soon for the full experience!
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <span className="w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
            <span className="w-3 h-3 bg-amber-400 rounded-full animate-pulse delay-75" />
            <span className="w-3 h-3 bg-amber-400 rounded-full animate-pulse delay-150" />
          </div>
        </div>
      </div>

      {/* 2. The Blurred Content */}
      <div className="blur-[5px] pointer-events-none select-none grayscale-[30%]">
        {children}
      </div>
    </div>
  );
}