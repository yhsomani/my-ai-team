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
    <Card role="article" aria-label={`${author} update`} data-slot="post-card" className="mb-6 p-5 transition-shadow hover:shadow-md">
      <div data-ui="post-card-header" data-slot="post-card-header" className="mb-4 flex items-center">
        <div data-ui="post-card-avatar" data-slot="post-card-avatar" className="mr-4 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-accent/10 text-sm font-semibold text-accent" aria-hidden="true">
          {initials}
        </div>
        <div data-ui="post-card-meta" data-slot="post-card-meta" className="min-w-0">
          <HeadlineMD className="m-0 truncate text-base">{author}</HeadlineMD>
          <LabelSM className="block">{role} / {timestamp}</LabelSM>
        </div>
      </div>

      <BodyMD data-ui="post-card-content" data-slot="post-card-content" className="mb-6 break-words">
        {content}
      </BodyMD>

      <div data-ui="post-card-actions" data-slot="post-card-actions" className="flex flex-col gap-3 border-t border-[var(--border-default)] pt-4 sm:flex-row sm:items-center sm:justify-between">
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
