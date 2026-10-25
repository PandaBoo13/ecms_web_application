// src/services/wsClient.ts
import { Client } from '@stomp/stompjs';
import type { StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

type MsgCallback = (data: any) => void;
type StatusListener = (connected: boolean) => void;

let client: Client | null = null;
let activating = false;
let connected = false;

const statusListeners = new Set<StatusListener>();
const pending: Array<{
  destination: string;
  callback: MsgCallback;
  unsub: { fn: (() => void) | null };
}> = [];

const notifyStatus = (next: boolean) => {
  connected = next;
  statusListeners.forEach((fn) => {
    try { fn(next); } catch (e) { console.warn('[WS] status listener error', e); }
  });
};

export const connectWs = () => {
  if (client || activating) return;
  activating = true;

  client = new Client({
    webSocketFactory: () => new SockJS('/ws'),
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    onConnect: () => {
      console.log('[WS] Connected');
      notifyStatus(true);

      // Flush queue
      pending.forEach((p) => {
        try {
          const sub: StompSubscription = client!.subscribe(p.destination, (msg) => {
            try { p.callback(JSON.parse(msg.body)); } catch { p.callback(msg.body); }
          });
          p.unsub.fn = () => sub.unsubscribe();
        } catch (e) {
          console.warn('[WS] flush sub error', e);
        }
      });
      pending.length = 0;
    },

    onDisconnect: () => {
      console.log('[WS] Disconnected');
      notifyStatus(false);
    },

    onWebSocketClose: () => {
      notifyStatus(false);
    },

    onStompError: (frame) => {
      console.warn('[WS] STOMP error:', frame.headers['message']);
      notifyStatus(false);
    },
  });

  client.activate();
  activating = false;
};

export const disconnectWs = () => {
  if (client) {
    try { client.deactivate(); } catch { /* ignore */ }
    client = null;
  }
  pending.length = 0;
  notifyStatus(false);
};

export const subscribeWs = (destination: string, callback: MsgCallback): (() => void) => {
  if (client?.connected) {
    const sub = client.subscribe(destination, (msg) => {
      try { callback(JSON.parse(msg.body)); } catch { callback(msg.body); }
    });
    return () => { try { sub.unsubscribe(); } catch { /* ignore */ } };
  }

  const entry = { destination, callback, unsub: { fn: null as (() => void) | null } };
  pending.push(entry);

  return () => {
    const idx = pending.indexOf(entry);
    if (idx >= 0) pending.splice(idx, 1);
    if (entry.unsub.fn) entry.unsub.fn();
  };
};

export const onWsStatusChange = (listener: StatusListener): (() => void) => {
  statusListeners.add(listener);
  listener(connected);
  return () => { statusListeners.delete(listener); };
};

export const getWsStatus = () => connected;