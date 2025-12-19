import { ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';

interface SafeAreaWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component that applies safe area insets for native apps.
 * Uses CSS env() variables for iOS and Android notch/navigation handling.
 */
const SafeAreaWrapper = ({ children }: SafeAreaWrapperProps) => {
  const isNative = Capacitor.isNativePlatform();
  
  if (!isNative) {
    return <>{children}</>;
  }

  return (
    <div className="safe-area-wrapper min-h-screen">
      {children}
    </div>
  );
};

export default SafeAreaWrapper;
