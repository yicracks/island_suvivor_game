
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, Sparkles, Text } from '@react-three/drei';
import * as THREE from 'three';
import { 
    ISLAND_RADIUS, 
    MOVEMENT_SPEED, 
    SAND_RADIUS, 
    SEA_SIZE, 
    INTERACTION_DISTANCE, 
    FISH_INTERACTION_DISTANCE,
    SWIM_THRESHOLD, 
    WATER_MOVEMENT_LIMIT,
    FISH_SPEED_SLOW,
    FISH_SPEED_FAST,
    MOVEMENT_SPEED_SICK_MULTIPLIER,
    SHELTER_DISTANCE,
    CAMPFIRE_LIGHT_RADIUS,
    LARGE_CAMPFIRE_LIGHT_RADIUS,
    TORCH_LIGHT_RADIUS,
    TORCH_LIGHT_INTENSITY
} from '../constants';
import { Resource, ItemType, GameState, GamePhase, TreeData, Campfire, PlantedSeed, NPC } from '../types';

// --- Assets & Geometries ---

interface RainProps {
  intensity?: number;
}

const Rain: React.FC<RainProps> = ({ intensity = 0.5 }) => {
    const count = Math.floor(1000 + intensity * 3000); 
    const points = useRef<THREE.Points>(null);
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for(let i=0; i<count; i++) {
            pos[i*3] = (Math.random() - 0.5) * 100;
            pos[i*3+1] = Math.random() * 40;
            pos[i*3+2] = (Math.random() - 0.5) * 100;
        }
        return pos;
    }, [count]);

    useFrame((_, delta) => {
        if (!points.current) return;
        const positions = points.current.geometry.attributes.position.array as Float32Array;
        const speed = 20 + intensity * 20; 
        for(let i=0; i<count; i++) {
            positions[i*3+1] -= speed * delta; 
            if (positions[i*3+1] < 0) {
                positions[i*3+1] = 40;
            }
        }
        points.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute 
                    attach="attributes-position" 
                    count={count} 
                    array={positions} 
                    itemSize={3} 
                />
            </bufferGeometry>
            <pointsMaterial color="#a5f3fc" size={0.1 + intensity * 0.1} transparent opacity={0.4 + intensity * 0.4} />
        </points>
    );
};

interface CampfireModelProps {
    position: [number, number, number];
    isLarge: boolean;
}

const CampfireModel: React.FC<CampfireModelProps> = ({ position, isLarge }) => {
    const light = useRef<THREE.PointLight>(null);
    const scale = isLarge ? 1.5 : 1;
    const radius = isLarge ? LARGE_CAMPFIRE_LIGHT_RADIUS : CAMPFIRE_LIGHT_RADIUS;

    useFrame((state) => {
        if (light.current) {
            light.current.intensity = (isLarge ? 2.5 : 1.5) + Math.sin(state.clock.elapsedTime * 15) * 0.5 + Math.random() * 0.2;
        }
    });

    return (
        <group position={position} scale={scale}>
            {isLarge ? (
                // Tripod Structure
                <group position={[0, 0, 0]}>
                    {/* Leg 1 */}
                    <mesh position={[0, 0.6, 0.35]} rotation={[0.4, 0, 0]}>
                         <cylinderGeometry args={[0.06, 0.06, 1.4]} />
                         <meshStandardMaterial color="#3f2e21" />
                    </mesh>
                    {/* Leg 2 */}
                    <mesh position={[0.3, 0.6, -0.2]} rotation={[0.4, 2.1, 0]}>
                         <cylinderGeometry args={[0.06, 0.06, 1.4]} />
                         <meshStandardMaterial color="#3f2e21" />
                    </mesh>
                    {/* Leg 3 */}
                    <mesh position={[-0.3, 0.6, -0.2]} rotation={[0.4, -2.1, 0]}>
                         <cylinderGeometry args={[0.06, 0.06, 1.4]} />
                         <meshStandardMaterial color="#3f2e21" />
                    </mesh>
                    {/* Fire Base */}
                    <mesh position={[0, 0.1, 0]}>
                        <dodecahedronGeometry args={[0.3]} />
                        <meshBasicMaterial color="#ff4500" transparent opacity={0.8} />
                    </mesh>
                </group>
            ) : (
                // Standard Campfire
                <group>
                    <mesh position={[0, 0.1, 0.2]} rotation={[0.2, 0, 0]}>
                        <cylinderGeometry args={[0.08, 0.08, 0.6]} />
                        <meshStandardMaterial color="#3f2e21" />
                    </mesh>
                    <mesh position={[0.2, 0.1, -0.1]} rotation={[0.2, 2, 0]}>
                        <cylinderGeometry args={[0.08, 0.08, 0.6]} />
                        <meshStandardMaterial color="#3f2e21" />
                    </mesh>
                    <mesh position={[-0.2, 0.1, -0.1]} rotation={[0.2, -2, 0]}>
                        <cylinderGeometry args={[0.08, 0.08, 0.6]} />
                        <meshStandardMaterial color="#3f2e21" />
                    </mesh>
                    <mesh position={[0, 0.3, 0]}>
                        <dodecahedronGeometry args={[0.25]} />
                        <meshBasicMaterial color="#ff4500" transparent opacity={0.8} />
                    </mesh>
                </group>
            )}
            
            <pointLight ref={light} color="#ff6600" distance={radius} decay={2} castShadow />
            <Sparkles count={20 * scale} scale={1 * scale} size={2 * scale} speed={0.4} opacity={0.5} color="#ffaa00" position={[0, 0.5, 0]} />
        </group>
    )
}

