import React from 'react';
import Card from '../shared/GlassCard';
import { AuraButton as Button } from '../shared/AuraButton';
import { HeadlineMD, BodyMD, LabelSM } from '../atoms/Typography';

interface PostCardProps {
  author: string;
  role: string;
  content: string;
  timestamp: string;
  likes: number;
}

export const PostCard: React.FC<PostCardProps> = ({ author, role, content, timestamp, likes }) => {
  const initials = author
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'TS';

  return (
    <Card className="mb-6 p-5 transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-center">
        <div className="mr-4 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-accent/10 text-sm font-semibold text-accent">
          {initials}
        </div>
        <div className="min-w-0">
          <HeadlineMD className="m-0 truncate text-base">{author}</HeadlineMD>
          <LabelSM className="block">{role} / {timestamp}</LabelSM>
        </div>
      </div>
      
      <BodyMD className="mb-6 break-words">
        {content}
      </BodyMD>
      
      <div className="flex flex-col gap-3 border-t border-[var(--border-default)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            Like ({likes})
          </Button>
          <Button variant="outline" size="sm">
            Comment
          </Button>
        </div>
        <Button variant="default" size="sm">
          Share
        </Button>
      </div>
    </Card>
  );
};
