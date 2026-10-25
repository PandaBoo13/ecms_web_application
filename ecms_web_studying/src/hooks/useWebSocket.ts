// src/hooks/useWebSocket.ts
import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import {
  connectWs,
  disconnectWs,
  subscribeWs,
  onWsStatusChange,
} from '@/services/wsClient';

export const useWebSocket = () => {
  const { user, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.accountId) {
      disconnectWs();
      return;
    }
    connectWs();
  }, [isAuthenticated, user?.accountId]);

  useEffect(() => {
    return onWsStatusChange(setConnected);
  }, []);

  return {
    connected,
    subscribe: subscribeWs,
  };
};

export default useWebSocket;