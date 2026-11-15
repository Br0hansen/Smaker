import { home, homeOutline, people, peopleOutline } from 'ionicons/icons'

/** Hovedfanene. Brukes av fanelinjen (mobil) og toppmenyen (stor skjerm). */
export const TABS = [
  { tab: 'oppskrifter', href: '/', label: 'Oppskrifter', icon: homeOutline, iconOn: home },
  { tab: 'familie', href: '/familie', label: 'Familien', icon: peopleOutline, iconOn: people },
] as const
