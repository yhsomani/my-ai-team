export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface AISuggestion {
    id: string;
    text: string;
    category: 'career' | 'market' | 'technical';
}
