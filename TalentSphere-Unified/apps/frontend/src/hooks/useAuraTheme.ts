import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

export const useAuraTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useAuraTheme must be used within an AuraThemeProvider');
  }
  return context;
};
