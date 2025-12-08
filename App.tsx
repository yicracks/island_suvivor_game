
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { UIOverlay } from './components/UIOverlay';
import * as THREE from 'three';
import { 
  GameState, 
  ItemType, 
  Resource, 
  LogMessage,
  GamePhase,
  TreeData,
  Campfire,
  PlantedSeed,
  NPC,
  NPCTask
} from './types';
import { 
  MAX_ENERGY, 
  HEALTH_DECAY_IDLE, 
  HEALTH_DECAY_MOVING, 
  HEALTH_DECAY_SWIMMING,
  TOTAL_APPLES, 
  TOTAL_FISH,
  ISLAND_RADIUS,
  SAND_RADIUS,
  APPLE_HEAL_AMOUNT,
  FISH_HEAL_AMOUNT,
  FISH_COOKED_HEAL_AMOUNT,
  APPLE_JUICE_HEAL_AMOUNT,
  BIG_FISH_HEAL_AMOUNT,
  TREE_DROP_CHANCE,
  TREE_DECAY_FACTOR,
  INVENTORY_SIZE,
  WORKBENCH_STORAGE_SIZE,
  DAY_LENGTH_MS,
  MIN_TIME_BETWEEN_RAINS,
  RAIN_DURATION_MIN,
  RAIN_DURATION_MAX,
  WETNESS_GAIN_RATE,
  WETNESS_DRY_RATE,
  MAX_WETNESS,
  SICKNESS_DURATION,
  SICKNESS_CHANCE_FROM_WETNESS,
  SICKNESS_CHANCE_RAW_FISH,
  SICKNESS_CHANCE_MALNUTRITION,
  MALNUTRITION_THRESHOLD,
  TORCH_DURATION,
  CAMPFIRE_DURATION,
  LARGE_CAMPFIRE_DURATION,
  INTERACTION_DISTANCE,
  HEAVY_RAIN_THRESHOLD,
  INITIAL_TREE_COUNT,
  ITEM_DESPAWN_TIME,
  TREE_GROWTH_TIME_MIN,
  TREE_GROWTH_TIME_MAX,
  TREE_GROWTH_CHANCE,
  TREE_RECOVERY_TIME,
  WORKBENCH_SHELTER_RADIUS,
  MAX_TREE_SCALE,
  TREE_GROWTH_INTERVAL,
  TREE_GROWTH_STEP,
  NPC_SPAWN_CHANCE,
  NPC_DESPAWN_TIME,
  NPC_MAX_ENERGY,
  NPC_ENERGY_DECAY,
  NPC_WORK_DURATION,
  NPC_BASE_SUCCESS_RATE,
  NPC_SKILL_GAIN,
  NPC_MOVEMENT_SPEED,
  NPC_WANDER_DISTANCE,
  NPC_SELF_FEED_THRESHOLD,
  NPC_PAUSE_DURATION,
  NPC_INDICATOR_DURATION,
  GAME_LOOP_INTERVAL,
  WATER_MOVEMENT_LIMIT,
  TREE_AUTO_DROP_INTERVAL_MIN,
  TREE_AUTO_DROP_INTERVAL_MAX,
  SEA_SIZE
} from './constants';

