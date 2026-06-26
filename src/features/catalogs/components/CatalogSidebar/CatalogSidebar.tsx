import {
  Boxes,
  Building2,
  Factory,
  MapPin,
  Navigation,
  Package,
  Settings2,
  Truck,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CatalogKey, SIDEBAR_GROUPS } from '../../types/catalog.types';
import styles from './CatalogSidebar.module.css';

const ICON_MAP: Record<string, LucideIcon> = {
  User,
  Building2,
  Users,
  Truck,
  Factory,
  MapPin,
  Navigation,
  Package,
  Boxes,
  Settings2,
};

interface CatalogSidebarProps {
  activeCatalog: CatalogKey;
  onSelect: (key: CatalogKey) => void;
}

export function CatalogSidebar({ activeCatalog, onSelect }: CatalogSidebarProps) {
  return (
    <nav className={styles.sidebar} aria-label="Catálogos">
      {SIDEBAR_GROUPS.map((group) => (
        <div key={group.label} className={styles.group}>
          <div className={styles.groupLabel}>{group.label}</div>
          {group.items.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? User;
            const isActive = activeCatalog === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                onClick={() => onSelect(item.key)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={16} aria-hidden />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
