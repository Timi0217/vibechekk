/**
 * Developer archetype classifications and rarity tiers
 */

export const RARITY_COLORS = {
  LEGENDARY: '#f59e0b', // Gold/Amber for top 1%
  'ULTRA RARE': '#8b5cf6', // Purple for top 5%
  RARE: '#3b82f6', // Blue for top 15%
  UNCOMMON: '#10b981', // Green for top 30%
  COMMON: '#64748b', // Gray for bottom 50%
} as const;

export const ARCHETYPES = {
  // LEGENDARY (Top 1%)
  LEGENDARY: ['THE 10X ENGINEER'],

  // ULTRA RARE (Top 5%)
  ULTRA_RARE: ['THE ARCHITECT', 'THE PROFESSOR'],

  // RARE (Top 15%)
  RARE: ['THE SPECIALIST', 'THE SYSTEMS THINKER'],

  // UNCOMMON (Top 30%)
  UNCOMMON: ['THE MAINTAINER', 'THE BUILDER', 'THE CONTRIBUTOR', 'THE CRAFTSPERSON', 'THE HIDDEN GEM'],

  // COMMON (Top 50%)
  COMMON: ['THE TINKERER', 'THE GRINDER', 'THE HOBBYIST', 'THE EXPLORER', 'THE APPRENTICE'],

  // GHOST (Insufficient data)
  GHOST: ['THE GHOST'],
} as const;

export type Rarity = keyof typeof RARITY_COLORS;
export type ArchetypeCategory = keyof typeof ARCHETYPES;
