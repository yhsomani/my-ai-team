import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatWebSocket } from './websocket';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState: number = WebSocket.OPEN;
  onopen: ((event?: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event?: any) => void) | null = null;
  onclose: ((event?: any) => void) | null = null;
  sentData: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }

  send(data: string) {
    this.sentData.push(data);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
}

describe('useChatWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    (global as any).WebSocket = MockWebSocket;
    (global as any).WebSocket.OPEN = 1;
    (global as any).WebSocket.CLOSED = 3;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not connect if userId is null', () => {
    const { result } = renderHook(() => useChatWebSocket(null));
    expect(result.current.isConnected).toBe(false);
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('connects and sends JOIN payload when userId is present', async () => {
    const { result } = renderHook(() => useChatWebSocket('user-1'));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(MockWebSocket.instances).toHaveLength(1);
    const ws = MockWebSocket.instances[0];
    expect(result.current.isConnected).toBe(true);
    expect(ws.sentData).toContain(JSON.stringify({ type: 'JOIN', userId: 'user-1' }));
  });

  it('handles incoming messages through onmessage', async () => {
    const { result } = renderHook(() => useChatWebSocket('user-1'));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    const incoming = {
      id: 'msg-1',
      senderId: 'user-2',
      receiverId: 'user-1',
      content: 'Hello there',
      timestamp: '2026-06-25T12:00:00Z',
      type: 'text' as const,
    };

    act(() => {
      MockWebSocket.instances[0].onmessage?.({ data: JSON.stringify(incoming) });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toEqual(incoming);
  });

  it('sends outgoing message and updates message state', async () => {
    const { result } = renderHook(() => useChatWebSocket('user-1'));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    act(() => {
      result.current.sendMessage('user-2', 'How are you?', 'text');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('How are you?');
    expect(result.current.messages[0].receiverId).toBe('user-2');
    expect(result.current.messages[0].senderId).toBe('user-1');
  });

  it('cleans up existing socket connection on unmount or disconnect', async () => {
    const { result, unmount } = renderHook(() => useChatWebSocket('user-1'));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    const ws = MockWebSocket.instances[0];
    expect(ws.readyState).toBe(1);

    unmount();

    expect(ws.readyState).toBe(3);
  });
});
