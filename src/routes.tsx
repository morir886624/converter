import type { RouteObject } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { HomePage } from './pages/HomePage';
import { FullAppPage } from './pages/FullAppPage';
import { ConversionPage } from './pages/ConversionPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { conversions } from './conversions.config';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'app', element: <FullAppPage /> },
      ...conversions.map((c) => ({
        path: c.slug,
        element: <ConversionPage config={c} />,
      })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
