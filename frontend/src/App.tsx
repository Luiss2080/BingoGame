import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import { useAuth } from './stores/auth.store';
import { InstallPrompt } from './components/InstallPrompt';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cartones from './pages/Cartones';
import CartonDetalle from './pages/CartonDetalle';
import SubirPdf from './pages/SubirPdf';
import Pdfs from './pages/Pdfs';
import Usuarios from './pages/Usuarios';
import Grupos from './pages/Grupos';
import Banners from './pages/Banners';
import Permisos from './pages/Permisos';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10_000 },
  },
});

function RutaProtegida() {
  const token = useAuth((s) => s.token);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

function RutaAdmin() {
  const esAdmin = useAuth((s) => s.esAdmin());
  return esAdmin ? <Outlet /> : <Navigate to="/" replace />;
}

function RutaPermiso({ permiso }: { permiso: Parameters<ReturnType<typeof useAuth.getState>['tienePermiso']>[0] }) {
  const tiene = useAuth((s) => s.tienePermiso(permiso));
  return tiene ? <Outlet /> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <InstallPrompt />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RutaProtegida />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cartones" element={<Cartones />} />
            <Route path="/cartones/:id" element={<CartonDetalle />} />
            <Route element={<RutaPermiso permiso="subir_pdf" />}>
              <Route path="/subir-pdf" element={<SubirPdf />} />
              <Route path="/pdfs" element={<Pdfs />} />
            </Route>
            <Route element={<RutaAdmin />}>
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/grupos" element={<Grupos />} />
              <Route path="/banners" element={<Banners />} />
              <Route path="/permisos" element={<Permisos />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
