export interface UIStructureConfig {
  rootDir: string;
  outputPath: string;
  watch: boolean;
  debounceMs: number;
  include: string[];
  exclude: string[];
}

export interface UIStructureMap {
  app_metadata: {
    name: string;
    version: string;
    architecture: string;
  };
  global_providers: string[];
  global_components: Record<string, any>;
  pages: Record<string, PageStructure>;
  ui_components: UIComponents;
  theme_system: ThemeSystem;
  responsive_breakpoints: Record<string, string>;
  accessibility_features: string[];
}

export interface PageStructure {
  route: string | string[] | null;
  auth_required?: boolean;
  role_required?: string;
  layout?: string;
  params?: Array<{name: string; description: string}>;
  sections?: Section[];
  components?: ComponentInfo[];
  modals?: ModalInfo[];
}

export interface Section {
  name: string;
  position?: string;
  layout?: string;
  elements?: Element[];
  components?: ComponentInfo[];
}

export interface Element {
  type: string;
  content?: string;
  props?: Record<string, any>;
  testId?: string;
}

export interface ComponentInfo {
  name: string;
  props?: Record<string, any>;
  children?: ComponentInfo[];
  contains?: string[];
}

export interface ModalInfo {
  name: string;
  trigger: string;
  dismissible: boolean;
}

export interface UIComponents {
  shadcn_components: Record<string, any[]>;
  custom_components?: Record<string, any[]>;
}

export interface ThemeSystem {
  available_themes?: string[];
  dark_mode?: string;
  css_variables?: string[];
}

export interface RouteInfo {
  path: string;
  component: string;
  authRequired?: boolean;
  roleRequired?: string;
}

export interface ComponentAnalysis {
  name: string;
  layout?: string;
  authRequired?: boolean;
  sections?: Section[];
  components?: ComponentInfo[];
  globalComponents?: Record<string, any>;
  imports?: string[];
  hooks?: string[];
  testIds?: string[];
}