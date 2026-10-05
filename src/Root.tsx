import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import App from './App.tsx'

// The dashboard, pay pages and proof pages (with Reown AppKit and the Solana libraries) load on demand.
const AppEntry = lazy(() => import('./app/AppEntry'))

function AppLoading() {
  return (
    <div className="app-loading" role="status">
      <span className="app-loading__dot" />
      <span className="sr-only">Loading Sotto</span>
    </div>
  )
}

export function Root() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route
          path="*"
          element={
            <Suspense fallback={<AppLoading />}>
              <AppEntry />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
