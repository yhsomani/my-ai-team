import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { setupInterceptors } from './api/axios'
import { AuraThemeProvider } from './components/shared/AuraThemeProvider'

// Initialize API interceptors with the store
setupInterceptors(store);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AuraThemeProvider>
          <App />
        </AuraThemeProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
)

