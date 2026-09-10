import React from 'react';
import ReactDOM from 'react-dom/client';
import { OptionsApp } from './OptionsApp';
import { ErrorBoundary } from '../components/ErrorBoundary';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <OptionsApp />
    </ErrorBoundary>
  </React.StrictMode>
);
