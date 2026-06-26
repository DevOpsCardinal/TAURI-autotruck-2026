import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import type { FormatoImpresion, TicketData } from '../../types/ticket.types';
import { TicketCorporativo } from '../TicketCorporativo/TicketCorporativo';
import { TicketMediaHoja } from '../TicketMediaHoja/TicketMediaHoja';
import { TicketTermico } from '../TicketTermico/TicketTermico';
import styles from './TicketPreview.module.css';

interface TicketPreviewProps {
  open: boolean;
  ticketData: TicketData | null;
  format: FormatoImpresion;
  loading?: boolean;
  error?: string | null;
  title?: string;
  onClose: () => void;
  onFormatChange: (format: FormatoImpresion) => void;
  onPrint: () => void;
}

export function TicketPreview({
  open,
  ticketData,
  format,
  loading = false,
  error = null,
  title = 'Vista previa del tiquete',
  onClose,
  onFormatChange,
  onPrint,
}: TicketPreviewProps) {
  if (!open) return null;

  const ticketTitle = ticketData?.tiquete.estado === 'REIMPRESION'
    ? 'Reimprimir Ticket'
    : title;

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={ticketTitle}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{ticketTitle}</span>
          <div className={styles.formatSelector}>
            <button
              type="button"
              className={`${styles.formatButton}${format === 'termico' ? ` ${styles.formatButtonActive}` : ''}`}
              onClick={() => onFormatChange('termico')}
              disabled={loading}
            >
              Térmico
            </button>
            <button
              type="button"
              className={`${styles.formatButton}${format === 'corporativo' ? ` ${styles.formatButtonActive}` : ''}`}
              onClick={() => onFormatChange('corporativo')}
              disabled={loading}
            >
              Corporativo
            </button>
            <button
              type="button"
              className={`${styles.formatButton}${format === 'media-hoja' ? ` ${styles.formatButtonActive}` : ''}`}
              onClick={() => onFormatChange('media-hoja')}
              disabled={loading}
            >
              Media Hoja
            </button>
          </div>
        </div>

        <div className={styles.previewArea}>
          {loading ? (
            <div className={styles.loadingState}>
              <Loader2 size={24} className="spin" aria-hidden />
              <p>Cargando tiquete...</p>
            </div>
          ) : null}
          {!loading && error ? (
            <div className={styles.errorState}>{error}</div>
          ) : null}
          {!loading && !error && ticketData ? (
            <div className={format === 'media-hoja' ? styles.previewScaleWide : styles.previewScale}>
              {format === 'termico' ? (
                <TicketTermico data={ticketData} printTarget />
              ) : format === 'media-hoja' ? (
                <TicketMediaHoja data={ticketData} printTarget />
              ) : (
                <TicketCorporativo data={ticketData} printTarget />
              )}
            </div>
          ) : null}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className={styles.printButton}
            onClick={onPrint}
            disabled={loading || !ticketData}
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
