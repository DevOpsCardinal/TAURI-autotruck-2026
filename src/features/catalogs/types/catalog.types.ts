export type CatalogKey =
  | 'conductores'
  | 'plantas'
  | 'proveedores'
  | 'clientes'
  | 'transportadoras'
  | 'origenes'
  | 'destinos'
  | 'materias'
  | 'productos'
  | 'configuraciones';

export type CatalogRecord = Record<string, string | number | null>;

export interface ColumnDef {
  key: string;
  label: string;
  sortable: boolean;
}

export interface FormFieldDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date';
  required: boolean;
  maxLength?: number;
  placeholder?: string;
  /** Always read-only (e.g. auto-generated codes shown in edit mode). */
  readOnly?: boolean;
  /** Only shown in edit mode (auto-generated fields like Codigo). */
  editOnly?: boolean;
  /** Editable when creating; locked (read-only) when editing. */
  createOnly?: boolean;
}

export interface SidebarItem {
  key: CatalogKey;
  label: string;
  icon: string;
}

export interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

export type DrawerState =
  | { open: false; mode: 'create' | 'edit'; record: null | CatalogRecord }
  | { open: true; mode: 'create'; record: null }
  | { open: true; mode: 'edit'; record: CatalogRecord };

export const CATALOG_TITLES: Record<CatalogKey, string> = {
  conductores: 'Conductores',
  plantas: 'Plantas',
  proveedores: 'Proveedores',
  clientes: 'Clientes',
  transportadoras: 'Transportadoras',
  origenes: 'Orígenes',
  destinos: 'Destinos',
  materias: 'Materia Prima',
  productos: 'Productos',
  configuraciones: 'Configuraciones',
};

export const CATALOG_COLUMNS: Record<CatalogKey, ColumnDef[]> = {
  conductores: [
    { key: 'Cedula', label: 'Cédula', sortable: true },
    { key: 'Nombre', label: 'Nombre', sortable: true },
    { key: 'Fecha_Vencimiento_Licencia', label: 'Venc. Licencia', sortable: false },
  ],
  plantas: [
    { key: 'Codigo', label: 'Código', sortable: true },
    { key: 'Nombre', label: 'Nombre', sortable: true },
  ],
  proveedores: [
    { key: 'NIT', label: 'NIT', sortable: true },
    { key: 'Nombre', label: 'Nombre', sortable: true },
    { key: 'Telefono', label: 'Teléfono', sortable: false },
    { key: 'Direccion', label: 'Dirección', sortable: false },
  ],
  clientes: [
    { key: 'NIT', label: 'NIT', sortable: true },
    { key: 'Nombre', label: 'Nombre', sortable: true },
    { key: 'Telefono', label: 'Teléfono', sortable: false },
    { key: 'Direccion', label: 'Dirección', sortable: false },
  ],
  transportadoras: [
    { key: 'NIT', label: 'NIT', sortable: true },
    { key: 'Nombre', label: 'Nombre', sortable: true },
    { key: 'Telefono', label: 'Teléfono', sortable: false },
    { key: 'Direccion', label: 'Dirección', sortable: false },
  ],
  origenes: [
    { key: 'Codigo', label: 'Código', sortable: true },
    { key: 'Nombre', label: 'Nombre', sortable: true },
  ],
  destinos: [
    { key: 'Codigo', label: 'Código', sortable: true },
    { key: 'Nombre', label: 'Nombre', sortable: true },
  ],
  materias: [
    { key: 'Codigo', label: 'Código', sortable: true },
    { key: 'Nombre', label: 'Nombre', sortable: true },
  ],
  productos: [
    { key: 'Codigo', label: 'Código', sortable: true },
    { key: 'Nombre', label: 'Nombre', sortable: true },
  ],
  configuraciones: [],
};

