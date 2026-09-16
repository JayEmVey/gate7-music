import menuData from '../public/coffee/menu.json';
import { Language } from './types';

export interface LocalizedText {
  vi: string;
  en: string;
}

export interface MenuItem {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
}

export interface MenuCategory {
  id: string;
  name: LocalizedText;
  items: MenuItem[];
}

export interface MenuData {
  version: number;
  source: string;
  categories: MenuCategory[];
}

export const MENU = menuData satisfies MenuData;
export const MENU_ITEMS = MENU.categories.flatMap((category) => category.items);

const MENU_ITEMS_BY_ID = new Map(MENU_ITEMS.map((item) => [item.id, item]));

export function getMenuItem(id: string): MenuItem {
  const item = MENU_ITEMS_BY_ID.get(id);
  if (!item) throw new Error(`Unknown menu item: ${id}`);
  return item;
}

export function getMenuDrinkName(id: string, language: Language): string {
  return getMenuItem(id).name[language];
}
