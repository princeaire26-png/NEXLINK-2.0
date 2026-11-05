/**
 * Local-network DNS-SD advertisement for NEXLINK.
 * Discovery is deliberately unauthenticated metadata only. The agent must still
 * complete the existing Ed25519 challenge/response before it is trusted.
 */
import dgram from 'node:dgram';
import os from 'node:os';

const GROUP = '224.0.0.251';
const PORT = 5353;
const SERVICE = '_nexlink-server._tcp.local';
const TTL = 120;

function firstQuestionName(packet: Buffer): string | null {
  if (packet.length < 13 || (packet.readUInt16BE(2) & 0x8000) !== 0 || packet.readUInt16BE(4) === 0) return null;
  const labels: string[] = [];
  let offset = 12;
  while (offset < packet.length) {
    const length = packet[offset++];
    if (length === 0) return labels.join('.').toLowerCase();
    if ((length & 0xc0) !== 0 || offset + length > packet.length) return null;
    labels.push(packet.toString('utf8', offset, offset + length));
    offset += length;
  }
  return null;
}

function encodeName(name: string): Buffer {
  const parts = name.replace(/\.$/, '').split('.');
  const chunks: Buffer[] = [];
  for (const part of parts) {
    const value = Buffer.from(part, 'utf8');
    if (value.length > 63) throw new Error('DNS label too long');
    chunks.push(Buffer.from([value.length]), value);
  }
  chunks.push(Buffer.from([0]));
  return Buffer.concat(chunks);
}
function record(name: string, type: number, data: Buffer): Buffer {
  const head = Buffer.alloc(10);
  head.writeUInt16BE(type, 0);
  head.writeUInt16BE(1, 2); // IN
  head.writeUInt32BE(TTL, 4);
  head.writeUInt16BE(data.length, 8);
  return Buffer.concat([encodeName(name), head, data]);
}
function txtRecord(entries: Record<string, string>): Buffer {
  const values = Object.entries(entries).map(([k, v]) => Buffer.from(`${k}=${v}`));
  return Buffer.concat(values.flatMap(v => [Buffer.from([v.length]), v]));
}
function getLanAddresses(): string[] {
  const found: string[] = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('169.254.')) found.push(entry.address);
    }
  }
  return [...new Set(found)];
}

export class NexlinkDiscoveryAdvertiser {
  private socket?: dgram.Socket;
  private timer?: NodeJS.Timeout;
  private readonly instance = `NEXLINK-${os.hostname().replace(/[^a-zA-Z0-9-]/g, '-')}`;
  private readonly host = `${os.hostname().replace(/[^a-zA-Z0-9-]/g, '-')}.local`;

  start(port: number, protocol: string = 'ws'): void {
    if (this.socket) return;
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.socket = socket;
    socket.on('error', error => console.error('[NEXLINK discovery]', error));
    socket.on('message', (packet, rinfo) => {
      // Only answer PTR questions for our service type. Never treat discovery as auth.
      if (firstQuestionName(packet) !== SERVICE) return;
      const response = this.buildResponse(port, protocol);
      socket.send(response, rinfo.port, rinfo.address);
    });
    socket.bind(PORT, () => {
      try { socket.addMembership(GROUP); } catch (error) { console.error('[NEXLINK discovery] multicast join failed', error); }
      socket.setMulticastTTL(255);
      this.announce(port, protocol);
      this.timer = setInterval(() => this.announce(port, protocol), 60_000);
    });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    if (this.socket) {
      try { this.socket.send(this.buildGoodbye(), PORT, GROUP); } catch { /* best effort */ }
      this.socket.close();
    }
    this.socket = undefined;
  }

  private buildResponse(port: number, protocol: string = 'ws'): Buffer {
    const instance = `${this.instance}.${SERVICE}`;
    const addresses = getLanAddresses();
    const srv = Buffer.alloc(6);
    srv.writeUInt16BE(0, 0); srv.writeUInt16BE(0, 2); srv.writeUInt16BE(port, 4);
    const answers = [
      record(SERVICE, 12, encodeName(instance)),
      record(instance, 33, Buffer.concat([srv, encodeName(this.host)])),
      record(instance, 16, txtRecord({ path: '/ws', protocol, version: '1', auth: 'ed25519' })),
      ...addresses.map(address => record(this.host, 1, Buffer.from(address.split('.').map(Number)))),
    ];
    const header = Buffer.alloc(12);
    header.writeUInt16BE(0, 0); header.writeUInt16BE(0x8400, 2); header.writeUInt16BE(0, 4);
    header.writeUInt16BE(answers.length, 6); header.writeUInt16BE(0, 8); header.writeUInt16BE(0, 10);
    return Buffer.concat([header, ...answers]);
  }
  private buildGoodbye(): Buffer {
    const packet = this.buildResponse(0);
    // TTL=0 in goodbye packets tells caches to discard the records.
    for (let offset = 12; offset < packet.length;) {
      let end = offset;
      while (end < packet.length && packet[end] !== 0) end += packet[end] + 1;
      end += 1;
      if (end + 6 > packet.length) break;
      packet.writeUInt32BE(0, end + 4);
      const dataLength = packet.readUInt16BE(end + 8);
      offset = end + 10 + dataLength;
    }
    return packet;
  }
  private announce(port: number, protocol: string): void {
    if (!this.socket) return;
    const packet = this.buildResponse(port, protocol);
    this.socket.send(packet, PORT, GROUP, error => { if (error) console.error('[NEXLINK discovery] announce failed', error); });
  }
}