interface WorkbenchModelProps {
    position: [number, number, number];
    onClick: () => void;
    playerPos: THREE.Vector3;
}

const WorkbenchModel: React.FC<WorkbenchModelProps> = ({ position, onClick, playerPos }) => {
    const [hovered, setHover] = useState(false);
    
    useEffect(() => {
        if (hovered) document.body.style.cursor = 'pointer';
        else document.body.style.cursor = 'auto';
        return () => { document.body.style.cursor = 'auto'; };
    }, [hovered]);

    const handleClick = (e: any) => {
        e.stopPropagation();
        if (new THREE.Vector3(...position).distanceTo(playerPos) < INTERACTION_DISTANCE * 2) {
            onClick();
        }
    };

    return (
        <group 
            position={position} 
            onClick={handleClick}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
        >
            {/* Shed Posts */}
            <mesh position={[-1.2, 1, 1.2]} castShadow>
                <boxGeometry args={[0.15, 2, 0.15]} />
                <meshStandardMaterial color="#5d4037" />
            </mesh>
            <mesh position={[1.2, 1, 1.2]} castShadow>
                <boxGeometry args={[0.15, 2, 0.15]} />
                <meshStandardMaterial color="#5d4037" />
            </mesh>
            <mesh position={[-1.2, 1, -1.2]} castShadow>
                <boxGeometry args={[0.15, 2, 0.15]} />
                <meshStandardMaterial color="#5d4037" />
            </mesh>
            <mesh position={[1.2, 1, -1.2]} castShadow>
                <boxGeometry args={[0.15, 2, 0.15]} />
                <meshStandardMaterial color="#5d4037" />
            </mesh>

            {/* Roof */}
            <mesh position={[0, 2.2, 0]} castShadow>
                <coneGeometry args={[2.5, 1, 4]} />
                <meshStandardMaterial color="#3f2e21" />
            </mesh>

            {/* Table Inside */}
            <group position={[0, 0, 0]}>
                <mesh position={[0, 0.6, 0]} castShadow>
                    <boxGeometry args={[1.5, 0.1, 0.8]} />
                    <meshStandardMaterial color={hovered ? "#a16207" : "#78350f"} />
                </mesh>
                <mesh position={[0.4, 0.65, 0]} rotation={[0, 0.5, 0]}>
                    <boxGeometry args={[0.1, 0.05, 0.3]} />
                    <meshStandardMaterial color="gray" />
                </mesh>
                <mesh position={[0.4, 0.65, 0.1]} rotation={[0, 0.5, Math.PI/2]}>
                     <cylinderGeometry args={[0.02, 0.02, 0.4]} />
                     <meshStandardMaterial color="#3f2e21" />
                </mesh>
            </group>
        </group>
    );
};

