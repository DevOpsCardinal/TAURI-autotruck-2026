import { useState } from 'react';
import { BarChart3, Database, LogOut, Settings, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import logoCardinal from '../../../assets/img/logoCardinal4.png';
import { TicketPreview } from '../../tickets/components/TicketPreview/TicketPreview';
import { useTicket } from '../../tickets/hooks/useTicket';
import { ModeSelector } from '../components/ModeSelector/ModeSelector';
import { OperationForm } from '../components/OperationForm/OperationForm';
import { ScalePanel } from '../components/ScalePanel/ScalePanel';
import { useToast } from '../components/Toast/ToastContext';
import { TransitListPanel } from '../components/TransitListPanel/TransitListPanel';
import { VehicleSearch } from '../components/VehicleSearch/VehicleSearch';
import { useOperationForm } from '../hooks/useOperationForm';
import { useOperationMode } from '../hooks/useOperationMode';
import { useScaleReading } from '../hooks/useScaleReading';
import { useTransitSearch } from '../hooks/useTransitSearch';
import { CreateTransitResponse, SalidaResponse } from '../types/operation.types';
import { mapApiErrorMessage } from '../utils/transit.utils';
import formStyles from '../components/OperationForm/OperationForm.module.css';
import styles from './OperationPage.module.css';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function OperationPageContent() {
  const navigate = useNavigate();
  const { auth, accessToken, logout } = useAuth();
  const { showToast } = useToast();
  const apiAuth = accessToken ? { token: accessToken } : null;
  const [listPanelOpen, setListPanelOpen] = useState(false);

  const { mode, setMode, modeVersion } = useOperationMode();
  const scale = useScaleReading(apiAuth);
  const transit = useTransitSearch(apiAuth);

  const ticket = useTicket(apiAuth);

  const handleSuccess = (
    type: 'transit' | 'ingreso' | 'despacho',
    payload?: CreateTransitResponse | SalidaResponse,
  ) => {
    if (type === 'transit') {
      const transitResult = payload as CreateTransitResponse | undefined;
      if (transitResult?.preliminary_ticket_data) {
        ticket.openWithData(transitResult.preliminary_ticket_data);
      }
      transit.clearRecord();
      return;
    }
    const salida = payload as SalidaResponse | undefined;
    if (salida?.ticket_data) {
      ticket.openWithData(salida.ticket_data);
    }
    transit.clearRecord();
  };

  function handleTicketPrint() {
    ticket.print();
    ticket.close();
  }

  const formState = useOperationForm({
    mode,
    transitRecord: transit.selectedRecord,
    liveWeight: scale.liveWeight,
    auth: apiAuth,
    user: auth ?? null,
    modeVersion,
    onSuccess: handleSuccess,
    onUnauthorized: () => {
      logout();
      navigate('/login', { replace: true });
    },
    onNotify: (type, message, onRetry) => showToast(type, message, onRetry),
  });

  const showForm =
    mode === 'ingreso' ||
    mode === 'despacho' ||
    (mode === 'transito' && transit.selectedRecord !== null);

  const showDropdown = transit.query.length >= 2;

  function handleModeChange(nextMode: typeof mode) {
    if (!nextMode) return;
    setMode(nextMode);
    transit.clearRecord();
    transit.setQuery('');
    setListPanelOpen(false);
  }

  async function handleSelectRecord(record: Parameters<typeof transit.selectRecord>[0]) {
    try {
      await transit.selectRecord(record);
      setListPanelOpen(false);
    } catch {
      showToast('error', mapApiErrorMessage({ code: 'VEHICLE_NOT_IN_TRANSIT', message: '' }));
    }
  }

  async function handleOpenList() {
    setListPanelOpen(true);
    await transit.loadAllRecords();
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <img src={logoCardinal} alt="Cardinal Weighing" className={styles.logo} />
          <span className={styles.separator} aria-hidden />
          <span className={styles.systemName}>Sistema de Control de Básculas</span>
        </div>
        <div className={styles.topbarRight}>
          <button
            type="button"
            className={styles.settingsButton}
            onClick={() => navigate('/reports/summary')}
            aria-label="Abrir reportes"
            title="Reportes"
          >
            <BarChart3 size={20} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.settingsButton}
            onClick={() => navigate('/catalogs')}
            aria-label="Abrir catálogos"
            title="Catálogos"
          >
            <Database size={20} aria-hidden />
          </button>
          {(auth?.rol === 'administrador' || auth?.rol === 'super_administrador') && (
            <button
              type="button"
              className={styles.settingsButton}
              onClick={() => navigate('/configuraciones')}
              aria-label="Abrir configuraciones"
              title="Configuraciones"
            >
              <Settings size={20} aria-hidden />
            </button>
          )}
          {(auth?.rol === 'administrador' || auth?.rol === 'super_administrador') && (
            <button
              type="button"
              className={styles.settingsButton}
              onClick={() => navigate('/admin')}
              aria-label="Administración de usuarios"
              title="Administración"
            >
              <Users size={20} aria-hidden />
            </button>
          )}
          <div className={styles.userPill}>
            <span className={styles.avatar}>{getInitials(auth?.nombre ?? 'OP')}</span>
            <span className={styles.userName}>{auth?.nombre}</span>
          </div>
          <button type="button" className={styles.logoutButton} onClick={logout} aria-label="Salir">
            <LogOut size={16} aria-hidden />
            <span>Salir</span>
          </button>
        </div>
      </header>

      <ModeSelector
        mode={mode}
        onModeChange={handleModeChange}
        activeScale={scale.activeScale}
        onScaleChange={scale.setActiveScale}
        isConnected={scale.isConnected}
      />

      <main className={styles.main}>
        <div className={styles.contentArea}>
          {!mode && (
            <div className={formStyles.emptyState}>
              Selecciona un modo de operación para comenzar.
            </div>
          )}

          {mode === 'transito' && (
            <VehicleSearch
              query={transit.query}
              onQueryChange={transit.setQuery}
              results={transit.results}
              isLoading={transit.isLoading}
              selectedRecordId={transit.selectedRecord?.id ?? null}
              onSelectRecord={handleSelectRecord}
              onOpenList={handleOpenList}
              showDropdown={showDropdown}
            />
          )}

          {mode && showForm && apiAuth && (
            <OperationForm
              mode={mode}
              transitRecord={transit.selectedRecord}
              auth={apiAuth}
              formik={formState.formik}
              isSubmitting={formState.isSubmitting}
            />
          )}

          {mode === 'transito' && !transit.selectedRecord && (
            <div className={formStyles.emptyState}>
              Busca y selecciona un vehículo en tránsito para completar la operación.
            </div>
          )}
        </div>

        <div className={styles.scaleSidebar}>
          <ScalePanel
            liveWeight={scale.liveWeight}
            activeScale={scale.activeScale}
            mode={mode}
            transitRecord={transit.selectedRecord}
            isConnected={scale.isConnected}
          />
        </div>
      </main>

      <TransitListPanel
        isOpen={listPanelOpen}
        records={transit.allRecords}
        isLoading={transit.isLoadingAll}
        selectedRecordId={transit.selectedRecord?.id ?? null}
        onClose={() => setListPanelOpen(false)}
        onSelectRecord={handleSelectRecord}
      />

      <TicketPreview
        open={ticket.open}
        ticketData={ticket.ticketData}
        format={ticket.format}
        loading={ticket.loading}
        error={ticket.error}
        title="Tiquete de pesaje"
        onClose={ticket.close}
        onFormatChange={ticket.setFormat}
        onPrint={handleTicketPrint}
      />
    </div>
  );
}

export function OperationPage() {
  return <OperationPageContent />;
}
