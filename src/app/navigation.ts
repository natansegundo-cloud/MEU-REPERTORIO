import { Heart, Library, ListMusic, Settings, type LucideIcon } from 'lucide-react';

export type SectionId = 'library' | 'repertories' | 'favorites' | 'settings';

export interface NavigationItem {
  id: SectionId;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const NAVIGATION_BY_ID = {
  library: {
    id: 'library',
    label: 'Biblioteca',
    description: 'Organize, encontre e abra suas músicas.',
    icon: Library,
  },
  repertories: {
    id: 'repertories',
    label: 'Repertórios',
    description: 'Monte sequências para ensaios e apresentações.',
    icon: ListMusic,
  },
  favorites: {
    id: 'favorites',
    label: 'Favoritos',
    description: 'Acesso rápido às músicas que você mais usa.',
    icon: Heart,
  },
  settings: {
    id: 'settings',
    label: 'Ajustes',
    description: 'Preferências do aplicativo e dados locais.',
    icon: Settings,
  },
} satisfies Record<SectionId, NavigationItem>;

export const NAVIGATION_ITEMS: readonly NavigationItem[] = Object.values(NAVIGATION_BY_ID);