interface HumanoidPlayerProps {
    position: THREE.Vector3;
    isMoving: boolean;
    isSwimming: boolean;
    rotation: number;
    isSick: boolean;
    isHoldingTorch: boolean;
}

const HumanoidPlayer: React.FC<HumanoidPlayerProps> = ({ position, isMoving, isSwimming, rotation, isSick, isHoldingTorch }) => {
  const group = useRef<THREE.Group>(null);
  const innerGroup = useRef<THREE.Group>(null);
  const headGroup = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (group.current) {
      group.current.position.lerp(new THREE.Vector3(position.x, isSwimming ? -0.5 : 0, position.z), 0.2);
      
      const currentRot = group.current.rotation.y;
      const diff = rotation - currentRot;
      const normalizedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
      group.current.rotation.y += normalizedDiff * 0.15;
    }

    if (innerGroup.current) {
        // -Math.PI / 2 is 90 degrees forward.
        // We use slightly less (-1.4) or exactly -1.57 for flat. 
        // User requested prone swimming.
        const targetTilt = isSwimming ? -Math.PI / 2 : 0;
        innerGroup.current.rotation.x = THREE.MathUtils.lerp(innerGroup.current.rotation.x, targetTilt, 0.1);
    }
    
    if (headGroup.current) {
        // If swimming, tilt head back up (opposite to body tilt) so eyes look forward
        const targetHeadTilt = isSwimming ? Math.PI / 2 : 0;
        headGroup.current.rotation.x = THREE.MathUtils.lerp(headGroup.current.rotation.x, targetHeadTilt, 0.1);
    }

    const speedMult = isSick ? 0.5 : 1;
    const t = state.clock.elapsedTime * (isSwimming ? 8 : 12) * speedMult;
    const legAmp = isSwimming ? 0.3 : 0.6;
    const armAmp = isSwimming ? 0.8 : 0.5;
    
    if (isSwimming) {
        // Prone Swimming Animation
        // Arms paddle in a circle-ish motion.
        if (leftArm.current) {
             // Rotate around X for the stroke
             leftArm.current.rotation.x = Math.sin(t) * armAmp - Math.PI; 
             // Slight Z rotation for spread
             leftArm.current.rotation.z = Math.cos(t) * 0.3;
        }
        if (rightArm.current) {
             rightArm.current.rotation.x = Math.cos(t) * armAmp - Math.PI;
             rightArm.current.rotation.z = -Math.cos(t) * 0.3;
        }
        
        // Legs flutter up and down (X axis rotation relative to body)
        if (leftLeg.current) leftLeg.current.rotation.x = Math.cos(t * 2) * 0.3;
        if (rightLeg.current) rightLeg.current.rotation.x = Math.sin(t * 2) * 0.3;
    } else {
        // Walking animation
        const legLRot = isMoving ? Math.sin(t) * legAmp : 0;
        const legRRot = isMoving ? Math.sin(t + Math.PI) * legAmp : 0;
        const armLRot = isMoving ? Math.sin(t + Math.PI) * armAmp : 0;
        const armRRot = isMoving ? Math.sin(t) * armAmp : 0;

        if (leftLeg.current) leftLeg.current.rotation.x = legLRot;
        if (rightLeg.current) rightLeg.current.rotation.x = legRRot;
        if (leftArm.current) leftArm.current.rotation.x = armLRot;
        if (rightArm.current) {
            if (isHoldingTorch) {
                 rightArm.current.rotation.x = -Math.PI / 3 + Math.sin(t * 0.5) * 0.1;
            } else {
                 rightArm.current.rotation.x = armRRot;
            }
        }
    }
  });

  return (
    <group ref={group} dispose={null}>
      <group ref={innerGroup}>
        <group position={[0, 0, 0]}>
            <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.35, 0.5, 0.2]} />
                <meshStandardMaterial color={isSick ? "#86efac" : "#3b82f6"} /> 
            </mesh>
            
            <group position={[0, 1.15, 0]} ref={headGroup}>
                <mesh castShadow>
                    <boxGeometry args={[0.25, 0.25, 0.25]} />
                    <meshStandardMaterial color={isSick ? "#dcfce7" : "#ffdecb"} />
                </mesh>
                <group position={[0, 0, 0.13]}>
                    <mesh position={[0.06, 0.02, 0]}>
                        <planeGeometry args={[0.04, 0.04]} />
                        <meshBasicMaterial color="black" />
                    </mesh>
                    <mesh position={[-0.06, 0.02, 0]}>
                        <planeGeometry args={[0.04, 0.04]} />
                        <meshBasicMaterial color="black" />
                    </mesh>
                </group>
            </group>

            <group position={[-0.23, 0.95, 0]} ref={leftArm}>
                <mesh position={[0, -0.2, 0]} castShadow>
                    <boxGeometry args={[0.1, 0.45, 0.1]} />
                    <meshStandardMaterial color={isSick ? "#dcfce7" : "#ffdecb"} />
                </mesh>
            </group>
            <group position={[0.23, 0.95, 0]} ref={rightArm}>
                <mesh position={[0, -0.2, 0]} castShadow>
                    <boxGeometry args={[0.1, 0.45, 0.1]} />
                    <meshStandardMaterial color={isSick ? "#dcfce7" : "#ffdecb"} />
                </mesh>
                {isHoldingTorch && (
                    <group position={[0, -0.4, 0.1]} rotation={[Math.PI/4, 0, 0]}>
                         <mesh position={[0, 0.15, 0]}>
                             <cylinderGeometry args={[0.02, 0.02, 0.3]} />
                             <meshStandardMaterial color="#4a3728" />
                         </mesh>
                         <mesh position={[0, 0.3, 0]}>
                             <dodecahedronGeometry args={[0.06]} />
                             <meshBasicMaterial color="#ff3300" />
                         </mesh>
                         <pointLight color="#ff7700" distance={TORCH_LIGHT_RADIUS} decay={2} intensity={TORCH_LIGHT_INTENSITY} />
                    </group>
                )}
            </group>
            <group position={[-0.1, 0.5, 0]} ref={leftLeg}>
                <mesh position={[0, -0.25, 0]} castShadow>
                    <boxGeometry args={[0.14, 0.5, 0.14]} />
                    <meshStandardMaterial color="#1e293b" />
                </mesh>
            </group>
            <group position={[0.1, 0.5, 0]} ref={rightLeg}>
                <mesh position={[0, -0.25, 0]} castShadow>
                    <boxGeometry args={[0.14, 0.5, 0.14]} />
                    <meshStandardMaterial color="#1e293b" />
                </mesh>
            </group>
        </group>
      </group>
    </group>
  );
};

