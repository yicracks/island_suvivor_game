
// Map Settings
export const ISLAND_RADIUS = 50;
export const SAND_RADIUS = 55;
export const SEA_SIZE = 300;
export const SWIM_THRESHOLD = 55;
export const WATER_MOVEMENT_LIMIT = 85;

// Game Balance
export const MAX_ENERGY = 100;
export const HEALTH_DECAY_IDLE = 0.15;
export const HEALTH_DECAY_MOVING = 0.6;
export const HEALTH_DECAY_SWIMMING = 1.5;
export const MOVEMENT_SPEED = 7;
export const HORSE_SPEED_MULTIPLIER = 3.0;
export const INTERACTION_DISTANCE = 4.0;
export const FISH_INTERACTION_DISTANCE = 8.0; 
export const MOVEMENT_SPEED_SICK_MULTIPLIER = 0.5;

// Resources
export const APPLE_HEAL_AMOUNT = 15;
export const FISH_HEAL_AMOUNT = 25;
export const FISH_COOKED_HEAL_AMOUNT = 30;
export const APPLE_JUICE_HEAL_AMOUNT = 50;
export const BIG_FISH_HEAL_AMOUNT = 80;

export const TOTAL_APPLES = 8;
export const TOTAL_FISH = 15;
export const TOTAL_HORSES = 2;
export const RESPAWN_RATE = 20000; 
export const TREE_DROP_CHANCE = 0.5; 
export const TREE_DECAY_FACTOR = 0.8; 
export const TREE_RECOVERY_TIME = 10000; 
export const TREE_AUTO_DROP_INTERVAL_MIN = 60000;
export const TREE_AUTO_DROP_INTERVAL_MAX = 120000;

export const INVENTORY_SIZE = 10;
export const WORKBENCH_STORAGE_SIZE = 20;
export const INITIAL_TREE_COUNT = 15;

// Lifecycle
export const ITEM_DESPAWN_TIME = 60000;
export const TREE_GROWTH_TIME_MIN = 30000;
export const TREE_GROWTH_TIME_MAX = 60000;
export const TREE_GROWTH_CHANCE = 0.7; 
export const MAX_TREE_SCALE = 2.5;
export const TREE_GROWTH_INTERVAL = 10000; // 10 seconds
export const TREE_GROWTH_STEP = 0.1; // Small growth step

// Items & Structures
export const TORCH_DURATION = 50000; 
export const TORCH_LIGHT_RADIUS = 30;
export const TORCH_LIGHT_INTENSITY = 2;
export const CAMPFIRE_DURATION = 200000;
export const CAMPFIRE_LIGHT_RADIUS = 100;
export const LARGE_CAMPFIRE_DURATION = 300000;
export const LARGE_CAMPFIRE_LIGHT_RADIUS = 150;
export const WORKBENCH_SHELTER_RADIUS = 6.0;

// Environment
export const DAY_LENGTH_MS = 600000; // Increased to 10 minutes
export const MIN_TIME_BETWEEN_RAINS = 120000; 
export const RAIN_DURATION_MIN = 30000;
export const RAIN_DURATION_MAX = 60000;

// Sickness & Weather Logic
export const MAX_WETNESS = 100;
export const WETNESS_GAIN_RATE = 2.0; 
export const WETNESS_DRY_RATE = 1.0;
export const SICKNESS_CHANCE_FROM_WETNESS = 0.02; 
export const SICKNESS_CHANCE_RAW_FISH = 0.30;
export const SICKNESS_CHANCE_MALNUTRITION = 0.25;
export const MALNUTRITION_THRESHOLD = 4;
export const SICKNESS_DURATION = 30000;
export const SHELTER_DISTANCE = 3.5;
export const HEAVY_RAIN_THRESHOLD = 0.7;

// Fish AI
export const FISH_SPEED_SLOW = 0.8; 
export const FISH_SPEED_FAST = 2.5; 

// NPC
export const NPC_SPAWN_CHANCE = 0.0;  //0.02
export const NPC_DESPAWN_TIME = 60000; 
export const NPC_MAX_ENERGY = 100;
export const NPC_ENERGY_DECAY = 0.1;
export const NPC_WORK_DURATION = 3000; 
export const NPC_BASE_SUCCESS_RATE = 0.3;
export const NPC_SKILL_GAIN = 0.05;
export const NPC_MOVEMENT_SPEED = 7; 
export const NPC_WANDER_DISTANCE = 30; 
export const NPC_SELF_FEED_THRESHOLD = 20;
export const NPC_PAUSE_DURATION = 5000;

export const GAME_LOOP_INTERVAL = 1000;
