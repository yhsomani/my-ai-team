import React from 'react';
import ReactDOM from 'react-dom/client';
import { PopupApp } from './PopupApp';
import { ErrorBoundary } from '../components/ErrorBoundary';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <PopupApp />
    </ErrorBoundary>
  </React.StrictMode>
);