interface NPCModelProps {
    npc: NPC;
    onClick: (npc: NPC) => void;
    playerPos: THREE.Vector3;
}

const NPCModel: React.FC<NPCModelProps> = ({ npc, onClick, playerPos }) => {
    const group = useRef<THREE.Group>(null);
    const [hovered, setHover] = useState(false);
    const isUnconscious = npc.state === 'UNCONSCIOUS';
    const isMoving = npc.state === 'MOVING';

    useEffect(() => {
        if (hovered) document.body.style.cursor = 'pointer';
        else document.body.style.cursor = 'auto';
        return () => { document.body.style.cursor = 'auto'; };
    }, [hovered]);

    useFrame((state, delta) => {
        if (!group.current) return;
        
        // Position interpolation
        group.current.position.lerp(new THREE.Vector3(...npc.position), 0.2);

        // Rotation towards target if moving
        if (npc.targetPos && isMoving) {
            const direction = new THREE.Vector3(npc.targetPos[0], 0, npc.targetPos[2]).sub(group.current.position);
            const angle = Math.atan2(direction.x, direction.z);
            group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, angle, 0.1);
        }

        // Animation logic similar to HumanoidPlayer but simplified or reused
        // Unconscious = lying down
        if (isUnconscious) {
            group.current.rotation.x = -Math.PI / 2;
            group.current.position.y = 0.2;
        } else {
             group.current.rotation.x = 0;
             // Bobbing if working
             if (npc.state === 'WORKING') {
                 group.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.1;
             }
        }
    });

    const handleClick = (e: any) => {
        e.stopPropagation();
        if (new THREE.Vector3(...npc.position).distanceTo(playerPos) < INTERACTION_DISTANCE * 2) {
            onClick(npc);
        }
    };

    return (
        <group 
            ref={group} 
            onClick={handleClick}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
        >
             {/* Visuals: Different shirt color to distinguish */}
             <group>
                <mesh position={[0, 0.75, 0]} castShadow>
                    <boxGeometry args={[0.35, 0.5, 0.2]} />
                    <meshStandardMaterial color={isUnconscious ? "#94a3b8" : "#ef4444"} /> 
                </mesh>
                <mesh position={[0, 1.15, 0]} castShadow>
                    <boxGeometry args={[0.25, 0.25, 0.25]} />
                    <meshStandardMaterial color="#ffdecb" />
                </mesh>
                {/* Limbs simplified for NPC */}
                <mesh position={[-0.23, 0.95, 0]} castShadow>
                    <boxGeometry args={[0.1, 0.45, 0.1]} />
                    <meshStandardMaterial color="#ffdecb" />
                </mesh>
                <mesh position={[0.23, 0.95, 0]} castShadow>
                    <boxGeometry args={[0.1, 0.45, 0.1]} />
                    <meshStandardMaterial color="#ffdecb" />
                </mesh>
                <mesh position={[-0.1, 0.5, 0]} castShadow>
                    <boxGeometry args={[0.14, 0.5, 0.14]} />
                    <meshStandardMaterial color="#1e293b" />
                </mesh>
                <mesh position={[0.1, 0.5, 0]} castShadow>
                    <boxGeometry args={[0.14, 0.5, 0.14]} />
                    <meshStandardMaterial color="#1e293b" />
                </mesh>
             </group>
             {isUnconscious && (
                 <Text position={[0, 1.5, 0]} fontSize={0.3} color="white">SOS</Text>
             )}
        </group>
    );
}

