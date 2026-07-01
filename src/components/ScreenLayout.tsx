import React from "react";

interface ScreenLayoutProps {
  readonly children: React.ReactNode;
}

export default function ScreenLayout({ children }: ScreenLayoutProps) {
  return (
    <div className="min-h-screen themed-page-bg flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 max-w-lg sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl w-full">
        {children}
      </div>
    </div>
  );
}
