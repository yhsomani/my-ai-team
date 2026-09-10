import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from './Skeleton';
import { ImageOff } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  loading,
  decoding,
  onLoad,
  onError,
  ...props
}) => {
  const previousSrcRef = useRef(src);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (previousSrcRef.current !== src) {
      previousSrcRef.current = src;
      setIsLoading(true);
      setError(false);
      setShowSkeleton(false);
    }
  }, [src]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) setShowSkeleton(true);
    }, fallbackDelay);

    return () => clearTimeout(timer);
  }, [isLoading, fallbackDelay]);

  const isDecorative = alt === '' || props['aria-hidden'] === true || props['aria-hidden'] === 'true';
  const fallbackLabel = alt ? `${alt} image unavailable` : 'Image unavailable';

  const handleLoad: React.ReactEventHandler<HTMLImageElement> = (event) => {
    setIsLoading(false);
    onLoad?.(event);
  };

  const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
    setIsLoading(false);
    setError(true);
    onError?.(event);
  };

  return (
    <div className={cn('relative min-w-0 overflow-hidden', containerClassName)} data-ui="aura-image" data-slot="aura-image">
      <AnimatePresence>
        {(isLoading && showSkeleton) && (
          <motion.div
            data-ui="aura-image-skeleton"
            data-slot="aura-image-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10"
            aria-hidden="true"
          >
            <Skeleton className="w-full h-full rounded-none" />
          </motion.div>
        )}
      </AnimatePresence>

      {error ? (
        <div
          role={isDecorative ? undefined : 'img'}
          aria-label={isDecorative ? undefined : fallbackLabel}
          aria-hidden={isDecorative ? true : undefined}
          className="flex h-full w-full items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-muted)]"
          data-ui="aura-image-fallback"
          data-slot="aura-image-fallback"
        >
          <ImageOff size={24} aria-hidden="true" focusable="false" />
        </div>
      ) : (
        <img
          {...props}
          src={src}
          alt={alt}
          loading={loading ?? 'lazy'}
          decoding={decoding ?? 'async'}
          className={cn(className, isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-500')}
          onLoad={handleLoad}
          onError={handleError}
          data-ui="aura-image-media"
          data-slot="aura-image-media"
        />
      )}
    </div>
  );
};

export const MemoizedAuraImage = React.memo(AuraImage);