interface TreeProps {
    position: [number, number, number];
    scale?: number;
    onShake: () => void;
    playerPos: THREE.Vector3;
}

const Tree: React.FC<TreeProps> = ({ position, scale = 1, onShake, playerPos }) => {
  const group = useRef<THREE.Group>(null);
  const [shaking, setShaking] = useState(false);
  const [hovered, setHover] = useState(false);

  useEffect(() => {
    if (hovered) document.body.style.cursor = 'pointer';
    else document.body.style.cursor = 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hovered]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    const treePos = new THREE.Vector3(...position);
    if (treePos.distanceTo(playerPos) > INTERACTION_DISTANCE * 1.5) return;

    if (!shaking) {
        setShaking(true);
        onShake();
        setTimeout(() => setShaking(false), 500);
    }
  };

  useFrame((state) => {
    if (!group.current) return;
    if (shaking) {
        group.current.rotation.z = Math.sin(state.clock.elapsedTime * 20) * 0.05;
        group.current.rotation.x = Math.cos(state.clock.elapsedTime * 15) * 0.05;
    } else {
        group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, 0, 0.1);
        group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0, 0.1);
    }
  });

  return (
    <group 
        ref={group} 
        position={position} 
        scale={scale} 
        onClick={handleClick}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
    >
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.3, 2, 6]} />
        <meshStandardMaterial color="#5d4037" />
      </mesh>
      <mesh position={[0, 2.5, 0]} castShadow>
        <dodecahedronGeometry args={[1.2]} />
        <meshStandardMaterial color={hovered ? "#4ade80" : "#2d6a4f"} />
      </mesh>
      <mesh position={[0, 3.2, 0]} castShadow>
        <dodecahedronGeometry args={[0.9]} />
        <meshStandardMaterial color={hovered ? "#86efac" : "#40916c"} />
      </mesh>
    </group>
  );
};

interface PlantedSaplingProps {
    position: [number, number, number];
}

const PlantedSapling: React.FC<PlantedSaplingProps> = ({ position }) => {
    return (
        <group position={position}>
            <mesh position={[0, 0.2, 0]} castShadow>
                <coneGeometry args={[0.1, 0.4, 8]} />
                <meshStandardMaterial color="#86efac" />
            </mesh>
            <mesh position={[0, 0.02, 0]}>
                <circleGeometry args={[0.3, 8]} />
                <meshStandardMaterial color="#5d4037" />
            </mesh>
        </group>
    );
};

