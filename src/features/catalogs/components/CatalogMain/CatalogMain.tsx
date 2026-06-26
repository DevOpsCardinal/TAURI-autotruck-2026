import { Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiAuth } from '../../../operation/types/operation.types';
import { ApiUnauthorizedError } from '../../../operation/api/api.config';
import { useToast } from '../../../operation/components/Toast/ToastContext';
import { fetchCatalogRecords } from '../../api/catalogs-read.api';
import {
  CATALOG_COLUMNS,
  CATALOG_TITLES,
  CatalogKey,
  CatalogRecord,
  DrawerState,
} from '../../types/catalog.types';
import { CatalogDrawer } from '../CatalogDrawer/CatalogDrawer';
import { CatalogTable } from '../CatalogTable/CatalogTable';
import { ConfiguracionesPanel } from '../ConfiguracionesPanel/ConfiguracionesPanel';
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog/ConfirmDeleteDialog';
import styles from './CatalogMain.module.css';

interface CatalogMainProps {
  catalogKey: CatalogKey;
  auth: ApiAuth;
  isAdmin: boolean;
}

function recordMatchesQuery(record: CatalogRecord, query: string, catalogKey: CatalogKey): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const columns = CATALOG_COLUMNS[catalogKey];
  return columns.some((col) => {
    const value = record[col.key];
    if (value === null || value === undefined) return false;
    return String(value).toLowerCase().includes(normalizedQuery);
  });
}

export function CatalogMain({ catalogKey, auth, isAdmin }: CatalogMainProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [records, setRecords] = useState<CatalogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    mode: 'create',
    record: null,
  });
  const [confirmDelete, setConfirmDelete] = useState<CatalogRecord | null>(null);

  const fetchRecords = useCallback(async () => {
    if (catalogKey === 'configuraciones') {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchCatalogRecords(auth, catalogKey);
      setRecords(data);
    } catch (err) {
      console.error('[CatalogMain] fetchRecords error:', err);
      if (err instanceof ApiUnauthorizedError) {
        navigate('/login', { replace: true });
        return;
      }
      setError('No se pudieron cargar los registros. Verifica que el servidor esté en ejecución.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [auth, catalogKey]);

  useEffect(() => {
    setSearchQuery('');
    setDrawerState({ open: false, mode: 'create', record: null });
    setConfirmDelete(null);
    void fetchRecords();
  }, [catalogKey, fetchRecords]);

  const filteredRecords = useMemo(
    () => records.filter((record) => recordMatchesQuery(record, searchQuery, catalogKey)),
    [records, searchQuery, catalogKey],
  );

  function handleCreateSuccess() {
    setDrawerState({ open: false, mode: 'create', record: null });
    void fetchRecords();
    showToast('success', 'Registro creado correctamente');
  }

  function handleUpdateSuccess() {
    setDrawerState({ open: false, mode: 'create', record: null });
    void fetchRecords();
    showToast('success', 'Registro actualizado correctamente');
  }

  function handleDeleteSuccess() {
    setConfirmDelete(null);
    void fetchRecords();
    showToast('success', 'Registro eliminado correctamente');
  }

  const isConfigPanel = catalogKey === 'configuraciones';

  return (
    <div className={styles.main}>
      <div className={styles.actionBar}>
        <h2 className={styles.title}>{CATALOG_TITLES[catalogKey]}</h2>
        <div className={styles.actionBarRight}>
          {!isConfigPanel && (
            <>
              <div className={styles.searchWrap}>
                <Search size={16} className={styles.searchIcon} aria-hidden />
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <button
                type="button"
                className={styles.newButton}
                onClick={() => setDrawerState({ open: true, mode: 'create', record: null })}
                disabled={!isAdmin}
                title={isAdmin ? 'Nuevo registro' : 'Solo administradores pueden realizar esta acción'}
              >
                <Plus size={16} aria-hidden />
                Nuevo registro
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {isConfigPanel ? (
          <ConfiguracionesPanel auth={auth} isAdmin={isAdmin} />
        ) : loading ? (
          <div className={styles.stateMessage}>Cargando registros...</div>
        ) : error ? (
          <div className={styles.stateMessage}>
            {error}
            <button type="button" className={styles.retryButton} onClick={() => void fetchRecords()}>
              Reintentar
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className={styles.emptyState}>
            {searchQuery.trim()
              ? `No se encontraron registros que coincidan con «${searchQuery.trim()}»`
              : 'No hay registros en este catálogo.'}
          </div>
        ) : (
          <CatalogTable
            catalogKey={catalogKey}
            records={filteredRecords}
            isAdmin={isAdmin}
            onEdit={(record) => setDrawerState({ open: true, mode: 'edit', record })}
            onDelete={(record) => setConfirmDelete(record)}
          />
        )}
      </div>

      {drawerState.open && (
        <CatalogDrawer
          catalogKey={catalogKey}
          mode={drawerState.mode}
          record={drawerState.record}
          auth={auth}
          onClose={() => setDrawerState({ open: false, mode: 'create', record: null })}
          onSuccess={drawerState.mode === 'create' ? handleCreateSuccess : handleUpdateSuccess}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteDialog
          record={confirmDelete}
          catalogKey={catalogKey}
          auth={auth}
          onConfirm={handleDeleteSuccess}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
