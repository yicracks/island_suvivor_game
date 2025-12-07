
// Map Settings
export const ISLAND_RADIUS = 50;
export const SAND_RADIUS = 55;
export const SEA_SIZE = 300;
export const SWIM_THRESHOLD = 52;
export const WATER_MOVEMENT_LIMIT = 85;

// Game Balance
export const MAX_ENERGY = 100;
export const HEALTH_DECAY_IDLE = 0.15;
export const HEALTH_DECAY_MOVING = 0.6;
export const HEALTH_DECAY_SWIMMING = 1.5;
export const MOVEMENT_SPEED = 7;
export const INTERACTION_DISTANCE = 4.0;
export const FISH_INTERACTION_DISTANCE = 8.0; // Larger radius for easier fishing
export const MOVEMENT_SPEED_SICK_MULTIPLIER = 0.5;

// Resources
export const APPLE_HEAL_AMOUNT = 15;
export const FISH_HEAL_AMOUNT = 25;
export const FISH_COOKED_HEAL_AMOUNT = 60;
export const APPLE_JUICE_HEAL_AMOUNT = 50;
export const BIG_FISH_HEAL_AMOUNT = 80;

export const TOTAL_APPLES = 8;
export const TOTAL_FISH = 15;
export const RESPAWN_RATE = 20000; // ms
export const TREE_DROP_CHANCE = 0.5; // Base chance, scales with tree size 
export const TREE_DECAY_FACTOR = 0.8; // Divisor for subsequent shakes
export const TREE_RECOVERY_TIME = 10000; // ms to recover 1 shake count
export const INVENTORY_SIZE = 10;
export const WORKBENCH_STORAGE_SIZE = 20;
export const INITIAL_TREE_COUNT = 15; // Reduced from 40

// Lifecycle
export const ITEM_DESPAWN_TIME = 60000; // 60 seconds
export const TREE_GROWTH_TIME_MIN = 30000;
export const TREE_GROWTH_TIME_MAX = 60000;
export const TREE_GROWTH_CHANCE = 0.7; // Chance to successfully grow
export const MAX_TREE_SCALE = 2.5;
export const TREE_PASSIVE_GROWTH_RATE = 0.02; // Base scale increase per second

// Items & Structures
export const TORCH_DURATION = 60000; // 60 seconds
export const TORCH_LIGHT_RADIUS = 25;
export const TORCH_LIGHT_INTENSITY = 2;
export const CAMPFIRE_DURATION = 240000; // 4 minutes
export const CAMPFIRE_LIGHT_RADIUS = 25;
export const LARGE_CAMPFIRE_DURATION = 120000; // Will be set to DAY_LENGTH_MS in logic effectively, but base value here
export const LARGE_CAMPFIRE_LIGHT_RADIUS = 45;
export const WORKBENCH_SHELTER_RADIUS = 6.0;

// Environment
export const DAY_LENGTH_MS = 120000; // 2 minutes per day
export const MIN_TIME_BETWEEN_RAINS = 120000; // Rain max once per "day"
export const RAIN_DURATION_MIN = 30000;
export const RAIN_DURATION_MAX = 60000;

// Sickness & Weather Logic
export const MAX_WETNESS = 100;
export const WETNESS_GAIN_RATE = 2.0; // Per tick (100ms)
export const WETNESS_DRY_RATE = 1.0;
export const SICKNESS_CHANCE_FROM_WETNESS = 0.02; // Per tick if wet > 80
export const SICKNESS_CHANCE_RAW_FISH = 0.30;
export const SICKNESS_CHANCE_MALNUTRITION = 0.25;
export const MALNUTRITION_THRESHOLD = 4; // 4 of same food in a row
export const SICKNESS_DURATION = 30000; // 30 seconds
export const SHELTER_DISTANCE = 3.5;
export const HEAVY_RAIN_THRESHOLD = 0.7;

// Fish AI
export const FISH_SPEED_SLOW = 0.8; // Slower for easier catching
export const FISH_SPEED_FAST = 2.5; // Slower for easier catching