interface CollectibleItemProps {
    position: [number, number, number];
    active: boolean;
    type: ItemType;
    onClick: () => void;
}

const CollectibleItem: React.FC<CollectibleItemProps> = ({ position, active, type, onClick }) => {
  const [hovered, setHover] = useState(false);
  
  useEffect(() => {
    if (hovered && active) document.body.style.cursor = 'pointer';
    else document.body.style.cursor = 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hovered, active]);

  if (!active) return null;

  return (
    <group 
        position={position} 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
    >
        {type === ItemType.APPLE && (
             <group position={[0, 0.2, 0]}>
                <mesh castShadow>
                    <sphereGeometry args={[0.25, 12, 12]} />
                    <meshStandardMaterial color={hovered ? "#f87171" : "#dc2626"} />
                </mesh>
                <mesh position={[0, 0.25, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.1]} />
                    <meshStandardMaterial color="#3f2e21" />
                </mesh>
            </group>
        )}

        {type === ItemType.SEED && (
            <mesh position={[0, 0.05, 0]} castShadow>
                <dodecahedronGeometry args={[0.08]} />
                <meshStandardMaterial color={hovered ? "#a16207" : "#451a03"} />
            </mesh>
        )}
        
        {type === ItemType.WOOD && (
            <mesh position={[0, 0.15, 0]} rotation={[0, Math.random(), Math.PI/2]} castShadow>
                <cylinderGeometry args={[0.08, 0.08, 0.8]} />
                <meshStandardMaterial color={hovered ? "#a16207" : "#78350f"} />
            </mesh>
        )}
    </group>
  );
};

interface FishSpotProps {
    position: [number, number, number];
    active: boolean;
    onClick: () => void;
    playerPos: THREE.Vector3;
}

const FishSpot: React.FC<FishSpotProps> = ({ position, active, onClick, playerPos }) => {
    const ref = useRef<THREE.Group>(null);
    const [hovered, setHover] = useState(false);
    const velocity = useRef(new THREE.Vector3(1, 0, 0));
    const speed = useRef(FISH_SPEED_SLOW);

    useEffect(() => {
        if (hovered && active) document.body.style.cursor = 'pointer';
        else document.body.style.cursor = 'auto';
        return () => { document.body.style.cursor = 'auto'; };
    }, [hovered, active]);

    useEffect(() => {
        if (ref.current) {
            ref.current.position.set(...position);
            const angle = Math.random() * Math.PI * 2;
            velocity.current.set(Math.cos(angle), 0, Math.sin(angle));
        }
    }, [position, active]);

    useFrame((state, delta) => {
        if (!ref.current || !active) return;
        const clock = state.clock;

        const pos = ref.current.position;
        const distFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

        const targetSpeed = distFromCenter < 60 ? FISH_SPEED_SLOW : FISH_SPEED_FAST;
        speed.current = THREE.MathUtils.lerp(speed.current, targetSpeed, delta * 2);

        if (distFromCenter < ISLAND_RADIUS) {
            const away = new THREE.Vector3(pos.x, 0, pos.z).normalize();
            velocity.current.lerp(away, delta * 2);
        } else if (distFromCenter > WATER_MOVEMENT_LIMIT - 5) {
            const back = new THREE.Vector3(-pos.x, 0, -pos.z).normalize();
            velocity.current.lerp(back, delta * 1);
        }

        velocity.current.normalize().multiplyScalar(speed.current * delta);
        ref.current.position.add(velocity.current);

        ref.current.position.y = -0.5 + Math.sin(clock.elapsedTime * 3) * 0.1;
        const angle = Math.atan2(velocity.current.x, velocity.current.z);
        ref.current.rotation.y = angle;
    });

    const handleClick = (e: any) => {
        e.stopPropagation();
        if (!active || !ref.current) return;
        // Use FISH_INTERACTION_DISTANCE for easier catching
        if (ref.current.position.distanceTo(playerPos) < FISH_INTERACTION_DISTANCE) {
            onClick();
        }
    };

    if (!active) return null;

    return (
        <group 
            ref={ref} 
            onClick={handleClick}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
        >
            <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.2, 0.6, 8]} />
                <meshStandardMaterial 
                    color="#3b82f6" 
                    emissive={hovered ? "#60a5fa" : "#1d4ed8"} 
                    emissiveIntensity={hovered ? 1 : 0.5} 
                />
            </mesh>
            <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.3, 0.35, 16]} />
                <meshBasicMaterial color="white" opacity={0.5} transparent />
            </mesh>
        </group>
    );
};