function App() {
  // Game Phase & State
  const [phase, setPhase] = useState<GamePhase>('MENU');
  
  const [gameState, setGameState] = useState<GameState>({
    energy: MAX_ENERGY,
    inventory: Array(INVENTORY_SIZE).fill(null),
    workbenchStorage: Array(WORKBENCH_STORAGE_SIZE).fill(null),
    score: 0,
    timeOfDay: 8, 
    isRaining: false,
    rainIntensity: 0,
    nextRainTime: Date.now() + MIN_TIME_BETWEEN_RAINS,
    rainDurationRemaining: 0,
    sickness: false,
    sicknessDuration: 0,
    wetness: 0,
    isHoldingTorch: false,
    torchLifeRemaining: 0,
    lastFoodType: null,
    consecutiveFoodCount: 0
  });

  const [isMoving, setIsMoving] = useState(false);
  const [isSwimming, setIsSwimming] = useState(false);
  const [isSheltered, setIsSheltered] = useState(false); 
  
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0,0,0));
  
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [trees, setTrees] = useState<TreeData[]>([]);
  const [plantedSeeds, setPlantedSeeds] = useState<PlantedSeed[]>([]);
  const [campfires, setCampfires] = useState<Campfire[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const npcCountRef = useRef(0);

  useEffect(() => {
    npcCountRef.current = npcs.length;
  }, [npcs]);
  
  // Refs for State in Game Loop (CRITICAL FOR PERFORMANCE)
  const stateRef = useRef({
      isMoving,
      isSwimming,
      isSheltered,
      campfires,
      npcs,
      selectedNPC,
      resources,
      playerPos: playerPosRef.current
  });

  useEffect(() => {
      stateRef.current = {
          isMoving,
          isSwimming,
          isSheltered,
          campfires,
          npcs,
          selectedNPC,
          resources,
          playerPos: playerPosRef.current
      };
  }, [isMoving, isSwimming, isSheltered, campfires, npcs, selectedNPC, resources]);

  // IDs
  const lastUpdateRef = useRef(Date.now());
  const lastTreeGrowthRef = useRef(Date.now());
  const logIdCounter = useRef(0);
  const resourceIdCounter = useRef(1000);
  const campfireIdCounter = useRef(2000);
  const treeIdCounter = useRef(3000);
  const seedIdCounter = useRef(4000);
  const npcIdCounter = useRef(5000);

  // Helper: Add Log
  const addLog = useCallback((text: string, type: LogMessage['type'] = 'info') => {
    const id = logIdCounter.current++;
    setLogs(prev => [...prev, { id, text, type }].slice(-5));
  }, []);

  const getDirectionLabel = (x: number, z: number) => {
      const angle = Math.atan2(z, x); 
      const deg = angle * (180 / Math.PI);
      if (deg > -22.5 && deg <= 22.5) return "East";
      if (deg > 22.5 && deg <= 67.5) return "South-East";
      if (deg > 67.5 && deg <= 112.5) return "South";
      if (deg > 112.5 && deg <= 157.5) return "South-West";
      if (deg > 157.5 || deg <= -157.5) return "West";
      if (deg > -157.5 && deg <= -112.5) return "North-West";
      if (deg > -112.5 && deg <= -67.5) return "North";
      return "North-East";
  };

  const generateWorld = useCallback(() => {
    const newTrees: TreeData[] = [];
    const newResources: Resource[] = [];
    const now = Date.now();

    for (let i = 0; i < INITIAL_TREE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * (ISLAND_RADIUS - 5);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        if (radius > 8) {
            const scale = 0.8 + Math.random() * 0.7;
            const treePos: [number, number, number] = [x, 0, z];
            
            newTrees.push({ 
                id: treeIdCounter.current++, 
                position: treePos, 
                scale, 
                shakeCount: 0, 
                lastShakeTime: 0,
                nextDropTime: now + Math.random() * TREE_AUTO_DROP_INTERVAL_MAX
            });

            // Initial Apple under random trees (50% chance)
            if (Math.random() > 0.5) {
                const dropAngle = Math.random() * Math.PI * 2;
                const dist = 1.0 + Math.random() * 1.0;
                newResources.push({
                    id: `apple-${i}`,
                    type: ItemType.APPLE,
                    position: [x + Math.cos(dropAngle) * dist, 0, z + Math.sin(dropAngle) * dist],
                    eaten: false,
                    createdAt: now
                });
            }
        }
    }
    setTrees(newTrees);
    setPlantedSeeds([]);

    for (let i = 0; i < TOTAL_FISH; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = ISLAND_RADIUS + Math.random() * 30; 
        newResources.push({
            id: `fish-${i}`,
            type: ItemType.FISH,
            position: [Math.cos(angle) * r, -0.2, Math.sin(angle) * r],
            eaten: false,
            createdAt: now
        });
    }
    setResources(newResources);
    setCampfires([]);
    setNpcs([]);
    npcCountRef.current = 0;
  }, []);

  // Respawn & Despawn 
  useEffect(() => {
    if (phase !== 'PLAYING' && phase !== 'NPC_MENU') return;
    const interval = setInterval(() => {
        const now = Date.now();
        setResources(prev => {
            const validResources = prev.filter(r => {
                if (r.eaten) return true; 
                if (r.type === ItemType.FISH) return true; 
                return (now - r.createdAt) < ITEM_DESPAWN_TIME;
            });
            const eatenItems = validResources.filter(r => r.eaten);
            if (eatenItems.length === 0) return validResources;
            if (Math.random() > 0.5) return validResources;

            const randomItem = eatenItems[Math.floor(Math.random() * eatenItems.length)];
            const angle = Math.random() * Math.PI * 2;
            let r = 0;
            
            // Only respawn fish randomly. Apples are handled by tree drops.
            if (randomItem.type === ItemType.FISH) {
                 r = ISLAND_RADIUS + Math.random() * 30;
                 return validResources.map(res => res.id === randomItem.id ? {
                    ...res,
                    eaten: false,
                    position: [Math.cos(angle) * r, res.position[1], Math.sin(angle) * r],
                    createdAt: now
                } : res);
            }
            
            // Do not respawn apples/wood randomly
            return validResources;
        });
    }, 2000); 
    return () => clearInterval(interval);
  }, [phase]);

  // Main Game Loop
  useEffect(() => {
    const gameLoop = setInterval(() => {
        if (phase !== 'PLAYING' && phase !== 'NPC_MENU') {
            lastUpdateRef.current = Date.now();
            return;
        }

        const now = Date.now();
        const deltaMs = now - lastUpdateRef.current;
        const deltaSeconds = Math.min(deltaMs / 1000, 0.2); // Cap at 0.2s to prevent physics explosion
        lastUpdateRef.current = now;

        const current = stateRef.current; // Access latest state via ref

        // Cleanup expired campfires
        if (Math.floor(now / 1000) % 5 === 0) {
            setCampfires(prev => prev.filter(c => {
                 // @ts-ignore
                return c.expiresAt ? now < c.expiresAt : true; 
            }));
        }

        // Tree Recovery & Passive Growth & Automatic Apple Drop
        const newResourcesToAdd: Resource[] = [];
        const shouldGrowTrees = now - lastTreeGrowthRef.current > TREE_GROWTH_INTERVAL;
        if (shouldGrowTrees) {
            lastTreeGrowthRef.current = now;
        }

        setTrees(prev => prev.map(t => {
            let updates = { ...t };
            if (t.shakeCount > 0 && now - t.lastShakeTime > TREE_RECOVERY_TIME) {
                updates.shakeCount = t.shakeCount - 1;
                updates.lastShakeTime = now - (TREE_RECOVERY_TIME * 0.5);
            }
            // Step-based Growth
            if (shouldGrowTrees && t.scale < MAX_TREE_SCALE) {
                const growthFactor = TREE_GROWTH_STEP * (1 / t.scale);
                updates.scale = Math.min(MAX_TREE_SCALE, t.scale + growthFactor);
            }
            
            // Auto Drop Apple
            if (now > t.nextDropTime) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 1.0 + Math.random() * 1.5;
                const dropPos: [number, number, number] = [t.position[0] + Math.cos(angle) * dist, 0, t.position[2] + Math.sin(angle) * dist];
                newResourcesToAdd.push({
                    id: `drop-${resourceIdCounter.current++}`,
                    type: ItemType.APPLE,
                    position: dropPos,
                    eaten: false,
                    createdAt: now
                });
                updates.nextDropTime = now + TREE_AUTO_DROP_INTERVAL_MIN + Math.random() * (TREE_AUTO_DROP_INTERVAL_MAX - TREE_AUTO_DROP_INTERVAL_MIN);
            }
            
            return updates;
        }));
        
        if (newResourcesToAdd.length > 0) {
            setResources(prev => [...prev, ...newResourcesToAdd]);
        }

        // Growth Logic (Seed to Tree)
        setPlantedSeeds(prev => {
            const stillGrowing: PlantedSeed[] = [];
            const grown: PlantedSeed[] = [];
            prev.forEach(seed => {
                if (now - seed.plantedAt > seed.growthDuration) grown.push(seed);
                else stillGrowing.push(seed);
            });
            if (grown.length > 0) {
                setTrees(currentTrees => {
                    const newTrees = [...currentTrees];
                    grown.forEach(seed => {
                        if (Math.random() < TREE_GROWTH_CHANCE) {
                            newTrees.push({
                                id: treeIdCounter.current++,
                                position: seed.position,
                                scale: 0.3, // Start small as a sapling
                                shakeCount: 0,
                                lastShakeTime: 0,
                                nextDropTime: now + TREE_AUTO_DROP_INTERVAL_MIN + Math.random() * TREE_AUTO_DROP_INTERVAL_MAX
                            });
                        }
                    });
                    return newTrees;
                });
                addLog(`${grown.length} saplings grew into small trees.`, "success");
            }
            return stillGrowing;
        });

        // --- NPC Logic ---
        if (npcCountRef.current === 0 && Math.random() < NPC_SPAWN_CHANCE * (GAME_LOOP_INTERVAL/100)) { 
            const angle = Math.random() * Math.PI * 2;
            // Spawn on land, near water (Radius 45)
            const spawnX = Math.cos(angle) * (ISLAND_RADIUS * 0.9);
            const spawnZ = Math.sin(angle) * (ISLAND_RADIUS * 0.9);
            const spawnPos: [number, number, number] = [spawnX, 0.2, spawnZ];
            
            // Initial heading towards center
            const heading = new THREE.Vector3(0,0,0).sub(new THREE.Vector3(spawnX, 0, spawnZ)).normalize();
            
            const directionLabel = getDirectionLabel(spawnX, spawnZ);

            setNpcs(prev => [
                ...prev,
                {
                    id: npcIdCounter.current++,
                    name: `Survivor ${prev.length + 1}`,
                    position: spawnPos,
                    state: 'UNCONSCIOUS',
                    targetPos: null,
                    heading: [heading.x, 0, heading.z],
                    energy: NPC_MAX_ENERGY / 2, 
                    inventory: [],
                    currentTask: null,
                    skills: { wood: 0, apple: 0, fish: 0 },
                    actionTimer: 0,
                    createdAt: now,
                    starving: false,
                    lastPlayerPauseTime: 0,
                    ignorePlayerUntil: 0
                }
            ]);
            addLog(`A survivor washed up on the ${directionLabel} side!`, "info");
        }

        let eatenResourceIds: string[] = [];

        setNpcs(prev => {
            const livingNpcs: NPC[] = [];
            prev.forEach(npc => {
                let updated = { ...npc };
                if (npc.state === 'UNCONSCIOUS') {
                    if (now - npc.createdAt > NPC_DESPAWN_TIME) return;
                    livingNpcs.push(updated);
                    return;
                }
                
                // Energy Consumption
                updated.energy -= NPC_ENERGY_DECAY * deltaSeconds;
                if (updated.state === 'MOVING' || updated.state === 'WORKING') updated.energy -= NPC_ENERGY_DECAY * deltaSeconds;
                
                // Self Feed
                if (updated.energy < NPC_SELF_FEED_THRESHOLD) {
                    const foodIdx = updated.inventory.findIndex(i => i === ItemType.APPLE || i === ItemType.FISH);
                    if (foodIdx !== -1) {
                        updated.inventory.splice(foodIdx, 1);
                        updated.energy += 20;
                        updated.starving = false;
                    }
                }

                // Check Death
                if (updated.energy <= 0) {
                    addLog(`${updated.name} died of exhaustion.`, "danger");
                    if (current.selectedNPC?.id === updated.id) setSelectedNPC(null);
                    return;
                }

                const npcPosV = new THREE.Vector3(...updated.position);
                const distToCenter = new THREE.Vector3(updated.position[0], 0, updated.position[2]).length();

                // Starvation Logic: Return to Land / Stop
                const hasFood = updated.inventory.some(i => i === ItemType.APPLE || i === ItemType.FISH);
                if (updated.energy < NPC_SELF_FEED_THRESHOLD && !hasFood) {
                    if (!updated.starving) {
                        addLog(`${updated.name} is starving and has stopped working!`, "danger");
                        updated.starving = true;
                    }
                    
                    // If in water, move to land first
                    if (distToCenter > SAND_RADIUS) {
                        updated.state = 'MOVING';
                        updated.heading = [0,0,0].map((v,i) => v - updated.position[i]) as [number,number,number];
                        // Normalize
                        const h = new THREE.Vector3(...updated.heading).normalize();
                        if (h.lengthSq() > 0) updated.heading = [h.x, 0, h.z];
                    } else {
                        // On Land, just stop
                        updated.state = 'IDLE';
                        updated.targetPos = null;
                        livingNpcs.push(updated);
                        return; 
                    }
                } else {
                    updated.starving = false;
                }

                // Player Proximity Logic
                const playerDist = npcPosV.distanceTo(current.playerPos);
                const isPaused = now - updated.lastPlayerPauseTime < NPC_PAUSE_DURATION;
                
                if (playerDist < 6.0 && now > updated.ignorePlayerUntil && !updated.starving) {
                    if (!isPaused) {
                         updated.lastPlayerPauseTime = now;
                    }
                    updated.state = 'IDLE';
                    livingNpcs.push(updated);
                    return;
                }

                // --- AI TASK HANDLING ---
                if (updated.state === 'IDLE' && !updated.starving) {
                    // IDLE WANDERING LOGIC
                    if (updated.targetPos) {
                         // Currently Wandering
                         const tPos = new THREE.Vector3(...updated.targetPos);
                         const dist = npcPosV.distanceTo(tPos);
                         
                         if (dist < 1.0) {
                             // Reached Idle Target
                             updated.targetPos = null;
                             updated.actionTimer = 5000 + Math.random() * 5000; // Wait
                         } else {
                             // Move towards target
                             const dir = tPos.clone().sub(npcPosV).normalize();
                             updated.heading = [dir.x, 0, dir.z];
                             const speed = NPC_MOVEMENT_SPEED * 0.5 * deltaSeconds; // Slower wander
                             const nextPos = npcPosV.clone().add(dir.multiplyScalar(speed));
                             updated.position = [nextPos.x, nextPos.y, nextPos.z];
                         }
                    } else {
                        // Waiting
                        updated.actionTimer -= deltaMs;
                        if (updated.actionTimer <= 0) {
                            if (Math.random() > 0.5) {
                                // Pick new wander target (Map Wide)
                                const angle = Math.random() * Math.PI * 2;
                                const r = Math.random() * (ISLAND_RADIUS + 50); // Land or Shore
                                updated.targetPos = [Math.cos(angle) * r, 0, Math.sin(angle) * r];
                            } else {
                                // Wait more
                                updated.actionTimer = 3000 + Math.random() * 3000;
                            }
                        }
                    }
                    
                    // If task was assigned, switch to moving immediately
                    if (updated.currentTask) {
                        updated.state = 'MOVING';
                        updated.targetPos = null; // Reset wander target
                    }

                    livingNpcs.push(updated);
                    return;
                }

                // Active Task Logic
                if (updated.currentTask || updated.starving || updated.state === 'MOVING') {
                    updated.state = 'MOVING'; // Force moving state if has task

                    // 1. Passive Collection (Chance to grab items while walking)
                    if (!updated.starving) {
                        const targetType = updated.currentTask === 'FISH' ? ItemType.FISH : (updated.currentTask === 'GATHER_WOOD' ? ItemType.WOOD : ItemType.APPLE);
                        
                        // Find nearby items
                        const nearbyResources = current.resources.filter(r => 
                            !r.eaten && 
                            !eatenResourceIds.includes(r.id) && 
                            r.type === targetType &&
                            new THREE.Vector3(...r.position).distanceTo(npcPosV) < INTERACTION_DISTANCE
                        );

                        for (const res of nearbyResources) {
                            // Probability Check
                            let chance = NPC_BASE_SUCCESS_RATE;
                            if (targetType === ItemType.FISH) chance += updated.skills.fish;
                            else if (targetType === ItemType.WOOD) chance += updated.skills.wood;
                            else chance += updated.skills.apple;

                            if (Math.random() < chance) {
                                // Collect
                                updated.inventory.push(targetType);
                                eatenResourceIds.push(res.id);
                                // Skill up
                                if (targetType === ItemType.FISH) updated.skills.fish = Math.min(1, updated.skills.fish + NPC_SKILL_GAIN);
                                else if (targetType === ItemType.WOOD) updated.skills.wood = Math.min(1, updated.skills.wood + NPC_SKILL_GAIN);
                                else updated.skills.apple = Math.min(1, updated.skills.apple + NPC_SKILL_GAIN);
                            }
                        }
                    }

                    // 2. Zone Movement Logic
                    let heading = new THREE.Vector3(...updated.heading);
                    if (heading.lengthSq() < 0.1) heading.set(1, 0, 0); // fallback

                    const isGatherer = updated.currentTask === 'GATHER_APPLE' || updated.currentTask === 'GATHER_WOOD';
                    const isFisher = updated.currentTask === 'FISH';
                    
                    let bounce = false;
                    let headingVector = heading.clone();
                    
                    // Zone Enforcement / Travel Phase
                    if (updated.starving) {
                        // Go home
                        const dir = new THREE.Vector3(0,0,0).sub(npcPosV).normalize();
                        if (dir.lengthSq() > 0) headingVector = dir;
                    } 
                    else if (isGatherer) {
                        if (distToCenter > SAND_RADIUS) {
                            // Wrong Zone (Water): Go to center
                            const dir = new THREE.Vector3(0,0,0).sub(npcPosV).normalize();
                            if (dir.lengthSq() > 0) headingVector = dir;
                        } else {
                            // Correct Zone (Land): Patrol
                            const nextPos = npcPosV.clone().add(headingVector.clone().multiplyScalar(NPC_MOVEMENT_SPEED * deltaSeconds));
                            if (nextPos.length() > SAND_RADIUS) bounce = true;
                        }
                    } 
                    else if (isFisher) {
                        if (distToCenter < ISLAND_RADIUS) {
                            // Wrong Zone (Land): Go to Sea
                            const dir = npcPosV.clone().sub(new THREE.Vector3(0,0,0)).normalize();
                            if (dir.lengthSq() > 0) headingVector = dir;
                        } else {
                            // Correct Zone (Sea): Patrol
                            const nextPos = npcPosV.clone().add(headingVector.clone().multiplyScalar(NPC_MOVEMENT_SPEED * deltaSeconds));
                            if (nextPos.length() < ISLAND_RADIUS || nextPos.length() > WATER_MOVEMENT_LIMIT) bounce = true;
                        }
                    }

                    // Bounce & Random Turns Logic (Only applies if patrolling in zone)
                    if (bounce) {
                        headingVector.negate(); // Reflect
                        // Add significant noise to avoid walking same line
                        const noise = (Math.random() - 0.5) * Math.PI; // +/- 90deg
                        headingVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), noise);
                    } else {
                        // Occasional wobble (10% chance per tick) to look natural
                        if (Math.random() < 0.1) {
                             const wobble = (Math.random() - 0.5) * (Math.PI / 6); // +/- 30deg
                             headingVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), wobble);
                        }
                    }

                    headingVector.normalize();
                    updated.heading = [headingVector.x, 0, headingVector.z];

                    // Apply Movement
                    const speed = NPC_MOVEMENT_SPEED * deltaSeconds;
                    const finalMove = headingVector.multiplyScalar(speed);
                    updated.position = [updated.position[0] + finalMove.x, updated.position[1], updated.position[2] + finalMove.z];
                    
                    // Set Target Pos far ahead so the Visual Model looks in this direction
                    const lookAtTarget = npcPosV.clone().add(headingVector.clone().multiplyScalar(10));
                    updated.targetPos = [lookAtTarget.x, 0, lookAtTarget.z];
                } 

                livingNpcs.push(updated);
            });
            return livingNpcs;
        });

        // Batch update resources if NPCs ate anything
        if (eatenResourceIds.length > 0) {
            setResources(prev => prev.map(r => eatenResourceIds.includes(r.id) ? { ...r, eaten: true } : r));
        }

        // Sync selected NPC
        if (current.selectedNPC) {
             setNpcs(list => {
                 const found = list.find(n => n.id === current.selectedNPC?.id);
                 if (found) setSelectedNPC(found);
                 return list;
             });
        }

        setGameState(prev => {
            let updates = { ...prev };
            let logMsg = null;
            let logType: LogMessage['type'] = 'info';

            const timeStep = (deltaMs / DAY_LENGTH_MS) * 24; 
            let newTime = prev.timeOfDay + timeStep;
            if (newTime >= 24) newTime %= 24; // Use modulo to keep strictly within 0-24
            updates.timeOfDay = newTime;

            if (prev.isRaining) {
                updates.rainDurationRemaining -= deltaMs;
                if (updates.rainDurationRemaining <= 0) {
                    updates.isRaining = false;
                    updates.rainIntensity = 0;
                    updates.nextRainTime = now + MIN_TIME_BETWEEN_RAINS + Math.random() * MIN_TIME_BETWEEN_RAINS;
                    logMsg = "The rain has stopped.";
                }
            } else {
                if (now > prev.nextRainTime) {
                    updates.isRaining = true;
                    updates.rainIntensity = 0.2 + Math.random() * 0.8; 
                    updates.rainDurationRemaining = RAIN_DURATION_MIN + Math.random() * (RAIN_DURATION_MAX - RAIN_DURATION_MIN);
                    const isHeavy = updates.rainIntensity > HEAVY_RAIN_THRESHOLD;
                    logMsg = isHeavy ? "A storm is brewing! Heavy rain!" : "It started raining.";
                }
            }

            let wetnessChange = -WETNESS_DRY_RATE;
            const distToWorkbench = current.playerPos.distanceTo(new THREE.Vector3(0,0,0));
            const isNearWorkbench = distToWorkbench < WORKBENCH_SHELTER_RADIUS;
            const effectiveShelter = current.isSheltered || isNearWorkbench;

            if (current.isSwimming) {
                wetnessChange = WETNESS_GAIN_RATE * 2;
            } else if (updates.isRaining && !effectiveShelter) {
                wetnessChange = WETNESS_GAIN_RATE * (0.5 + updates.rainIntensity);
            }
            const nearFire = current.campfires.some(c => {
                 // @ts-ignore
                if (c.expiresAt && now > c.expiresAt) return false;
                const dist = new THREE.Vector3(...c.position).distanceTo(current.playerPos);
                return dist < (c.isLarge ? 12 : INTERACTION_DISTANCE * 1.5);
            });
            if (nearFire) wetnessChange = -WETNESS_GAIN_RATE * 3;

            updates.wetness = Math.max(0, Math.min(MAX_WETNESS, prev.wetness + wetnessChange));

            if (prev.isHoldingTorch) {
                if (current.isSwimming) {
                    updates.isHoldingTorch = false;
                    updates.torchLifeRemaining = 0;
                    logMsg = "The water extinguished your torch!";
                    logType = "warning";
                } else {
                    updates.torchLifeRemaining -= deltaMs;
                    if (updates.torchLifeRemaining <= 0) {
                        updates.isHoldingTorch = false;
                        logMsg = "Your torch burned out.";
                    }
                }
            }

            let decay = HEALTH_DECAY_IDLE;
            if (current.isSwimming) decay = HEALTH_DECAY_SWIMMING;
            else if (current.isMoving) decay = HEALTH_DECAY_MOVING;
            
            let newEnergy = prev.energy - (decay * deltaSeconds);
            if (newEnergy <= 0) {
                setPhase('GAMEOVER');
                newEnergy = 0;
            }
            updates.energy = newEnergy;

            if (!prev.sickness && updates.wetness > 80) {
                 const sicknessMult = updates.rainIntensity > HEAVY_RAIN_THRESHOLD ? 2.5 : 1.0;
                 if (Math.random() < SICKNESS_CHANCE_FROM_WETNESS * sicknessMult) {
                     updates.sickness = true;
                     updates.sicknessDuration = SICKNESS_DURATION;
                     logMsg = "You caught a cold from the dampness!";
                     logType = "danger";
                 }
            }
            if (prev.sickness) {
                updates.sicknessDuration -= deltaMs;
                if (updates.sicknessDuration <= 0) {
                    updates.sickness = false;
                    logMsg = "You feel better.";
                    logType = "success";
                }
            }

            if (logMsg) addLog(logMsg, logType);
            return updates;
        });
    }, GAME_LOOP_INTERVAL); 

    return () => clearInterval(gameLoop);
  }, [phase, addLog]); // Minimized dependencies!

  // --- Handlers (Memoized) ---

  const handleStartGame = useCallback(() => {
    generateWorld();
    setGameState({
        energy: MAX_ENERGY,
        inventory: Array(INVENTORY_SIZE).fill(null),
        workbenchStorage: Array(WORKBENCH_STORAGE_SIZE).fill(null),
        score: 0,
        timeOfDay: 8,
        isRaining: false,
        rainIntensity: 0,
        nextRainTime: Date.now() + MIN_TIME_BETWEEN_RAINS,
        rainDurationRemaining: 0,
        sickness: false,
        sicknessDuration: 0,
        wetness: 0,
        isHoldingTorch: false,
        torchLifeRemaining: 0,
        lastFoodType: null,
        consecutiveFoodCount: 0
    });
    setLogs([]);
    setPhase('PLAYING');
    setIsSwimming(false);
    addLog("Welcome survivor. Find Apples and catch fish!", "info");
  }, [generateWorld, addLog]);

  const handleInteractNPC = useCallback((npc: NPC) => {
      if (npc.state === 'UNCONSCIOUS') {
          // Initialize heading randomly when waking up
          const angle = Math.random() * Math.PI * 2;
          const h = [Math.cos(angle), 0, Math.sin(angle)] as [number, number, number];
          setNpcs(prev => prev.map(n => n.id === npc.id ? { ...n, state: 'IDLE', energy: 50, heading: h } : n));
          addLog(`${npc.name} woke up! "Thank you! I'll do whatever you say."`, "success");
      } else {
          setSelectedNPC(npc);
          setPhase('NPC_MENU');
      }
  }, [addLog]);

  const handleNPCCommand = useCallback((taskId: NPCTask) => {
      setSelectedNPC(curr => {
          if (!curr) return null;
          // Set task and clear targetPos to force new direction calc
          // Also set ignorePlayerUntil to future so they don't stop immediately if standing next to player
          const ignoreTime = Date.now() + 5000;
          
          setNpcs(prev => prev.map(n => n.id === curr.id ? { 
              ...n, 
              currentTask: taskId, 
              state: taskId ? 'MOVING' : 'IDLE', // Correctly switch to IDLE if task is null
              targetPos: null, 
              ignorePlayerUntil: ignoreTime 
          } : n));
          return curr;
      });
  }, []);

  const handleNPCCollect = useCallback(() => {
      setSelectedNPC(curr => {
        if (!curr) return null;
        setGameState(prev => {
            let newInv = [...prev.inventory];
            let npcInv = [...curr.inventory];
            let collectedCount = 0;
            const emptySlots = newInv.map((val, idx) => val === null ? idx : -1).filter(i => i !== -1);
            
            if (emptySlots.length === 0) {
                addLog("Your inventory is full!", "warning");
                return prev;
            }
            while(emptySlots.length > 0 && npcInv.length > 0) {
                const item = npcInv.shift();
                const slot = emptySlots.shift();
                if (item && slot !== undefined) {
                    newInv[slot] = item;
                    collectedCount++;
                }
            }
            setNpcs(l => l.map(n => n.id === curr.id ? { ...n, inventory: npcInv } : n));
            if (collectedCount > 0) addLog(`Collected ${collectedCount} items from ${curr.name}.`, "success");
            return { ...prev, inventory: newInv };
        });
        return curr;
      });
  }, [addLog]);

  const handleNPCFeed = useCallback(() => {
      setSelectedNPC(curr => {
        if (!curr) return null;
        setGameState(prev => {
            const foodIdx = prev.inventory.findIndex(i => i === ItemType.APPLE || i === ItemType.FISH || i === ItemType.BIG_FISH || i === ItemType.APPLE_JUICE);
            if (foodIdx === -1) {
                addLog("No food in your inventory to give!", "warning");
                return prev;
            }
            const item = prev.inventory[foodIdx];
            let heal = 0;
            if (item === ItemType.APPLE) heal = APPLE_HEAL_AMOUNT;
            else if (item === ItemType.FISH) heal = FISH_HEAL_AMOUNT;
            else if (item === ItemType.BIG_FISH) heal = BIG_FISH_HEAL_AMOUNT;
            else if (item === ItemType.APPLE_JUICE) heal = APPLE_JUICE_HEAL_AMOUNT;

            const newInv = [...prev.inventory];
            newInv[foodIdx] = null;
            setNpcs(l => l.map(n => n.id === curr.id ? { ...n, energy: Math.min(NPC_MAX_ENERGY, n.energy + heal), starving: false } : n));
            addLog(`Gave ${item} to ${curr.name}.`, "info");
            return { ...prev, inventory: newInv };
        });
        return curr;
      });
  }, [addLog]);

  const handleCollect = useCallback((resource: Resource) => {
    setGameState(prev => {
        const emptyIndex = prev.inventory.findIndex(item => item === null);
        if (emptyIndex === -1) {
            addLog("Backpack is full!", "warning");
            return prev;
        }
        const newInventory = [...prev.inventory];
        newInventory[emptyIndex] = resource.type;
        setResources(currRes => currRes.map(r => r.id === resource.id ? { ...r, eaten: true } : r));
        return { ...prev, inventory: newInventory };
    });
  }, [addLog]);

  const handleInteractWorkbench = useCallback(() => {
      setPhase('WORKBENCH');
  }, []);

  const handleWorkbenchAction = useCallback((action: 'CRAFT' | 'DEPOSIT' | 'WITHDRAW', itemType?: ItemType, slotIndex?: number) => {
      setGameState(prev => {
          let newInv = [...prev.inventory];
          let newStorage = [...prev.workbenchStorage];

          if (action === 'CRAFT') {
              if (itemType === ItemType.APPLE_JUICE) {
                  const appleIndices = newInv.map((item, idx) => item === ItemType.APPLE ? idx : -1).filter(i => i !== -1);
                  if (appleIndices.length >= 3) {
                      appleIndices.slice(0, 3).forEach(idx => newInv[idx] = null);
                      const targetSlot = newInv.findIndex(i => i === null);
                      if (targetSlot !== -1) newInv[targetSlot] = ItemType.APPLE_JUICE;
                      addLog("Crafted Apple Juice!", "success");
                  }
              }
              else if (itemType === ItemType.BIG_FISH) {
                  const fishIndices = newInv.map((item, idx) => item === ItemType.FISH ? idx : -1).filter(i => i !== -1);
                  if (fishIndices.length >= 3) {
                      fishIndices.slice(0, 3).forEach(idx => newInv[idx] = null);
                      const targetSlot = newInv.findIndex(i => i === null);
                      if (targetSlot !== -1) newInv[targetSlot] = ItemType.BIG_FISH;
                      addLog("Crafted Big Fish!", "success");
                  }
              }
              else if (itemType === ItemType.WOOD_STAND) {
                  const woodIndices = newInv.map((item, idx) => item === ItemType.WOOD ? idx : -1).filter(i => i !== -1);
                  if (woodIndices.length >= 3) {
                      woodIndices.slice(0, 3).forEach(idx => newInv[idx] = null);
                      const targetSlot = newInv.findIndex(i => i === null);
                      if (targetSlot !== -1) newInv[targetSlot] = ItemType.WOOD_STAND;
                      addLog("Crafted Wooden Stand!", "success");
                  }
              }
          } 
          else if (action === 'DEPOSIT' && slotIndex !== undefined) {
              const item = newInv[slotIndex];
              const emptyStorageSlot = newStorage.findIndex(i => i === null);
              if (item && emptyStorageSlot !== -1) {
                  newInv[slotIndex] = null;
                  newStorage[emptyStorageSlot] = item;
              }
          }
          else if (action === 'WITHDRAW' && slotIndex !== undefined) {
              const item = newStorage[slotIndex];
              const emptyInvSlot = newInv.findIndex(i => i === null);
              if (item && emptyInvSlot !== -1) {
                  newStorage[slotIndex] = null;
                  newInv[emptyInvSlot] = item;
              }
          }
          return { ...prev, inventory: newInv, workbenchStorage: newStorage };
      });
  }, [addLog]);

  const handleEat = useCallback((index: number) => {
      setGameState(prev => {
          const item = prev.inventory[index];
          if (!item) return prev;

          let updates = { ...prev };
          let newInv = [...prev.inventory];

          if (item === ItemType.WOOD) {
              newInv[index] = ItemType.TORCH;
              addLog("Crafted a Torch from Wood.", "info");
              updates.inventory = newInv;
              return updates;
          }

          if (item === ItemType.SEED) {
              newInv[index] = null;
              const pos: [number, number, number] = [playerPosRef.current.x, 0, playerPosRef.current.z];
              const growthTime = TREE_GROWTH_TIME_MIN + Math.random() * (TREE_GROWTH_TIME_MAX - TREE_GROWTH_TIME_MIN);
              setPlantedSeeds(s => [...s, { id: seedIdCounter.current++, position: pos, plantedAt: Date.now(), growthDuration: growthTime }]);
              addLog("Planted an apple seed.", "info");
              updates.inventory = newInv;
              return updates;
          }

          if (item === ItemType.TORCH) {
              const torchCount = newInv.filter(t => t === ItemType.TORCH).length;
              if (prev.isHoldingTorch && torchCount >= 3) {
                  let removedCount = 0;
                  for(let i=0; i<newInv.length; i++) {
                      if (newInv[i] === ItemType.TORCH && removedCount < 3) {
                          newInv[i] = null;
                          removedCount++;
                      }
                  }
                  const pos: [number, number, number] = [playerPosRef.current.x, 0, playerPosRef.current.z];
                  const expiresAt = Date.now() + CAMPFIRE_DURATION;
                  // @ts-ignore
                  setCampfires(c => [...c, { id: campfireIdCounter.current++, position: pos, expiresAt: expiresAt, isLarge: false }]);
                  addLog("Built a Campfire!", "success");
                  updates.inventory = newInv;
                  return updates;
              } 
              newInv[index] = null;
              updates.isHoldingTorch = true;
              updates.torchLifeRemaining = TORCH_DURATION;
              addLog("Lit a torch.", "info");
              updates.inventory = newInv;
              return updates;
          }

          if (item === ItemType.WOOD_STAND) {
              newInv[index] = null;
              const pos: [number, number, number] = [playerPosRef.current.x, 0, playerPosRef.current.z];
              const expiresAt = Date.now() + LARGE_CAMPFIRE_DURATION;
              // @ts-ignore
              setCampfires(c => [...c, { id: campfireIdCounter.current++, position: pos, expiresAt: expiresAt, isLarge: true }]);
              addLog("Built a Large Campfire!", "success");
              updates.inventory = newInv;
              return updates;
          }

          let isCooked = false;
          // Check for campfire proximity using current stateRef not old closures
          const nearFire = stateRef.current.campfires.some(c => {
                 // @ts-ignore
                 if (c.expiresAt && Date.now() > c.expiresAt) return false;
                 const dist = new THREE.Vector3(...c.position).distanceTo(playerPosRef.current);
                 return dist < INTERACTION_DISTANCE;
          });
          if (item === ItemType.FISH && nearFire) isCooked = true;

          let healAmount = 0;
          let scoreGain = 0;
          if (item === ItemType.APPLE) { healAmount = APPLE_HEAL_AMOUNT; scoreGain = 10; }
          else if (item === ItemType.APPLE_JUICE) { healAmount = APPLE_JUICE_HEAL_AMOUNT; scoreGain = 30; }
          else if (item === ItemType.BIG_FISH) { healAmount = BIG_FISH_HEAL_AMOUNT; scoreGain = 80; }
          else if (item === ItemType.FISH) { healAmount = isCooked ? FISH_COOKED_HEAL_AMOUNT : FISH_HEAL_AMOUNT; scoreGain = isCooked ? 100 : 50; }

          newInv[index] = null;
          updates.inventory = newInv;
          updates.energy = Math.min(MAX_ENERGY, prev.energy + healAmount);
          updates.score = prev.score + scoreGain;

          const itemName = item.replace('_', ' ').toLowerCase();
          if (isCooked) addLog("Ate delicious Grilled Fish! +60 Energy", "success");
          else addLog(`Ate ${itemName}. +${healAmount} Energy`, "info");

          if (item === ItemType.APPLE) {
              const angle = Math.random() * Math.PI * 2;
              const dropPos: [number, number, number] = [playerPosRef.current.x + Math.cos(angle) * 0.5, 0, playerPosRef.current.z + Math.sin(angle) * 0.5];
              const seedResource: Resource = { id: `seed-${seedIdCounter.current++}`, type: ItemType.SEED, position: dropPos, eaten: false, createdAt: Date.now() };
              setResources(res => [...res, seedResource]);
              addLog("Dropped an Apple Seed.", "info");
          }

          if (item === ItemType.APPLE || item === ItemType.FISH) {
              if (prev.lastFoodType === item) {
                  updates.consecutiveFoodCount += 1;
                  if (updates.consecutiveFoodCount > MALNUTRITION_THRESHOLD && !isCooked) {
                      addLog("Warning: Need balanced diet.", "warning");
                      if (Math.random() < SICKNESS_CHANCE_MALNUTRITION && !prev.sickness) {
                          updates.sickness = true;
                          updates.sicknessDuration = SICKNESS_DURATION;
                          addLog("Sick from malnutrition!", "danger");
                      }
                  }
              } else {
                  updates.lastFoodType = item;
                  updates.consecutiveFoodCount = 1;
              }
          }

          if (item === ItemType.FISH && !isCooked && !prev.sickness) {
               if (Math.random() < SICKNESS_CHANCE_RAW_FISH) {
                   updates.sickness = true;
                   updates.sicknessDuration = SICKNESS_DURATION;
                   addLog("Raw fish made you sick!", "danger");
               }
          }
          return updates;
      });
  }, [addLog]);

  const handleTreeShake = useCallback((position: [number, number, number]) => {
    setTrees(currentTrees => {
        const treeIndex = currentTrees.findIndex(t => t.position[0] === position[0] && t.position[2] === position[2]);
        if (treeIndex === -1) return currentTrees;

        const tree = currentTrees[treeIndex];
        const scaleModifier = tree.scale; 
        const currentChance = (TREE_DROP_CHANCE * scaleModifier) / (1 + tree.shakeCount * TREE_DECAY_FACTOR);
        
        const newTrees = [...currentTrees];
        newTrees[treeIndex] = { ...tree, shakeCount: tree.shakeCount + 1, lastShakeTime: Date.now() };

        if (Math.random() < currentChance) {
            const rand = Math.random();
            const isWood = rand > 0.5;
            const angle = Math.random() * Math.PI * 2;
            const dropPos: [number, number, number] = [position[0] + (Math.random()-0.5)*2, 0, position[2] + (Math.random()-0.5)*2];
            const newResource: Resource = { id: `drop-${resourceIdCounter.current++}`, type: isWood ? ItemType.WOOD : ItemType.APPLE, position: dropPos, eaten: false, createdAt: Date.now() };
            setResources(prev => [...prev, newResource]);
            addLog(isWood ? "A log fell from the tree." : "An apple fell from the tree.", "info");
        } else {
            addLog("Nothing fell.", "info");
        }
        return newTrees;
    });
  }, [addLog]);

  return (
    <div className="w-full h-full relative bg-slate-900 overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      <GameCanvas 
        gameState={gameState} 
        phase={phase}
        setMoving={setIsMoving} 
        setSwimming={setIsSwimming}
        setSheltered={setIsSheltered}
        resources={resources}
        trees={trees}
        plantedSeeds={plantedSeeds}
        campfires={campfires}
        npcs={npcs}
        handleCollect={handleCollect}
        handleTreeShake={handleTreeShake}
        handleInteractWorkbench={handleInteractWorkbench}
        handleInteractNPC={handleInteractNPC}
        playerPosRef={playerPosRef}
      />
      <UIOverlay 
        gameState={gameState} 
        phase={phase}
        logs={logs} 
        onStart={handleStartGame}
        onResume={() => setPhase('PLAYING')}
        onPause={() => setPhase(p => p === 'PLAYING' ? 'PAUSED' : 'PLAYING')}
        onQuit={() => setPhase('MENU')}
        onEat={handleEat}
        onWorkbenchAction={handleWorkbenchAction}
        onCloseWorkbench={() => setPhase('PLAYING')}
        selectedNPC={selectedNPC}
        onNPCCommand={handleNPCCommand}
        onNPCCollect={handleNPCCollect}
        onNPCFeed={handleNPCFeed}
        onCloseNPCMenu={() => setPhase('PLAYING')}
      />
    </div>
  );
}

export default App;
