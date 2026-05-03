import { createBrowserRouter } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import EditorPage from '@/pages/EditorPage'
import SearchPage from '@/pages/SearchPage'

export const router = createBrowserRouter([
  { path: '/', Component: HomePage },
  { path: '/editor', Component: EditorPage },
  { path: '/search', Component: SearchPage },
])
