import { createBrowserRouter } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import EditorPage from '@/pages/EditorPage'

export const router = createBrowserRouter([
  { path: '/', Component: HomePage },
  { path: '/editor', Component: EditorPage },
])
