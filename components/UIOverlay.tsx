
import React from 'react';
import { GameState, LogMessage, GamePhase, ItemType, NPC, NPCTask } from '../types';
import { MAX_ENERGY, HEAVY_RAIN_THRESHOLD, NPC_MAX_ENERGY } from '../constants';
import { Heart, Fish, AlertTriangle, RefreshCw, Play, Pause, LogOut, Home, CloudRain, Sun, Moon, Skull, Thermometer, Briefcase, Flame, Hammer, Archive, X, User, Activity, Utensils } from 'lucide-react';

interface UIOverlayProps {
  gameState: GameState;
  phase: GamePhase;
  logs: LogMessage[];
  selectedNPC?: NPC | null;
  onStart: () => void;
  onResume: () => void;
  onPause: () => void;
  onQuit: () => void;
  onEat: (index: number) => void;
  onWorkbenchAction: (action: 'CRAFT' | 'DEPOSIT' | 'WITHDRAW', itemType?: ItemType, slotIndex?: number) => void;
  onCloseWorkbench: () => void;
  onNPCCommand: (task: NPCTask) => void;
  onNPCCollect: () => void;
  onNPCFeed: () => void;
  onCloseNPCMenu: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ 
    gameState, phase, logs, selectedNPC, onStart, onResume, onPause, onQuit, onEat, onWorkbenchAction, onCloseWorkbench,
    onNPCCommand, onNPCCollect, onNPCFeed, onCloseNPCMenu
}) => {
  const energyPercentage = Math.max(0, (gameState.energy / MAX_ENERGY) * 100);
  
  let energyColor = 'bg-green-500';
  if (energyPercentage < 50) energyColor = 'bg-yellow-500';
  if (energyPercentage < 20) energyColor = 'bg-red-600';

  const renderItemIcon = (item: ItemType | null) => {
      if (!item) return null;
      
      switch(item) {
          case ItemType.APPLE:
            return (
                <div className="w-7 h-7 relative bg-red-600 rounded-full shadow-inner flex items-center justify-center">
                    <div className="absolute w-2 h-2 bg-red-400 rounded-full top-1 left-1 opacity-50"></div>
                    <div className="absolute -top-1 w-0.5 h-2 bg-amber-900"></div>
                </div>
            );
          case ItemType.SEED:
            return <div className="w-4 h-4 bg-amber-950 rounded-full transform rotate-45 border border-amber-800"></div>;
          case ItemType.FISH:
            return <Fish className="w-8 h-8 text-blue-400" />;
          case ItemType.WOOD:
            return <div className="w-2 h-8 bg-amber-800 rounded-sm transform rotate-45 border-l border-amber-900"></div>;
          case ItemType.TORCH:
            return <Flame className="w-6 h-6 text-orange-500" />;
          case ItemType.APPLE_JUICE:
            return (
                <div className="w-6 h-8 bg-yellow-400/80 rounded-sm border-2 border-white relative overflow-hidden flex items-end justify-center">
                    <div className="w-full h-3/4 bg-amber-500/50"></div>
                    <div className="absolute -top-2 w-1 h-4 bg-white/50 transform rotate-12"></div>
                </div>
            );
          case ItemType.BIG_FISH:
            return <Fish className="w-10 h-10 text-indigo-400" strokeWidth={2.5} />;
          case ItemType.WOOD_STAND:
            return (
                <div className="w-8 h-8 relative flex items-center justify-center">
                    <div className="w-1 h-8 bg-amber-900 absolute"></div>
                    <div className="w-8 h-1 bg-amber-900 absolute top-2"></div>
                    <div className="w-6 h-1 bg-amber-900 absolute bottom-2"></div>
                </div>
            );
          default:
            return null;
      }
  };

  // --- Main Menu Screen ---
  if (phase === 'MENU') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-50">
        <div className="text-center p-8 max-w-lg">
           <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-blue-600 mb-6 drop-shadow-lg">
             Island Survivor
           </h1>
           <p className="text-slate-400 mb-8 text-lg">
             Explore. Eat. Survive. <br/>
             <span className="text-sm opacity-70">Left click to move. Click objects to gather.</span>
           </p>
           <button 
             onClick={onStart}
             className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-12 rounded-full text-xl transition-all hover:scale-105 shadow-xl hover:shadow-green-500/30 flex items-center gap-3 mx-auto"
           >
             <Play className="w-6 h-6 fill-current" />
             Start Game
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 z-10">
      
      {/* Top Bar: Stats & Pause */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="flex flex-col gap-4">
            {/* Energy */}
            <div className="bg-slate-900/80 backdrop-blur-sm p-4 rounded-xl border border-slate-700 text-white w-64 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Heart className={`w-5 h-5 ${energyPercentage < 20 ? 'text-red-500 animate-pulse' : 'text-red-400'}`} fill="currentColor" />
                        <span className="font-bold text-lg">Energy</span>
                    </div>
                    {gameState.sickness && (
                        <div className="flex items-center gap-1 text-green-400 animate-pulse">
                            <Skull className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">Sick</span>
                        </div>
                    )}
                </div>
                <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-600">
                    <div 
                    className={`h-full transition-all duration-300 ${energyColor}`} 
                    style={{ width: `${energyPercentage}%` }}
                    />
                </div>
                <p className="text-right text-xs text-slate-400 mt-1">{Math.ceil(gameState.energy)} / {MAX_ENERGY}</p>
            </div>
            
            {/* Environment Status */}
            <div className="bg-slate-900/80 backdrop-blur-sm p-3 rounded-xl border border-slate-700 text-white w-64 shadow-xl flex items-center justify-around">
                <div className="flex flex-col items-center gap-1" title="Time of Day">
                     {gameState.timeOfDay > 6 && gameState.timeOfDay < 18 ? 
                        <Sun className="w-6 h-6 text-yellow-400" /> : 
                        <Moon className="w-6 h-6 text-blue-300" />
                     }
                     <span className="text-xs font-mono">{Math.floor(gameState.timeOfDay)}:00</span>
                </div>
                <div className={`flex flex-col items-center gap-1 ${gameState.isRaining ? 'text-blue-400' : 'text-slate-600'}`} title="Weather">
                    <CloudRain className="w-6 h-6" />
                    <span className="text-xs">
                        {gameState.isRaining ? (gameState.rainIntensity > HEAVY_RAIN_THRESHOLD ? 'Heavy' : 'Light') : 'Dry'}
                    </span>
                </div>
                <div className="flex flex-col items-center gap-1" title="Wetness">
                    <div className="relative">
                        <Thermometer className={`w-6 h-6 ${gameState.wetness > 80 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
                        <div className="absolute bottom-0 left-0 right-0 h-full bg-blue-500/20 rounded-full overflow-hidden" style={{ clipPath: `inset(${100 - gameState.wetness}% 0 0 0)`}} />
                    </div>
                    <span className="text-xs">{Math.floor(gameState.wetness)}% Wet</span>
                </div>
            </div>
        </div>

        {/* Pause Button */}
        <button 
            onClick={onPause}
            className="bg-slate-900/80 hover:bg-slate-800 backdrop-blur-sm p-3 rounded-full border border-slate-700 text-white shadow-xl transition-all"
        >
            {phase === 'PAUSED' ? <Play className="w-6 h-6" fill="currentColor"/> : <Pause className="w-6 h-6" fill="currentColor"/>}
        </button>
      </div>

      {/* NPC Menu Overlay */}
      {phase === 'NPC_MENU' && selectedNPC && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-auto backdrop-blur-sm z-50">
               <div className="bg-slate-800 rounded-xl border-2 border-slate-600 shadow-2xl flex flex-col w-[500px] max-w-full">
                   <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 rounded-t-xl">
                       <div className="flex items-center gap-3">
                           <User className="w-6 h-6 text-blue-400" />
                           <h2 className="text-2xl font-bold text-white">{selectedNPC.name}</h2>
                       </div>
                       <button onClick={onCloseNPCMenu} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white">
                           <X className="w-6 h-6" />
                       </button>
                   </div>
                   
                   <div className="p-6 flex flex-col gap-6">
                       {/* Stats */}
                       <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>Energy</span>
                                    <span>{Math.floor(selectedNPC.energy)}/{NPC_MAX_ENERGY}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${(selectedNPC.energy / NPC_MAX_ENERGY) * 100}%` }}></div>
                                </div>
                            </div>
                            <button onClick={onNPCFeed} className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded text-sm flex items-center gap-2">
                                <Utensils className="w-4 h-4" /> Feed
                            </button>
                       </div>

                       {/* Inventory */}
                       <div className="bg-slate-900/50 p-4 rounded-lg">
                           <div className="flex justify-between items-center mb-2">
                               <span className="text-sm font-bold text-slate-300">Collected Items</span>
                               <button onClick={onNPCCollect} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded">Collect All</button>
                           </div>
                           <div className="flex gap-2 flex-wrap h-16 overflow-y-auto">
                                {selectedNPC.inventory.length === 0 && <span className="text-xs text-slate-500 italic">Empty...</span>}
                                {selectedNPC.inventory.map((item, i) => (
                                    <div key={i} className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center border border-slate-600">
                                        {renderItemIcon(item)}
                                    </div>
                                ))}
                           </div>
                       </div>

                       {/* Commands */}
                       <div>
                           <h3 className="text-sm font-bold text-slate-300 mb-2">Commands</h3>
                           <div className="grid grid-cols-2 gap-3">
                               <button 
                                   onClick={() => onNPCCommand('GATHER_APPLE')} 
                                   className={`p-3 rounded border flex items-center gap-2 justify-center transition-all ${selectedNPC.currentTask === 'GATHER_APPLE' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'}`}
                               >
                                   <div className="w-4 h-4 bg-red-500 rounded-full"></div> Gather Apples
                               </button>
                               <button 
                                   onClick={() => onNPCCommand('GATHER_WOOD')} 
                                   className={`p-3 rounded border flex items-center gap-2 justify-center transition-all ${selectedNPC.currentTask === 'GATHER_WOOD' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'}`}
                               >
                                   <div className="w-2 h-4 bg-amber-700 rotate-12"></div> Gather Wood
                               </button>
                               <button 
                                   onClick={() => onNPCCommand('FISH')} 
                                   className={`p-3 rounded border flex items-center gap-2 justify-center transition-all ${selectedNPC.currentTask === 'FISH' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'}`}
                               >
                                   <Fish className="w-4 h-4" /> Fish
                               </button>
                               <button 
                                   onClick={() => onNPCCommand(null)} 
                                   className={`p-3 rounded border flex items-center gap-2 justify-center transition-all ${selectedNPC.currentTask === null ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'}`}
                               >
                                   <Activity className="w-4 h-4" /> Stay Idle
                               </button>
                           </div>
                           <div className="mt-2 text-xs text-slate-500 text-center">
                               Current Skill Levels: Apple {(selectedNPC.skills.apple * 100).toFixed(0)}% | Wood {(selectedNPC.skills.wood * 100).toFixed(0)}% | Fish {(selectedNPC.skills.fish * 100).toFixed(0)}%
                           </div>
                       </div>
                   </div>
               </div>
           </div>
      )}

      {/* Workbench Overlay */}
      {phase === 'WORKBENCH' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-auto backdrop-blur-sm z-50">
              <div className="bg-slate-800 rounded-xl border-2 border-slate-600 shadow-2xl flex flex-col w-[800px] h-[500px] max-w-full max-h-full">
                  {/* Header */}
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 rounded-t-xl">
                      <div className="flex items-center gap-3">
                          <Hammer className="w-6 h-6 text-amber-500" />
                          <h2 className="text-2xl font-bold text-white">Workbench</h2>
                      </div>
                      <button onClick={onCloseWorkbench} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  
                  {/* Content */}
                  <div className="flex flex-1 overflow-hidden">
                      {/* Left: Crafting */}
                      <div className="w-1/3 p-4 border-r border-slate-700 bg-slate-800/50 flex flex-col gap-4">
                          <h3 className="text-slate-400 uppercase text-xs font-bold tracking-wider">Crafting Recipes</h3>
                          
                          {/* Recipe: Apple Juice */}
                          <button onClick={() => onWorkbenchAction('CRAFT', ItemType.APPLE_JUICE)} className="bg-slate-700 p-3 rounded-lg hover:bg-slate-600 border border-slate-600 flex items-center gap-3 group">
                              <div className="bg-slate-900 p-2 rounded border border-slate-500">
                                  {renderItemIcon(ItemType.APPLE_JUICE)}
                              </div>
                              <div className="text-left">
                                  <div className="font-bold text-white text-sm">Apple Juice</div>
                                  <div className="text-xs text-slate-400 flex items-center gap-1">
                                      3x {renderItemIcon(ItemType.APPLE)}
                                  </div>
                              </div>
                          </button>

                           {/* Recipe: Big Fish */}
                           <button onClick={() => onWorkbenchAction('CRAFT', ItemType.BIG_FISH)} className="bg-slate-700 p-3 rounded-lg hover:bg-slate-600 border border-slate-600 flex items-center gap-3 group">
                              <div className="bg-slate-900 p-2 rounded border border-slate-500">
                                  {renderItemIcon(ItemType.BIG_FISH)}
                              </div>
                              <div className="text-left">
                                  <div className="font-bold text-white text-sm">Big Fish</div>
                                  <div className="text-xs text-slate-400 flex items-center gap-1">
                                      3x {renderItemIcon(ItemType.FISH)}
                                  </div>
                              </div>
                          </button>

                          {/* Recipe: Wooden Stand */}
                          <button onClick={() => onWorkbenchAction('CRAFT', ItemType.WOOD_STAND)} className="bg-slate-700 p-3 rounded-lg hover:bg-slate-600 border border-slate-600 flex items-center gap-3 group">
                              <div className="bg-slate-900 p-2 rounded border border-slate-500">
                                  {renderItemIcon(ItemType.WOOD_STAND)}
                              </div>
                              <div className="text-left">
                                  <div className="font-bold text-white text-sm">Wooden Stand</div>
                                  <div className="text-xs text-slate-400 flex items-center gap-1">
                                      3x {renderItemIcon(ItemType.WOOD)}
                                  </div>
                              </div>
                          </button>
                      </div>

                      {/* Right: Storage */}
                      <div className="w-2/3 p-4 flex flex-col gap-6">
                          
                          {/* Warehouse Grid */}
                          <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs uppercase font-bold tracking-wider">
                                  <Archive className="w-4 h-4" /> Warehouse Storage
                              </div>
                              <div className="grid grid-cols-5 gap-2">
                                  {gameState.workbenchStorage.map((item, idx) => (
                                      <button 
                                          key={`wb-${idx}`}
                                          onClick={() => onWorkbenchAction('WITHDRAW', undefined, idx)}
                                          className={`
                                              w-14 h-14 rounded-lg border-2 flex items-center justify-center transition-all relative
                                              ${item ? 'bg-slate-700 border-slate-500 hover:bg-slate-600 hover:border-amber-400' : 'bg-slate-900/50 border-slate-700 border-dashed'}
                                          `}
                                      >
                                          {renderItemIcon(item)}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          {/* Player Inventory Grid */}
                          <div>
                              <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs uppercase font-bold tracking-wider">
                                  <Briefcase className="w-4 h-4" /> Backpack (Click to Deposit)
                              </div>
                              <div className="grid grid-cols-5 gap-2">
                                  {gameState.inventory.map((item, idx) => (
                                      <button 
                                          key={`inv-${idx}`}
                                          onClick={() => onWorkbenchAction('DEPOSIT', undefined, idx)}
                                          disabled={!item}
                                          className={`
                                              w-14 h-14 rounded-lg border-2 flex items-center justify-center transition-all relative
                                              ${item ? 'bg-slate-700 border-slate-500 hover:bg-slate-600 hover:border-green-400 cursor-pointer' : 'bg-slate-900/50 border-slate-700 border-dashed'}
                                          `}
                                      >
                                          {renderItemIcon(item)}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Pause Menu Overlay */}
      {phase === 'PAUSED' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-auto backdrop-blur-sm z-50">
           <div className="bg-slate-800 p-8 rounded-2xl border-2 border-slate-600 text-center shadow-2xl max-w-sm w-full">
              <h2 className="text-3xl font-bold text-white mb-6">Paused</h2>
              <div className="flex flex-col gap-3">
                <button onClick={onResume} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
                    <Play className="w-5 h-5" /> Resume
                </button>
                <button onClick={onStart} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5" /> Restart
                </button>
                <button onClick={onQuit} className="bg-red-900/50 hover:bg-red-900 text-red-200 font-bold py-3 rounded-lg flex items-center justify-center gap-2 border border-red-800">
                    <LogOut className="w-5 h-5" /> Main Menu
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Game Over Screen */}
      {phase === 'GAMEOVER' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-auto backdrop-blur-sm z-50">
          <div className="bg-slate-800 p-8 rounded-2xl border-2 border-slate-600 text-center shadow-2xl max-w-md w-full mx-4">
            <div className="mb-4 flex justify-center">
              <div className="bg-red-500/20 p-4 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Game Over</h2>
            <p className="text-slate-300 mb-6">You survived for {gameState.score} points.</p>
            
            <div className="flex gap-3">
                <button 
                onClick={onStart}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                <RefreshCw className="w-5 h-5" />
                Try Again
                </button>
                <button 
                onClick={onQuit}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                <Home className="w-5 h-5" />
                Menu
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Area: Inventory & Logs */}
      {phase !== 'WORKBENCH' && phase !== 'NPC_MENU' && (
        <div className="flex flex-col sm:flex-row items-end justify-between w-full pointer-events-auto gap-4">
            
            {/* Logs */}
            {phase === 'PLAYING' && (
                <div className="w-full max-w-md pointer-events-none mb-20 sm:mb-0">
                    <div className="flex flex-col-reverse gap-2 h-48 overflow-hidden mask-gradient-to-t">
                    {logs.map((log) => (
                        <div 
                        key={log.id} 
                        className={`
                            px-3 py-2 rounded-lg text-sm backdrop-blur-md shadow-sm border-l-4 animate-in fade-in slide-in-from-left-4 duration-300
                            ${log.type === 'info' ? 'bg-slate-900/60 border-slate-500 text-slate-200' : ''}
                            ${log.type === 'success' ? 'bg-green-900/60 border-green-500 text-green-100' : ''}
                            ${log.type === 'warning' ? 'bg-yellow-900/60 border-yellow-500 text-yellow-100' : ''}
                            ${log.type === 'danger' ? 'bg-red-900/60 border-red-500 text-red-100' : ''}
                        `}
                        >
                        {log.text}
                        </div>
                    ))}
                    </div>
                </div>
            )}

            {/* Inventory */}
            {phase === 'PLAYING' && (
                <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-2xl">
                    <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs uppercase font-bold tracking-wider">
                        <Briefcase className="w-4 h-4" /> Backpack
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                        {gameState.inventory.map((item, idx) => (
                            <button 
                                key={idx}
                                onClick={() => onEat(idx)}
                                disabled={!item}
                                className={`
                                    w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all relative group overflow-hidden
                                    ${item ? 'bg-slate-700 border-slate-500 hover:bg-slate-600 hover:border-white cursor-pointer' : 'bg-slate-800/50 border-slate-700 border-dashed'}
                                `}
                            >
                                {renderItemIcon(item)}
                                
                                {/* Tooltip */}
                                {item && (
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50">
                                        {item === ItemType.APPLE ? 'Eat Apple (Drops Seed)' : ''}
                                        {item === ItemType.SEED ? 'Plant Seed' : ''}
                                        {item === ItemType.FISH ? 'Eat Fish (Cook near fire)' : ''}
                                        {item === ItemType.WOOD ? 'Craft Torch' : ''}
                                        {item === ItemType.TORCH ? 'Equip / Build Fire (x3)' : ''}
                                        {item === ItemType.APPLE_JUICE ? 'Drink Juice (+50 Energy)' : ''}
                                        {item === ItemType.BIG_FISH ? 'Eat Big Fish (+80 Energy)' : ''}
                                        {item === ItemType.WOOD_STAND ? 'Build Large Campfire' : ''}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}

      {/* Instructions */}
      {phase === 'PLAYING' && (
        <div className="absolute top-20 right-4 text-white/40 text-xs text-right hidden sm:block pointer-events-none">
            <p>Left Click ground to move</p>
            <p>Left Click trees/items to interact</p>
            <p>Click Center Workbench to Craft</p>
            <p>Eat Apple -> Drops Seed</p>
            <p>Plant Seed -> Grows Tree</p>
            <p>Click Wood -> Make Torch</p>
            <p className="mt-2 text-yellow-500/60">Tip: Cook fish at fire!</p>
        </div>
      )}
    </div>
  );
};
