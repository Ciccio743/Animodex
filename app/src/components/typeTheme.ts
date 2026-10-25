import { Bug, Droplet, Flame, Gem, Leaf, Moon, Mountain, Snowflake, Sun, Wind, type LucideIcon } from 'lucide-react';
import { Bird, Droplets, Fish, Snail, Squirrel, Turtle } from 'lucide-react';
import type { AnimodexType, TaxonGroup } from '../domain/models';
import type { CSSProperties } from 'react';

export interface TypeTheme {
  icon: LucideIcon;
  light: string;
  dark: string;
  accent: string;
}

export const TYPE_THEME: Record<AnimodexType, TypeTheme> = {
  water: { icon: Droplet, light: '#2f93c9', dark: '#0d3553', accent: '#7fd3ff' },
  air: { icon: Wind, light: '#8db9d6', dark: '#2c4e68', accent: '#e6f4ff' },
  earth: { icon: Mountain, light: '#b0834f', dark: '#4a311b', accent: '#f0c48a' },
  fire: { icon: Flame, light: '#e0662a', dark: '#6b1a0c', accent: '#ffc27a' },
  plant: { icon: Leaf, light: '#4f9a52', dark: '#163d22', accent: '#b8e6a0' },
  ice: { icon: Snowflake, light: '#9fd3e3', dark: '#2a5263', accent: '#f0ffff' },
  rock: { icon: Gem, light: '#948a7f', dark: '#37332f', accent: '#e3d8cb' },
  shadow: { icon: Moon, light: '#5a4888', dark: '#17122b', accent: '#b9a6ff' },
  light: { icon: Sun, light: '#e3bd3d', dark: '#6b500d', accent: '#fff3b0' },
  insect: { icon: Bug, light: '#93ab31', dark: '#36420f', accent: '#e6f59a' },
};

export const GROUP_ICON: Record<TaxonGroup, LucideIcon> = {
  bird: Bird,
  mammal: Squirrel,
  reptile: Turtle,
  amphibian: Droplets,
  fish: Fish,
  insect: Bug,
  other_invertebrate: Snail,
};

export function typeStyle(primary: AnimodexType, secondary?: AnimodexType): CSSProperties {
  const t = TYPE_THEME[primary];
  const style: Record<string, string> = { '--t-light': t.light, '--t-dark': t.dark, '--t-accent': t.accent };
  if (secondary) style['--t2-dark'] = TYPE_THEME[secondary].dark;
  return style as CSSProperties;
}