export const CATALOG_FORM_FIELDS: Record<CatalogKey, FormFieldDef[]> = {
  conductores: [
    { name: 'Cedula', label: 'Cédula de ciudadanía', type: 'number', required: true, placeholder: 'Ej. 10160496', createOnly: true },
    { name: 'Nombre', label: 'Nombre completo', type: 'text', required: true, maxLength: 100, placeholder: 'Ej. JUAN CARLOS PÉREZ' },
    { name: 'Fecha_Vencimiento_Licencia', label: 'Fecha de vencimiento de la licencia', type: 'date', required: true },
  ],
  plantas: [
    { name: 'Codigo', label: 'Código', type: 'text', required: false, readOnly: true, editOnly: true },
    { name: 'Nombre', label: 'Nombre de la planta', type: 'text', required: true, maxLength: 100, placeholder: 'Ej. PLANTA NORTE' },
  ],
  proveedores: [
    { name: 'NIT', label: 'NIT', type: 'text', required: true, maxLength: 20, placeholder: 'Ej. 800123456-1', createOnly: true },
    { name: 'Nombre', label: 'Razón social', type: 'text', required: true, maxLength: 150, placeholder: 'Ej. PALMARES SAS' },
    { name: 'Telefono', label: 'Teléfono', type: 'text', required: true, maxLength: 30, placeholder: 'Ej. 6011234567' },
    { name: 'Direccion', label: 'Dirección', type: 'text', required: true, maxLength: 200, placeholder: 'Ej. Calle 10 # 20-30' },
  ],
  clientes: [
    { name: 'NIT', label: 'NIT', type: 'text', required: true, maxLength: 20, placeholder: 'Ej. 900123456-7', createOnly: true },
    { name: 'Nombre', label: 'Razón social', type: 'text', required: true, maxLength: 150, placeholder: 'Ej. DISTRIBUCIONES SA' },
    { name: 'Telefono', label: 'Teléfono', type: 'text', required: true, maxLength: 30, placeholder: 'Ej. 6017654321' },
    { name: 'Direccion', label: 'Dirección', type: 'text', required: true, maxLength: 200, placeholder: 'Ej. Av. 68 # 45-10' },
  ],
  transportadoras: [
    { name: 'NIT', label: 'NIT', type: 'text', required: true, maxLength: 20, placeholder: 'Ej. 900555123-4', createOnly: true },
    { name: 'Nombre', label: 'Nombre de la transportadora', type: 'text', required: true, maxLength: 100, placeholder: 'Ej. TRANSPORTES BOGOTÁ' },
    { name: 'Telefono', label: 'Teléfono', type: 'text', required: true, maxLength: 30, placeholder: 'Ej. 6019876543' },
    { name: 'Direccion', label: 'Dirección', type: 'text', required: true, maxLength: 200, placeholder: 'Ej. Carrera 30 # 15-20' },
  ],
  origenes: [
    { name: 'Codigo', label: 'Código', type: 'text', required: false, readOnly: true, editOnly: true },
    { name: 'Nombre', label: 'Nombre del origen', type: 'text', required: true, maxLength: 100, placeholder: 'Ej. VILLANUEVA' },
  ],
  destinos: [
    { name: 'Codigo', label: 'Código', type: 'text', required: false, readOnly: true, editOnly: true },
    { name: 'Nombre', label: 'Nombre del destino', type: 'text', required: true, maxLength: 100, placeholder: 'Ej. BOGOTÁ' },
  ],
  materias: [
    { name: 'Codigo', label: 'Código', type: 'text', required: false, readOnly: true, editOnly: true },
    { name: 'Nombre', label: 'Nombre de la materia prima', type: 'text', required: true, maxLength: 150, placeholder: 'Ej. ACEITE DE PALMA' },
  ],
  productos: [
    { name: 'Codigo', label: 'Código', type: 'text', required: false, readOnly: true, editOnly: true },
    { name: 'Nombre', label: 'Nombre del producto', type: 'text', required: true, maxLength: 150, placeholder: 'Ej. ACEITE REFINADO' },
  ],
  configuraciones: [],
};

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Personal',
    items: [
      { key: 'conductores', label: 'Conductores', icon: 'User' },
    ],
  },
  {
    label: 'Empresas',
    items: [
      { key: 'proveedores', label: 'Proveedores', icon: 'Building2' },
      { key: 'clientes', label: 'Clientes', icon: 'Users' },
      { key: 'transportadoras', label: 'Transportadoras', icon: 'Truck' },
    ],
  },
  {
    label: 'Lugares',
    items: [
      { key: 'plantas', label: 'Plantas', icon: 'Factory' },
      { key: 'origenes', label: 'Orígenes', icon: 'MapPin' },
      { key: 'destinos', label: 'Destinos', icon: 'Navigation' },
    ],
  },
  {
    label: 'Mercancía',
    items: [
      { key: 'materias', label: 'Materia Prima', icon: 'Package' },
      { key: 'productos', label: 'Productos', icon: 'Boxes' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { key: 'configuraciones', label: 'Configuraciones', icon: 'Settings2' },
    ],
  },
];
