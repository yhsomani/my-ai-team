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
  return (
    <Card className="mb-6 hover:shadow-primary-glow transition-shadow duration-500">
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 rounded-full bg-primary-gradient mr-4 flex-shrink-0" />
        <div>
          <HeadlineMD className="text-lg m-0">{author}</HeadlineMD>
          <LabelSM className="block opacity-70">{role} | {timestamp}</LabelSM>
        </div>
      </div>
      
      <BodyMD className="mb-6 leading-relaxed">
        {content}
      </BodyMD>
      
      <div className="flex items-center justify-between pt-4 border-t border-glass-stroke">
        <div className="flex gap-4">
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
