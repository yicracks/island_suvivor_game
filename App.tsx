
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
  PlantedSeed
} from './types';
import { 
  MAX_ENERGY, 
  HEALTH_DECAY_IDLE, 
  HEALTH_DECAY_MOVING, 
  HEALTH_DECAY_SWIMMING,
  TOTAL_APPLES, 
  TOTAL_FISH,
  ISLAND_RADIUS,
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
  TREE_PASSIVE_GROWTH_RATE
} from './constants';

function App() {
  // Game Phase & State
  const [phase, setPhase] = useState<GamePhase>('MENU');
  
  const [gameState, setGameState] = useState<GameState>({
    energy: MAX_ENERGY,
    inventory: Array(INVENTORY_SIZE).fill(null),
    workbenchStorage: Array(WORKBENCH_STORAGE_SIZE).fill(null),
    score: 0,
    timeOfDay: 8, // Start at 8 AM
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
  const [isSheltered, setIsSheltered] = useState(false); // Track if under a tree
  
  // Track player position for campfire building and shelter check
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0,0,0));
  
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [trees, setTrees] = useState<TreeData[]>([]);
  const [plantedSeeds, setPlantedSeeds] = useState<PlantedSeed[]>([]);
  const [campfires, setCampfires] = useState<Campfire[]>([]);
  
  // Refs
  const lastUpdateRef = useRef(Date.now());
  const logIdCounter = useRef(0);
  const resourceIdCounter = useRef(1000);
  const campfireIdCounter = useRef(2000);
  const treeIdCounter = useRef(3000);
  const seedIdCounter = useRef(4000);

  // Helper: Add Log
  const addLog = useCallback((text: string, type: LogMessage['type'] = 'info') => {
    const id = logIdCounter.current++;
    setLogs(prev => [...prev, { id, text, type }].slice(-5));
  }, []);

  // Generate World
  const generateWorld = useCallback(() => {
    // Trees
    const newTrees: TreeData[] = [];
    for (let i = 0; i < INITIAL_TREE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * (ISLAND_RADIUS - 5);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        // Don't spawn trees too close to center workbench (radius 5)
        if (radius > 8) {
            const scale = 0.8 + Math.random() * 0.7;
            newTrees.push({ id: treeIdCounter.current++, position: [x, 0, z], scale, shakeCount: 0, lastShakeTime: 0 });
        }
    }
    setTrees(newTrees);
    setPlantedSeeds([]);

    // Resources
    const newResources: Resource[] = [];
    // Apples
    for (let i = 0; i < TOTAL_APPLES; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 8 + Math.random() * (ISLAND_RADIUS - 10);
        newResources.push({
            id: `apple-${i}`,
            type: ItemType.APPLE,
            position: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
            eaten: false,
            createdAt: Date.now()
        });
    }
    // Fish
    for (let i = 0; i < TOTAL_FISH; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = ISLAND_RADIUS + Math.random() * 30; 
        newResources.push({
            id: `fish-${i}`,
            type: ItemType.FISH,
            position: [Math.cos(angle) * r, -0.2, Math.sin(angle) * r],
            eaten: false,
            createdAt: Date.now()
        });
    }
    setResources(newResources);
    setCampfires([]);
  }, []);

  // Respawn & Despawn Mechanics
  useEffect(() => {
    if (phase !== 'PLAYING') return;

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
            
            if (randomItem.type === ItemType.WOOD || randomItem.type === ItemType.SEED) return validResources;

            if (randomItem.type === ItemType.APPLE) {
                r = 8 + Math.random() * (ISLAND_RADIUS - 10);
            } else {
                r = ISLAND_RADIUS + Math.random() * 30;
            }

            return validResources.map(res => res.id === randomItem.id ? {
                ...res,
                eaten: false,
                position: [Math.cos(angle) * r, res.position[1], Math.sin(angle) * r],
                createdAt: now
            } : res);
        });
    }, 2000); 

    return () => clearInterval(interval);
  }, [phase]);

  // Main Game Loop
  useEffect(() => {
    const gameLoop = setInterval(() => {
        if (phase !== 'PLAYING') {
            lastUpdateRef.current = Date.now();
            return;
        }

        const now = Date.now();
        const deltaMs = now - lastUpdateRef.current;
        const deltaSeconds = deltaMs / 1000;
        lastUpdateRef.current = now;

        setCampfires(prev => prev.map(c => ({...c, lifeRemaining: c.lifeRemaining - deltaMs})).filter(c => c.lifeRemaining > 0));

        // Check if player is near Workbench (Shelter)
        const distToWorkbench = playerPosRef.current.distanceTo(new THREE.Vector3(0,0,0));
        const isNearWorkbench = distToWorkbench < WORKBENCH_SHELTER_RADIUS;

        // Tree Recovery & Passive Growth
        setTrees(prev => prev.map(t => {
            let updates = { ...t };
            
            // Recovery
            if (t.shakeCount > 0 && now - t.lastShakeTime > TREE_RECOVERY_TIME) {
                updates.shakeCount = t.shakeCount - 1;
                updates.lastShakeTime = now - (TREE_RECOVERY_TIME * 0.5);
            }
            
            // Passive Growth
            if (t.scale < MAX_TREE_SCALE) {
                // Growth rate decreases as tree gets bigger (inversely proportional)
                const growthFactor = TREE_PASSIVE_GROWTH_RATE * deltaSeconds * (1 / t.scale);
                updates.scale = Math.min(MAX_TREE_SCALE, t.scale + growthFactor);
            }

            return updates;
        }));

        // Growth Logic for Planted Seeds
        setPlantedSeeds(prev => {
            const stillGrowing: PlantedSeed[] = [];
            const grown: PlantedSeed[] = [];
            
            prev.forEach(seed => {
                if (now - seed.plantedAt > seed.growthDuration) {
                    grown.push(seed);
                } else {
                    stillGrowing.push(seed);
                }
            });

            if (grown.length > 0) {
                setTrees(currentTrees => {
                    const newTrees = [...currentTrees];
                    grown.forEach(seed => {
                        if (Math.random() < TREE_GROWTH_CHANCE) {
                            newTrees.push({
                                id: treeIdCounter.current++,
                                position: seed.position,
                                scale: 0.6 + Math.random() * 0.4,
                                shakeCount: 0,
                                lastShakeTime: 0
                            });
                        }
                    });
                    return newTrees;
                });
                addLog(`${grown.length} saplings grew into trees.`, "success");
            }

            return stillGrowing;
        });

        setGameState(prev => {
            let updates = { ...prev };
            let logMsg = null;
            let logType: LogMessage['type'] = 'info';

            // 1. Time Cycle
            const timeStep = (deltaMs / DAY_LENGTH_MS) * 24; 
            let newTime = prev.timeOfDay + timeStep;
            if (newTime >= 24) newTime -= 24;
            updates.timeOfDay = newTime;

            // 2. Weather Logic
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

            // 3. Wetness Logic
            let wetnessChange = -WETNESS_DRY_RATE;
            const effectiveShelter = isSheltered || isNearWorkbench;

            if (isSwimming) {
                wetnessChange = WETNESS_GAIN_RATE * 2;
            } else if (updates.isRaining && !effectiveShelter) {
                wetnessChange = WETNESS_GAIN_RATE * (0.5 + updates.rainIntensity);
            }
            const nearFire = campfires.some(c => {
                const dist = new THREE.Vector3(...c.position).distanceTo(playerPosRef.current);
                return dist < (c.isLarge ? 12 : INTERACTION_DISTANCE * 1.5);
            });
            if (nearFire) wetnessChange = -WETNESS_GAIN_RATE * 3;

            updates.wetness = Math.max(0, Math.min(MAX_WETNESS, prev.wetness + wetnessChange));

            // 4. Torch Logic
            if (prev.isHoldingTorch) {
                if (isSwimming) {
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

            // 5. Energy Decay
            let decay = HEALTH_DECAY_IDLE;
            if (isSwimming) decay = HEALTH_DECAY_SWIMMING;
            else if (isMoving) decay = HEALTH_DECAY_MOVING;
            
            let newEnergy = prev.energy - (decay * deltaSeconds);
            if (newEnergy <= 0) {
                setPhase('GAMEOVER');
                newEnergy = 0;
            }
            updates.energy = newEnergy;

            // 6. Sickness Logic
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
    }, 100);

    return () => clearInterval(gameLoop);
  }, [phase, isMoving, isSwimming, isSheltered, addLog, campfires]);

  // --- Handlers ---

  const handleStartGame = () => {
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
  };

  const handleCollect = (resource: Resource) => {
    if (phase !== 'PLAYING') return;

    setGameState(prev => {
        const emptyIndex = prev.inventory.findIndex(item => item === null);
        
        if (emptyIndex === -1) {
            addLog("Backpack is full!", "warning");
            return prev;
        }

        const newInventory = [...prev.inventory];
        newInventory[emptyIndex] = resource.type;
        
        // Remove from map
        setResources(currRes => currRes.map(r => r.id === resource.id ? { ...r, eaten: true } : r));
        
        return {
            ...prev,
            inventory: newInventory
        };
    });
  };

  const handleInteractWorkbench = () => {
      setPhase('WORKBENCH');
  };

  const handleWorkbenchAction = (action: 'CRAFT' | 'DEPOSIT' | 'WITHDRAW', itemType?: ItemType, slotIndex?: number) => {
      setGameState(prev => {
          let newInv = [...prev.inventory];
          let newStorage = [...prev.workbenchStorage];

          if (action === 'CRAFT') {
              if (itemType === ItemType.APPLE_JUICE) {
                  // Need 3 apples
                  const appleIndices = newInv.map((item, idx) => item === ItemType.APPLE ? idx : -1).filter(i => i !== -1);
                  if (appleIndices.length >= 3) {
                      const emptySlot = newInv.findIndex(i => i === null);
                      if (emptySlot === -1 && appleIndices.length < 3) return prev; // Should have space if consuming 3
                      
                      // Remove 3 apples
                      appleIndices.slice(0, 3).forEach(idx => newInv[idx] = null);
                      
                      // Add Juice
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
  };

  const handleEat = (index: number) => {
      if (phase !== 'PLAYING') return;

      setGameState(prev => {
          const item = prev.inventory[index];
          if (!item) return prev;

          let updates = { ...prev };
          let newInv = [...prev.inventory];

          // --- CRAFTING: WOOD -> TORCH ---
          if (item === ItemType.WOOD) {
              newInv[index] = ItemType.TORCH;
              addLog("Crafted a Torch from Wood.", "info");
              updates.inventory = newInv;
              return updates;
          }

          // --- PLANTING: SEED ---
          if (item === ItemType.SEED) {
              newInv[index] = null;
              const pos: [number, number, number] = [playerPosRef.current.x, 0, playerPosRef.current.z];
              const growthTime = TREE_GROWTH_TIME_MIN + Math.random() * (TREE_GROWTH_TIME_MAX - TREE_GROWTH_TIME_MIN);
              setPlantedSeeds(s => [...s, {
                  id: seedIdCounter.current++,
                  position: pos,
                  plantedAt: Date.now(),
                  growthDuration: growthTime
              }]);
              addLog("Planted an apple seed.", "info");
              updates.inventory = newInv;
              return updates;
          }

          // --- USAGE: TORCH ---
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
                  setCampfires(c => [...c, { id: campfireIdCounter.current++, position: pos, lifeRemaining: CAMPFIRE_DURATION, isLarge: false }]);
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

          // --- USAGE: WOOD STAND (LARGE CAMPFIRE) ---
          if (item === ItemType.WOOD_STAND) {
              newInv[index] = null;
              const pos: [number, number, number] = [playerPosRef.current.x, 0, playerPosRef.current.z];
              setCampfires(c => [...c, { id: campfireIdCounter.current++, position: pos, lifeRemaining: DAY_LENGTH_MS, isLarge: true }]);
              addLog("Built a Large Campfire! Lasts all night.", "success");
              updates.inventory = newInv;
              return updates;
          }

          // --- CONSUME FOOD ---
          let isCooked = false;
          if (item === ItemType.FISH) {
             const nearFire = campfires.some(c => {
                 const dist = new THREE.Vector3(...c.position).distanceTo(playerPosRef.current);
                 return dist < INTERACTION_DISTANCE;
             });
             if (nearFire) isCooked = true;
          }

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

          // Drop Seed if Apple
          if (item === ItemType.APPLE) {
              const angle = Math.random() * Math.PI * 2;
              const dropPos: [number, number, number] = [
                  playerPosRef.current.x + Math.cos(angle) * 0.5,
                  0,
                  playerPosRef.current.z + Math.sin(angle) * 0.5
              ];
              const seedResource: Resource = {
                  id: `seed-${resourceIdCounter.current++}`,
                  type: ItemType.SEED,
                  position: dropPos,
                  eaten: false,
                  createdAt: Date.now()
              };
              setResources(res => [...res, seedResource]);
              addLog("Dropped an Apple Seed.", "info");
          }

          // Malnutrition Logic (Only check simple foods)
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
  };

  const handleTreeShake = (position: [number, number, number]) => {
    if (phase !== 'PLAYING') return;

    const treeIndex = trees.findIndex(t => t.position[0] === position[0] && t.position[2] === position[2]);
    if (treeIndex === -1) return;

    const tree = trees[treeIndex];
    // Modified chance logic: Scale + Shake Count
    const scaleModifier = tree.scale; // Bigger tree = more chance
    const currentChance = (TREE_DROP_CHANCE * scaleModifier) / (1 + tree.shakeCount * TREE_DECAY_FACTOR);
    
    setTrees(prev => {
        const newTrees = [...prev];
        newTrees[treeIndex] = { 
            ...tree, 
            shakeCount: tree.shakeCount + 1,
            lastShakeTime: Date.now()
        };
        return newTrees;
    });

    if (Math.random() < currentChance) {
        const rand = Math.random();
        const isWood = rand > 0.5;
        
        const angle = Math.random() * Math.PI * 2;
        const dropPos: [number, number, number] = [
            position[0] + (Math.random()-0.5)*2,
            0,
            position[2] + (Math.random()-0.5)*2
        ];
        
        const newResource: Resource = {
            id: `drop-${resourceIdCounter.current++}`,
            type: isWood ? ItemType.WOOD : ItemType.APPLE,
            position: dropPos,
            eaten: false,
            createdAt: Date.now()
        };

        setResources(prev => [...prev, newResource]);
        addLog(isWood ? "A log fell from the tree." : "An apple fell from the tree.", "info");
    } else {
        addLog("Nothing fell.", "info");
    }
  };

  return (
    <div 
      className="w-full h-full relative bg-slate-900 overflow-hidden" 
      onContextMenu={(e) => e.preventDefault()}
    >
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
        handleCollect={handleCollect}
        handleTreeShake={handleTreeShake}
        handleInteractWorkbench={handleInteractWorkbench}
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
      />
    </div>
  );
}

export default App;
