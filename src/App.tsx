import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthContext, { useAuth } from './context/AuthContext';
import { BusinessRulesProvider } from './context/BusinessRulesContext';
import { LoginPage } from './features/auth/pages/LoginPage';
import { checkLicense, isLicenseError } from './features/auth/services/auth.service';
import { AuthUser, LicenseInfo, LoginResponse } from './features/auth/types/auth.types';
import { ToastProvider } from './features/operation/components/Toast/ToastContext';
import { OperationPage } from './features/operation/pages/OperationPage';
import { ReceiptPage } from './features/operation/pages/ReceiptPage';
import { SettingsPage } from './features/settings/pages/SettingsPage';
import { CatalogsPage } from './features/catalogs/pages/CatalogsPage';
import { SummaryPage } from './features/reports/pages/SummaryPage';
import { IngresosReportPage } from './features/reports/pages/IngresosReportPage';
import { DespachosReportPage } from './features/reports/pages/DespachosReportPage';
import { TransitHistoryPage } from './features/reports/pages/TransitHistoryPage';
import { AdminPage } from './features/admin/pages/AdminPage';
import { useIndicatorLifecycle } from './features/settings/hooks/useIndicatorLifecycle';
import { IndicatorStatusProvider } from './context/IndicatorStatusContext';

function IndicatorLifecycle() {
  useIndicatorLifecycle();
  return null;
}

function AppLoading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100dvh',
      font: 'var(--text-body)',
      color: 'var(--color-muted)',
    }}>
      Cargando...
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  if (auth === undefined) return <AppLoading />;
  if (auth === null) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  if (auth === undefined) return <AppLoading />;
  if (auth !== null) return <Navigate to="/operation" replace />;
  return children;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  if (auth === undefined) return <AppLoading />;
  if (auth === null) return <Navigate to="/login" replace />;
  if (auth.rol === 'operario') return <Navigate to="/operation" replace />;
  return children;
}

function AppRoutes({
  licenseInfo,
  licenseNotFound,
  licenseLoading,
  onLoginSuccess,
}: {
  licenseInfo: LicenseInfo | null;
  licenseNotFound: boolean;
  licenseLoading: boolean;
  onLoginSuccess: (response: LoginResponse) => void;
}) {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage
              licenseInfo={licenseInfo}
              licenseNotFound={licenseNotFound}
              licenseLoading={licenseLoading}
              onLoginSuccess={onLoginSuccess}
            />
          </PublicRoute>
        }
      />
      <Route
        path="/operation"
        element={
          <ProtectedRoute>
            <OperationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recibo"
        element={
          <ProtectedRoute>
            <ReceiptPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuraciones"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalogs"
        element={
          <ProtectedRoute>
            <CatalogsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route
        path="/reports/summary"
        element={
          <ProtectedRoute>
            <SummaryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/ingresos"
        element={
          <ProtectedRoute>
            <IngresosReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/despachos"
        element={
          <ProtectedRoute>
            <DespachosReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/transit"
        element={
          <ProtectedRoute>
            <TransitHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route path="/reports" element={<Navigate to="/reports/summary" replace />} />
      <Route path="*" element={<Navigate to="/operation" replace />} />
    </Routes>
  );
}

export default function App() {
  const [auth, setAuth] = useState<AuthUser | null | undefined>(undefined);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [licenseNotFound, setLicenseNotFound] = useState(false);
  const [licenseLoading, setLicenseLoading] = useState(false);

  useEffect(() => {
    let slowTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    async function verifyLicense() {
      slowTimer = setTimeout(() => {
        if (!cancelled) setLicenseLoading(true);
      }, 2000);

      const result = await checkLicense();

      if (cancelled) return;

      clearTimeout(slowTimer);
      setLicenseLoading(false);
      setAuth(null);

      if (isLicenseError(result)) {
        if (result.code === 'LICENSE_NOT_FOUND') {
          setLicenseNotFound(true);
          setLicenseInfo({ expiresAt: '', daysRemaining: 0, status: 'expired' });
        } else if (result.code === 'LICENSE_EXPIRED') {
          setLicenseInfo({ expiresAt: '', daysRemaining: 0, status: 'expired' });
        }
        return;
      }

      setLicenseInfo(result);
    }

    verifyLicense();

    return () => {
      cancelled = true;
      if (slowTimer) clearTimeout(slowTimer);
    };
  }, []);

  function handleLogin(response: LoginResponse) {
    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    setAuth(response.user);
    setLicenseInfo(response.license);
    setLicenseNotFound(false);
  }

  function handleLogout() {
    setAccessToken(null);
    setRefreshToken(null);
    setAuth(null);
  }

  if (auth === undefined) {
    return <AppLoading />;
  }

  return (
    <AuthContext.Provider
      value={{
        auth,
        license: licenseInfo,
        accessToken,
        refreshToken,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      <IndicatorStatusProvider>
        <ToastProvider>
          <BusinessRulesProvider>
            {auth && <IndicatorLifecycle />}
            <AppRoutes
              licenseInfo={licenseInfo}
              licenseNotFound={licenseNotFound}
              licenseLoading={licenseLoading}
              onLoginSuccess={handleLogin}
            />
          </BusinessRulesProvider>
        </ToastProvider>
      </IndicatorStatusProvider>
    </AuthContext.Provider>
  );
}
