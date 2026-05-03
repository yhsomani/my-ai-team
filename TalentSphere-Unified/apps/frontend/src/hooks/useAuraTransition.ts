import { Variants } from 'framer-motion';

/**
 * Standard variants for the Aura Design System
 * Ensures 60 FPS performance by using hardware-accelerated properties (transform, opacity)
 */
export const useAuraTransition = (staggerDelay = 0.1): Variants => {
  return {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.98 
    },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * staggerDelay,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1], // Custom ease for "Neural Nebula" feel
      },
    }),
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3,
      },
    },
  };
};

export default useAuraTransition;
