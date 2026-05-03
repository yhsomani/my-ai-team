import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from './Skeleton';
import { ImageOff } from 'lucide-react';

interface AuraImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackDelay?: number;
  containerClassName?: string;
}

export const AuraImage: React.FC<AuraImageProps> = ({ 
  src, 
  alt, 
  className, 
  containerClassName,
  fallbackDelay = 300,
  ...props 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) setShowSkeleton(true);
    }, fallbackDelay);
    
    return () => clearTimeout(timer);
  }, [isLoading, fallbackDelay]);

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      <AnimatePresence>
        {(isLoading && showSkeleton) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10"
          >
            <Skeleton className="w-full h-full rounded-none" />
          </motion.div>
        )}
      </AnimatePresence>

      {error ? (
        <div className="flex items-center justify-center w-full h-full bg-slate-100 dark:bg-slate-800 text-slate-400">
          <ImageOff size={24} />
        </div>
      ) : (
        <motion.img
          {...(props as any)}
          src={src}
          alt={alt}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setError(true);
          }}
        />
      )}
    </div>
  );
};

export const MemoizedAuraImage = React.memo(AuraImage);
