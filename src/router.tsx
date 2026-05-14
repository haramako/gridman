import EditorPage from '@/pages/EditorPage';
import HomePage from '@/pages/HomePage';
import SearchPage from '@/pages/SearchPage';
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  { path: '/', Component: HomePage },
  { path: '/editor', Component: EditorPage },
  { path: '/search', Component: SearchPage },
]);
