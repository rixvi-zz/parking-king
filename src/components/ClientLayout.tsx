'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();

  // Handle any client-side layout logic here
  useEffect(() => {
    // Close any open dropdowns when route changes
    const handleRouteChange = () => {
      // This can be used for global state management if needed
    };

    handleRouteChange();
  }, [pathname]);

  return <>{children}</>;
}