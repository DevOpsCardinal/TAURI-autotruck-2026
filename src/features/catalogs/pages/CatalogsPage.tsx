import { ChevronLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { ApiAuth } from '../../operation/types/operation.types';
import { CatalogKey } from '../types/catalog.types';
import { CatalogMain } from '../components/CatalogMain/CatalogMain';
import { CatalogSidebar } from '../components/CatalogSidebar/CatalogSidebar';
import styles from './CatalogsPage.module.css';

export function CatalogsPage() {
  const navigate = useNavigate();
  const { auth, accessToken } = useAuth();
  const [activeCatalog, setActiveCatalog] = useState<CatalogKey>('conductores');

  const isAdmin = auth?.rol === 'administrador' || auth?.rol === 'super_administrador';
  const apiAuth = useMemo<ApiAuth | null>(
    () => (accessToken ? { token: accessToken } : null),
    [accessToken],
  );

  if (!auth || !apiAuth) {
    return null;
  }

  return (
    <div className={styles.catalogsPage}>
      <header className={styles.pageHeader}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate('/operation')}
        >
          <ChevronLeft size={18} aria-hidden />
          Operaciones
        </button>
        <h1 className={styles.pageTitle}>Administración de Catálogos</h1>
      </header>

      <div className={styles.pageBody}>
        <CatalogSidebar
          activeCatalog={activeCatalog}
          onSelect={setActiveCatalog}
          isAdmin={isAdmin}
        />
        <CatalogMain
          catalogKey={activeCatalog}
          auth={apiAuth}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
