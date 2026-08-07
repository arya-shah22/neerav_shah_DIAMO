// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Wi-Fi / Ethernet LAN Auto-Discovery Engine
// ═══════════════════════════════════════════════════════════════
import dgram from 'dgram';
import os from 'os';

export interface ILanHostInfo {
  role: 'DIAMO_HOST';
  hostname: string;
  ip: string;
  port: number;
  timestamp: number;
}

const UDP_PORT = 41234;
let socket: dgram.Socket | null = null;
let broadcastInterval: NodeJS.Timeout | null = null;

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (!iface.internal && iface.family === 'IPv4') {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

export function startHostDiscoveryBeacon(dbPort: number = 3306): void {
  try {
    if (socket) stopLanDiscovery();

    socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    socket.bind(UDP_PORT, () => {
      socket?.setBroadcast(true);
      console.log(`[LAN Discovery] Host beacon active on UDP port ${UDP_PORT}`);
    });

    const localIp = getLocalIpAddress();
    const hostname = os.hostname();

    const sendBeacon = () => {
      if (!socket) return;
      const payload: ILanHostInfo = {
        role: 'DIAMO_HOST',
        hostname,
        ip: localIp,
        port: dbPort,
        timestamp: Date.now(),
      };
      const message = Buffer.from(JSON.stringify(payload));
      socket.send(message, 0, message.length, UDP_PORT, '255.255.255.255', (err) => {
        if (err) console.error('[LAN Discovery] Beacon send error:', err);
      });
    };

    sendBeacon();
    broadcastInterval = setInterval(sendBeacon, 5000);
  } catch (err) {
    console.error('[LAN Discovery] Failed to start Host beacon:', err);
  }
}

/** Collects ALL active DIAMO ERP Host PCs responding on the local Ethernet / Wi-Fi network */
export function discoverHostsOnLan(timeoutMs: number = 3000): Promise<ILanHostInfo[]> {
  return new Promise((resolve) => {
    let clientSocket: dgram.Socket | null = null;
    let timer: NodeJS.Timeout | null = null;
    const detectedHostsMap = new Map<string, ILanHostInfo>();

    try {
      clientSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      clientSocket.bind(UDP_PORT, () => {
        clientSocket?.setBroadcast(true);
      });

      clientSocket.on('message', (msg) => {
        try {
          const data: ILanHostInfo = JSON.parse(msg.toString('utf-8'));
          if (data.role === 'DIAMO_HOST' && data.ip) {
            const key = `${data.ip}:${data.port}`;
            if (!detectedHostsMap.has(key)) {
              detectedHostsMap.set(key, data);
              console.log(`[LAN Discovery] Discovered Host PC: ${data.hostname} at ${data.ip}:${data.port}`);
            }
          }
        } catch {}
      });

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (clientSocket) {
          try {
            clientSocket.close();
          } catch {}
          clientSocket = null;
        }
      };

      timer = setTimeout(() => {
        const list = Array.from(detectedHostsMap.values());
        console.log(`[LAN Discovery] Discovery completed. Found ${list.length} Host PC(s) on network.`);
        cleanup();
        resolve(list);
      }, timeoutMs);
    } catch (err) {
      console.error('[LAN Discovery] Discovery error:', err);
      resolve([]);
    }
  });
}

export function stopLanDiscovery(): void {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
  }
  if (socket) {
    try {
      socket.close();
    } catch {}
    socket = null;
  }
}
