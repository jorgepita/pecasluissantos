import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { AppRoutes } from '@/app/routes';

// `import.meta.env.BASE_URL` mirrors Vite's `base` config (see
// vite.config.ts) — '/' in local dev and a plain `npm run build`, or
// '/pecasluissantos/' in the GitHub Pages build. `BrowserRouter`'s
// `basename` doesn't want a trailing slash (it strips one internally, but
// react-router's own convention/examples pass it bare), hence the trim.
// This is the one place the deployment path prefix reaches the app.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

export function App() {
  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
