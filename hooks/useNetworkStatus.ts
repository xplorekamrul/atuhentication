import { useEffect, useState } from 'react';

export function useNetworkStatus() {
   const [isOnline, setIsOnline] = useState(true);
   const [wasOffline, setWasOffline] = useState(false);

   useEffect(() => {
      // Check initial status
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
         setIsOnline(true);
         setWasOffline(false);
      }; 

      const handleOffline = () => {
         setIsOnline(false);
         setWasOffline(true);
      };

      // Add event listeners
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Cleanup
      return () => {
         window.removeEventListener('online', handleOnline);
         window.removeEventListener('offline', handleOffline);
      };
   }, []);

   return { isOnline, wasOffline };
}