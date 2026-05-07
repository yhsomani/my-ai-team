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
    timestamp: string | Date;
    messageType?: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO';
    attachmentUrl?: string;
    status?: 'SENT' | 'DELIVERED' | 'READ';
    readAt?: string;
    sender?: Participant;
}

export interface Conversation {
    id: string;
    participant?: Participant;
    participants?: string[];
    isGroup?: boolean;
    lastMessage?: Message;
    createdAt?: string;
    updatedAt?: string;
}

export interface Socket {
    on: (event: string, callback: (...args: any[]) => void) => void;
    off: (event: string, callback?: (...args: any[]) => void) => void;
    disconnect: () => void;
    id?: string;
}
