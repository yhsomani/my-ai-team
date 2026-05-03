export interface Participant {
    id: string;
    fullName: string;
    avatarUrl?: string;
    status: 'online' | 'offline' | 'syncing';
}

export interface Message {
    id: string;
    conversationId?: string;
    senderId: string;
    content: string;
    timestamp: Date;
}

export interface Conversation {
    id: string;
    participant: Participant;
    lastMessage?: Message;
}

export interface Socket {
    on: (event: string, callback: (...args: any[]) => void) => void;
    off: (event: string, callback?: (...args: any[]) => void) => void;
    disconnect: () => void;
    id?: string;
}
