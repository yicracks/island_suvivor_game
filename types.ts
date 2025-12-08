

import { Vector3 } from 'three';

export enum ItemType {
  APPLE = 'APPLE',
  FISH = 'FISH',
  WOOD = 'WOOD',
  TORCH = 'TORCH',
  SEED = 'SEED',
  APPLE_JUICE = 'APPLE_JUICE',
  BIG_FISH = 'BIG_FISH',
  WOOD_STAND = 'WOOD_STAND'
}

export type GamePhase = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'WORKBENCH' | 'NPC_MENU';

export interface Resource {
  id: string;
  type: ItemType;
  position: [number, number, number];
  eaten: boolean;
  createdAt: number; // For despawning
}

export interface TreeData {
  id: number;
  position: [number, number, number];
  scale: number;
  shakeCount: number; // For diminishing returns
  lastShakeTime: number; // For recovery
  nextDropTime: number; // For passive apple dropping
}

export interface PlantedSeed {
  id: number;
  position: [number, number, number];
  plantedAt: number;
  growthDuration: number;
}

export interface Campfire {
  id: number;
  position: [number, number, number];
  expiresAt: number;
  isLarge: boolean;
}

export interface Horse {
    id: number;
    position: [number, number, number];
    rotation: number;
}

export type NPCState = 'UNCONSCIOUS' | 'IDLE' | 'MOVING' | 'WORKING';
export type NPCTask = 'GATHER_WOOD' | 'GATHER_APPLE' | 'FISH' | null;

export interface NPC {
    id: number;
    name: string;
    position: [number, number, number];
    state: NPCState;
    targetPos: [number, number, number] | null;
    heading: [number, number, number]; // Vector direction
    energy: number;
    inventory: ItemType[];
    currentTask: NPCTask;
    skills: {
        wood: number; // 0.0 to 1.0 (added probability)
        apple: number;
        fish: number;
    };
    actionTimer: number; // ms until next action/move
    createdAt: number; // For despawning if unconscious
    
    // New AI Logic
    starving: boolean;
    lastPlayerPauseTime: number;
    ignorePlayerUntil: number;
}

export interface GameState {
  energy: number; // Renamed from health
  inventory: (ItemType | null)[]; // Fixed size array
  workbenchStorage: (ItemType | null)[]; // Storage slots
  score: number;
  
  // Environment
  timeOfDay: number; // 0 to 24
  isRaining: boolean;
  rainIntensity: number; // 0.0 to 1.0
  nextRainTime: number; // Timestamp for next allowed rain
  rainDurationRemaining: number;

  // Player Condition
  sickness: boolean;
  sicknessDuration: number; // ms remaining
  wetness: number; // 0 to 100
  isHoldingTorch: boolean;
  torchLifeRemaining: number;
  isRiding: boolean;
  
  // Nutrition Tracking
  lastFoodType: ItemType | null;
  consecutiveFoodCount: number;
}

export interface LogMessage {
  id: number;
  text: string;
  type: 'info' | 'warning' | 'success' | 'danger';
}