interface GameSceneProps {
    gameState: GameState;
    phase: GamePhase;
    setMoving: (moving: boolean) => void;
    setSwimming: (swimming: boolean) => void;
    setSheltered: (sheltered: boolean) => void;
    handleCollect: (resource: Resource) => void;
    handleTreeShake: (pos: [number, number, number]) => void;
    handleInteractWorkbench: () => void;
    handleInteractNPC: (npc: NPC) => void;
    resources: Resource[];
    trees: TreeData[];
    plantedSeeds: PlantedSeed[];
    campfires: Campfire[];
    npcs: NPC[];
    playerPosRef: React.MutableRefObject<THREE.Vector3>;
}

const GameScene: React.FC<GameSceneProps> = ({ 
    gameState, phase, setMoving, setSwimming, setSheltered, handleCollect, handleTreeShake, handleInteractWorkbench, handleInteractNPC, resources, trees, plantedSeeds, campfires, npcs, playerPosRef 
}) => {
  const { camera } = useThree();
  const playerPos = useRef(new THREE.Vector3(0, 0, 0));
  const targetPos = useRef(new THREE.Vector3(0, 0, 0));
  const [rotation, setRotation] = useState(0);
  const [isMoving, setIsMovingLocal] = useState(false);
  const [isSwimmingLocal, setIsSwimmingLocal] = useState(false);
  
  useFrame(() => {
    playerPosRef.current.copy(playerPos.current);
  });
  
  const sunPosition = useMemo(() => {
    const angle = ((gameState.timeOfDay - 6) / 24) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * 100, Math.sin(angle) * 100, 0);
  }, [gameState.timeOfDay]);

  const lightIntensity = useMemo(() => {
      const angle = (gameState.timeOfDay / 24) * Math.PI * 2 - (Math.PI / 2);
      const sineVal = Math.sin(angle);
      return 0.1 + ((sineVal + 1) / 2) * 0.9;
  }, [gameState.timeOfDay]);

  const handleGroundRightClick = (e: any) => {
    if (phase !== 'PLAYING') return;
    const dist = new THREE.Vector3(e.point.x, 0, e.point.z).length();
    if (dist > WATER_MOVEMENT_LIMIT) return;
    targetPos.current.copy(e.point).setY(0);
    setIsMovingLocal(true);
    setMoving(true);
  };

  const handleResourceClick = (res: Resource) => {
    if (phase !== 'PLAYING') return;
    const resPos = new THREE.Vector3(...res.position);
    if ((res.type === ItemType.APPLE || res.type === ItemType.WOOD || res.type === ItemType.SEED) && playerPos.current.distanceTo(resPos) < INTERACTION_DISTANCE) {
        handleCollect(res);
    } else if (res.type === ItemType.FISH) {
        handleCollect(res);
    }
  };

  useFrame((state, delta) => {
    if (phase !== 'PLAYING' && phase !== 'NPC_MENU') {
        setIsMovingLocal(false);
        setMoving(false);
        return;
    }

    const distFromCenter = new THREE.Vector3(playerPos.current.x, 0, playerPos.current.z).length();
    const swimming = distFromCenter > SWIM_THRESHOLD;
    if (swimming !== isSwimmingLocal) {
        setIsSwimmingLocal(swimming);
        setSwimming(swimming);
    }

    let sheltered = false;
    // Check trees
    for(const t of trees) {
        const tPos = new THREE.Vector3(t.position[0], 0, t.position[2]);
        if (playerPos.current.distanceTo(tPos) < SHELTER_DISTANCE) {
            sheltered = true;
            break;
        }
    }
    setSheltered(sheltered);

    if (isMoving && phase === 'PLAYING') {
        const direction = new THREE.Vector3().subVectors(targetPos.current, playerPos.current);
        direction.y = 0;
        const dist = direction.length();

        if (dist < 0.1) {
            setIsMovingLocal(false);
            setMoving(false);
        } else {
            direction.normalize();
            const targetRotation = Math.atan2(direction.x, direction.z);
            setRotation(targetRotation);
            
            const speed = MOVEMENT_SPEED * (gameState.sickness ? MOVEMENT_SPEED_SICK_MULTIPLIER : 1);
            
            const moveStep = direction.multiplyScalar(speed * delta);
            playerPos.current.add(moveStep);
        }
    }

    const camOffset = new THREE.Vector3(0, 25, 30);
    const smoothPos = new THREE.Vector3().copy(playerPos.current).add(camOffset);
    camera.position.lerp(smoothPos, 0.1);
    camera.lookAt(playerPos.current);
  });

  return (
    <>
      <ambientLight intensity={lightIntensity * 0.4} />
      <directionalLight 
        position={[sunPosition.x, sunPosition.y, 20]} 
        intensity={lightIntensity} 
        castShadow 
        color={lightIntensity < 0.3 ? "#818cf8" : "#fff7ed"}
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <Sky sunPosition={sunPosition} turbidity={0.5} rayleigh={0.5} mieCoefficient={0.005} mieDirectionalG={0.8} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {gameState.isRaining && <Rain intensity={gameState.rainIntensity} />}

      <WorkbenchModel position={[0, 0, 0]} onClick={handleInteractWorkbench} playerPos={playerPos.current} />

      {(phase === 'PLAYING' || phase === 'PAUSED' || phase === 'WORKBENCH' || phase === 'NPC_MENU') && (
        <HumanoidPlayer 
            position={playerPos.current} 
            isMoving={isMoving} 
            isSwimming={isSwimmingLocal}
            isSick={gameState.sickness}
            rotation={rotation} 
            isHoldingTorch={gameState.isHoldingTorch}
        />
      )}

      {npcs.map(npc => (
          <NPCModel key={npc.id} npc={npc} onClick={handleInteractNPC} playerPos={playerPos.current} />
      ))}

      {campfires.map(c => (
          <CampfireModel key={c.id} position={c.position} isLarge={c.isLarge} />
      ))}

      {plantedSeeds.map(s => (
          <PlantedSapling key={s.id} position={s.position} />
      ))}

      {resources.map((res) => (
         res.type === ItemType.FISH ? 
             <FishSpot 
                key={res.id} 
                position={res.position} 
                active={!res.eaten} 
                onClick={() => handleResourceClick(res)}
                playerPos={playerPos.current}
            />
            :
            <CollectibleItem 
                key={res.id} 
                position={res.position} 
                active={!res.eaten} 
                type={res.type} 
                onClick={() => handleResourceClick(res)} 
            />
      ))}

      {trees.map((tree) => (
        <Tree 
            key={tree.id} 
            position={tree.position} 
            scale={tree.scale} 
            onShake={() => handleTreeShake(tree.position)}
            playerPos={playerPos.current}
        />
      ))}

      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.05, 0]} 
        receiveShadow 
        onContextMenu={handleGroundRightClick}
      >
        <circleGeometry args={[ISLAND_RADIUS, 64]} />
        <meshStandardMaterial color="#84cc16" roughness={0.8} />
      </mesh>

      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.06, 0]} 
        receiveShadow
        onContextMenu={handleGroundRightClick}
      >
        <circleGeometry args={[SAND_RADIUS, 64]} />
        <meshStandardMaterial color="#fde047" roughness={1} />
      </mesh>

      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.5, 0]}
        onContextMenu={handleGroundRightClick}
      >
        <planeGeometry args={[SEA_SIZE, SEA_SIZE]} />
        <meshStandardMaterial color="#3b82f6" roughness={0} metalness={0.1} opacity={0.8} transparent />
      </mesh>
    </>
  );
};

export const GameCanvas = (props: GameSceneProps) => {
    return (
        <Canvas shadows camera={{ position: [0, 25, 30], fov: 45 }}>
            <GameScene {...props} />
        </Canvas>
    );
};
