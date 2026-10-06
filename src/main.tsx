import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router'
import './index.css'
import Explorer from './pages/Explorer'
import About from './pages/About'
import SoilIndex from './pages/SoilIndex'
import SoilProfile from './pages/SoilProfile'
import NotFound from './pages/NotFound'

const router = createBrowserRouter([
  { path: '/', element: <Explorer /> },
  { path: '/about', element: <About /> },
  { path: '/soil', element: <SoilIndex /> },
  { path: '/soil/:slug', element: <SoilProfile /> },
  { path: '*', element: <NotFound /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
