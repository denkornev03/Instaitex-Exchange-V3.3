
import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Maximize2, Minimize2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { INITIAL_COINS } from '../constants';
import { CoinData } from '../types';
import GafferScene from './GafferScene';
import SkyPodScene from './SkyPodScene';

// --- CONSTANTS ---
const VOXEL_SIZE = 1;
const PALETTE = {
    podBody: 0x40E0D0, podDark: 0x1a2b30, podLight: 0x88eeee,
    steel: 0x505b63, steelLight: 0x708090,
    grass1: 0x588c3a, grass2: 0x6aa84f, grass3: 0x48752c,
    wood: 0x5c4033, leaf1: 0x2d4c1e, leaf2: 0x3a5f27,
    roadAsphalt: 0x2a2a2c, roadLine: 0xffffff,
    carBody: 0xd93025, carWheel: 0x181818, carGlass: 0x203040,
    carLightFront: 0xfffaa0, carLightBack: 0xff3300
};
const SCENE_CONFIG = {
    backgroundColor: 0xb0d0ff, fogColor: 0xb0d0ff,
    fogNear: 20, fogFar: 90,
    sunColor: 0xffaa55, rimColor: 0xaaccff
};

// 1. CryptoChart Component
const CryptoChart = ({ className, coin }: { className?: string, coin: CoinData }) => {
    const [data, setData] = useState<number[]>([]);
    const [price, setPrice] = useState(coin.currentPrice);
    const [opacity, setOpacity] = useState(0.4);
    const maxPoints = 80; // More points for wider chart

    // Reset simulation when coin changes
    useEffect(() => {
        const base = coin.basePrice;
        
        if (coin.id === 'GAFR') {
            // Flat line for GAFR
            setData(Array(maxPoints).fill(0));
            setPrice(0);
        } else {
            // Normal fluctuation
            const variance = base * 0.02; // 2% variance
            const initData = Array.from({ length: maxPoints }, () => base + (Math.random() - 0.5) * variance);
            setData(initData);
            setPrice(coin.currentPrice);
        }
    }, [coin]);

    // Live tick simulation
    useEffect(() => {
        const interval = setInterval(() => {
            if (coin.id === 'GAFR') {
                 setData(prev => {
                    // Mostly 0, rare flicker
                    const shouldFlicker = Math.random() > 0.95;
                    const val = shouldFlicker ? (Math.random() > 0.5 ? 0.01 : -0.01) : 0;
                    return [...prev.slice(1), val];
                 });
                 setPrice(0);
            } else {
                setData(prev => {
                    const last = prev[prev.length - 1] || coin.basePrice;
                    // Random walk
                    const volatility = coin.basePrice * 0.005; // 0.5% max move per tick
                    const change = (Math.random() - 0.5) * volatility;
                    
                    let newPrice = last + change;
                    
                    // Soft constraints to keep it chartable
                    const minBound = coin.basePrice * 0.8;
                    const maxBound = coin.basePrice * 1.2;
                    if (newPrice < minBound) newPrice = minBound + volatility; 
                    if (newPrice > maxBound) newPrice = maxBound - volatility;
                    
                    setPrice(newPrice);
                    return [...prev.slice(1), newPrice];
                });
            }
        }, 800);
        return () => clearInterval(interval);
    }, [coin]);

    const width = 1200; // Virtual SVG width
    const height = 400;
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    // Safety check for flat lines to avoid divide by zero
    const range = (max - min) || (coin.basePrice > 0 ? coin.basePrice * 0.0001 : 1);

    const points = data.map((d, i) => {
        const x = (i / (maxPoints - 1)) * width;
        const normalizedY = (d - min) / range;
        
        // If range is effectively 0 (flat line), center the line
        const effectiveY = (max === min) ? 0.5 : normalizedY;

        const drawHeight = height * 0.7;
        const padding = height * 0.15;
        const y = height - (padding + effectiveY * drawHeight); 
        return `${x},${y}`;
    }).join(' ');

    const isPositive = price >= (data[0] || 0);
    const colorClass = isPositive ? "text-green-400" : "text-red-400";
    const strokeColor = coin.id === 'GAFR' ? coin.color : (isPositive ? "#4ade80" : "#f87171");
    const percentChange = data.length > 0 && data[0] !== 0 ? ((price - data[0])/data[0] * 100).toFixed(2) : "0.00";

    // Dynamic formatting based on price scale
    const priceDisplay = coin.id === 'GAFR' ? "0.00" : (price < 1 ? price.toFixed(8) : price.toFixed(2));

    return (
        <div className={`w-full h-full relative flex flex-col ${className}`}>
            <div className="absolute inset-0 transition-colors duration-300 pointer-events-none rounded-xl" style={{ backgroundColor: `rgba(20, 25, 30, ${opacity})`, backdropFilter: 'blur(4px)' }} />
            <div className="relative z-10 flex flex-col w-full h-full p-6 md:p-8">
                <div className="flex justify-between items-start pointer-events-auto select-none">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg border-2" style={{ backgroundColor: coin.color, borderColor: coin.color }}>
                                {coin.symbol[0]}
                            </div>
                            <div>
                                <div className="font-bold text-white text-xl tracking-widest">{coin.symbol}</div>
                                <div className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">{coin.name}</div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <span className={`font-mono text-3xl md:text-6xl font-bold tracking-tighter ${coin.id === 'GAFR' ? 'text-[#00B2B2]' : colorClass}`}>${priceDisplay}</span>
                            <span className={`ml-4 font-mono text-sm md:text-xl ${coin.id === 'GAFR' ? 'text-[#00B2B2]' : colorClass}`}>
                                {coin.id === 'GAFR' ? '▬' : (isPositive ? '▲' : '▼')} {Math.abs(Number(percentChange))}%
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 bg-black/40 p-3 rounded-lg backdrop-blur-sm border border-white/10">
                        <label className="text-[10px] uppercase text-gray-400 tracking-wider font-bold">HUD Opacity</label>
                        <input type="range" min="0" max="0.95" step="0.01" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-32 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
                    </div>
                </div>
                <div className="flex-1 w-full min-h-0 relative mt-4 pointer-events-none">
                    {/* Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between opacity-10">
                        <div className="w-full h-px bg-white"></div><div className="w-full h-px bg-white"></div><div className="w-full h-px bg-white"></div><div className="w-full h-px bg-white"></div><div className="w-full h-px bg-white"></div>
                    </div>
                    <div className="absolute inset-0 flex justify-between opacity-5">
                        <div className="h-full w-px bg-white"></div><div className="h-full w-px bg-white"></div><div className="h-full w-px bg-white"></div><div className="h-full w-px bg-white"></div><div className="h-full w-px bg-white"></div><div className="h-full w-px bg-white"></div><div className="h-full w-px bg-white"></div><div className="h-full w-px bg-white"></div>
                    </div>
                    
                    {/* Chart */}
                    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]">
                        <defs>
                            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
                                <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d={`M 0,${height} ${points.split(' ').map((p) => `L ${p}`).join(' ')} L ${width},${height} Z`} fill="url(#chartGradient)" />
                        <polyline fill="none" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points} vectorEffect="non-scaling-stroke" />
                    </svg>
                </div>
                <div className="flex justify-between text-xs text-cyan-200/60 font-mono mt-2 pointer-events-auto uppercase tracking-wider">
                    <div>24H VOL: {(coin.balance * 0.1).toLocaleString()} {coin.symbol}</div>
                    <div>RANGE: {(price * 0.98).toFixed(6)} - {(price * 1.02).toFixed(6)}</div>
                    <div>MKT CAP: ${(coin.balance * price).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
            </div>
        </div>
    );
};

// 2. SkyWayScene Component
const SkyWayScene = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const requestRef = useRef<number | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(SCENE_CONFIG.backgroundColor);
        scene.fog = new THREE.Fog(SCENE_CONFIG.fogColor, SCENE_CONFIG.fogNear, SCENE_CONFIG.fogFar);
        
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(-16, 6.4, 28);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 8, 0);
        
        const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
        scene.add(ambientLight);
        
        const sunLight = new THREE.DirectionalLight(SCENE_CONFIG.sunColor, 1.5);
        sunLight.position.set(-50, 40, 20);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048; sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5; sunLight.shadow.camera.far = 200;
        sunLight.shadow.camera.left = -50; sunLight.shadow.camera.right = 50;
        sunLight.shadow.camera.top = 50; sunLight.shadow.camera.bottom = -50;
        scene.add(sunLight);
        
        const rimLight = new THREE.DirectionalLight(SCENE_CONFIG.rimColor, 0.5);
        rimLight.position.set(20, 10, -20);
        scene.add(rimLight);
        
        const boxGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
        const createVoxelForGroup = (color: number, x: number, y: number, z: number, parent: THREE.Group) => {
            const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.1 });
            const mesh = new THREE.Mesh(boxGeo, mat);
            mesh.position.set(x, y, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            parent.add(mesh);
        };
        
        const staticVoxels: {x: number, y: number, z: number, color: number}[] = [];
        const roadCenterZ = 12;
        const roadWidth = 3;
        
        for (let x = -60; x <= 60; x++) {
            for (let z = -40; z <= 20; z++) {
                if (z >= roadCenterZ - roadWidth - 1 && z <= roadCenterZ + roadWidth + 1) continue;
                const r = Math.random();
                let col = PALETTE.grass1;
                if (r > 0.6) col = PALETTE.grass2;
                if (r > 0.9) col = PALETTE.grass3;
                const yOff = Math.random() * 0.2;
                if (Math.abs(x) < 40 || Math.random() > 0.5) staticVoxels.push({ x: x, y: -2 + yOff, z: z, color: col });
            }
            for (let z = roadCenterZ - roadWidth; z <= roadCenterZ + roadWidth; z++) {
                let col = PALETTE.roadAsphalt;
                if (z === roadCenterZ && x % 4 < 2) col = PALETTE.roadLine;
                staticVoxels.push({ x: x, y: -1.5, z: z, color: col });
            }
        }
        
        const trackHeight = 14;
        for (let x = -50; x <= 50; x++) {
            staticVoxels.push({ x: x, y: trackHeight, z: 0, color: PALETTE.steel });
            staticVoxels.push({ x: x, y: trackHeight + 3, z: 0, color: PALETTE.steel });
            if (x % 2 === 0) {
                staticVoxels.push({ x: x, y: trackHeight + 1, z: 0, color: PALETTE.steelLight });
                staticVoxels.push({ x: x + 1, y: trackHeight + 2, z: 0, color: PALETTE.steelLight });
            } else {
                staticVoxels.push({ x: x, y: trackHeight + 2, z: 0, color: PALETTE.steelLight });
                staticVoxels.push({ x: x + 1, y: trackHeight + 1, z: 0, color: PALETTE.steelLight });
            }
        }
        
        const supportXLocations = [-25, 25];
        supportXLocations.forEach(posX => {
            for (let y = -2; y <= trackHeight + 3; y++) {
                staticVoxels.push({ x: posX, y: y, z: -4, color: PALETTE.steel });
                staticVoxels.push({ x: posX + 1, y: y, z: -4, color: PALETTE.steel });
                staticVoxels.push({ x: posX, y: y, z: -3, color: PALETTE.steel });
                staticVoxels.push({ x: posX + 1, y: y, z: -3, color: PALETTE.steel });
            }
            for (let z = -3; z <= 0; z++) {
                staticVoxels.push({ x: posX, y: trackHeight, z: z, color: PALETTE.steelLight });
                staticVoxels.push({ x: posX, y: trackHeight + 3, z: z, color: PALETTE.steelLight });
            }
            for (let i = 0; i < 16; i++) {
                staticVoxels.push({ x: posX - (i * 0.5), y: trackHeight - i, z: -4, color: PALETTE.steel });
                staticVoxels.push({ x: posX + (i * 0.5), y: trackHeight - i, z: -4, color: PALETTE.steel });
            }
        });
        
        const instancedMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
        const instancedMesh = new THREE.InstancedMesh(boxGeo, instancedMaterial, staticVoxels.length);
        instancedMesh.castShadow = true; instancedMesh.receiveShadow = true;
        
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        
        staticVoxels.forEach((voxel, i) => {
            dummy.position.set(voxel.x, voxel.y, voxel.z);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
            color.setHex(voxel.color);
            instancedMesh.setColorAt(i, color);
        });
        scene.add(instancedMesh);
        
        // Dynamic Pod
        const podGroup = new THREE.Group();
        scene.add(podGroup);
        const offsetX = -4; const offsetY = -2.5; const offsetZ = -2;
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 5; y++) {
                for (let z = 0; z < 4; z++) {
                    if ((x === 0 || x === 7) && (y === 0 || y === 4)) continue;
                    if ((x === 0 || x === 7) && (z === 0 || z === 3)) continue;
                    let voxColor = PALETTE.podBody;
                    if (y >= 1 && y <= 3) {
                        if (x === 0 || x === 7) voxColor = PALETTE.podDark;
                        else if (z === 3 || z === 0) voxColor = PALETTE.podDark;
                        if (x > 0 && x < 7 && (z === 0 || z === 3)) voxColor = PALETTE.podDark;
                    }
                    if (x === 4 && y < 4 && (z === 3 || z === 0)) voxColor = 0x000000;
                    createVoxelForGroup(voxColor, x + offsetX, y + offsetY, z + offsetZ, podGroup);
                }
            }
        }
        for (let y = 2; y < 5; y++) createVoxelForGroup(PALETTE.steelLight, 0, y, 0, podGroup);
        createVoxelForGroup(PALETTE.steel, -1, 5, 0, podGroup);
        createVoxelForGroup(PALETTE.steel, 0, 5, 0, podGroup);
        createVoxelForGroup(PALETTE.steel, 1, 5, 0, podGroup);
        podGroup.position.y = trackHeight - 1;

        // Dynamic Car
        const carGroup = new THREE.Group();
        scene.add(carGroup);
        const buildCar = () => {
            const cx = -2.5; const cy = 0; const cz = -1.5;
            for(let x=0; x<5; x++) {
                for(let z=0; z<3; z++) {
                    if ((x===0 || x===4) && (z===0 || z===2)) createVoxelForGroup(PALETTE.carWheel, x+cx, cy, z+cz, carGroup);
                    if (x > 0 && x < 4) createVoxelForGroup(PALETTE.carBody, x+cx, cy, z+cz, carGroup);
                    if ((x===0||x===4) && z===1) createVoxelForGroup(PALETTE.carBody, x+cx, cy, z+cz, carGroup);
                    if (z >= 0 && z <= 2) {
                        let col = PALETTE.carBody;
                        if (x===1 || x===3) col = PALETTE.carGlass;
                        if (x===2 && (z===0 || z===2)) col = PALETTE.carGlass;
                        createVoxelForGroup(col, x+cx, cy+1, z+cz, carGroup);
                    }
                }
            }
            for(let x=1; x<=3; x++) for(let z=0; z<=2; z++) createVoxelForGroup(PALETTE.carBody, x+cx, cy+2, z+cz, carGroup);
            createVoxelForGroup(PALETTE.carLightFront, 4+cx, cy+1, 0+cz, carGroup);
            createVoxelForGroup(PALETTE.carLightFront, 4+cx, cy+1, 2+cz, carGroup);
            createVoxelForGroup(PALETTE.carLightBack, 0+cx, cy+1, 0+cz, carGroup);
            createVoxelForGroup(PALETTE.carLightBack, 0+cx, cy+1, 2+cz, carGroup);
        };
        buildCar();
        carGroup.position.y = -0.5;
        carGroup.position.z = roadCenterZ;

        // Trees
        const treesContainer = new THREE.Group();
        scene.add(treesContainer);
        const createTree = (x: number, z: number) => {
            const treeGroup = new THREE.Group();
            const h = 4 + Math.random() * 4;
            for(let y=0; y<h; y++) createVoxelForGroup(PALETTE.wood, 0, y-2, 0, treeGroup);
            const leaveColor = (Math.random()>0.5) ? PALETTE.leaf1 : PALETTE.leaf2;
            for(let lx=-2; lx<=2; lx++) for(let ly=0; ly<=3; ly++) for(let lz=-2; lz<=2; lz++) {
                if (Math.abs(lx)+Math.abs(ly)+Math.abs(lz) < 4) createVoxelForGroup(leaveColor, lx, h+ly-3, lz, treeGroup);
            }
            treeGroup.position.set(x, 0, z);
            treesContainer.add(treeGroup);
        };
        for(let i=0; i<15; i++) createTree(-40 + Math.random()*80, -10 - Math.random()*20);

        // Animation
        const clock = new THREE.Clock();
        const animate = () => {
            requestRef.current = requestAnimationFrame(animate);
            const time = clock.getElapsedTime();
            const speed = 7.5;
            const trackLimit = 50;
            podGroup.position.x = ((time * speed) % (trackLimit * 2)) - trackLimit;
            const carSpeed = 12;
            carGroup.position.x = trackLimit - ((time * carSpeed) % (trackLimit * 2));
            podGroup.rotation.z = Math.sin(time * 2) * 0.02;
            carGroup.position.y = -0.5 + Math.sin(time * 20) * 0.02;
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (!containerRef.current) return;
            const newWidth = containerRef.current.clientWidth;
            const newHeight = containerRef.current.clientHeight;
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (rendererRef.current) rendererRef.current.dispose();
            if (containerRef.current && rendererRef.current) containerRef.current.removeChild(rendererRef.current.domElement);
        };
    }, []);

    return <div ref={containerRef} className="absolute inset-0 z-0 bg-[#3b75ba]" />;
};

// 3. Main Wrapper Component
const VoxelTrade = () => {
    const [uiVisible, setUiVisible] = useState(true);
    const [selectedCoinId, setSelectedCoinId] = useState(INITIAL_COINS[0].id);
    const [ustcVariant, setUstcVariant] = useState<'standard' | 'exotic'>('standard');
    
    const selectedCoin = INITIAL_COINS.find(c => c.id === selectedCoinId) || INITIAL_COINS[0];

    const handleNextCoin = () => {
        const currentIndex = INITIAL_COINS.findIndex(c => c.id === selectedCoinId);
        const nextIndex = (currentIndex + 1) % INITIAL_COINS.length;
        setSelectedCoinId(INITIAL_COINS[nextIndex].id);
    };

    const handlePrevCoin = () => {
        const currentIndex = INITIAL_COINS.findIndex(c => c.id === selectedCoinId);
        const prevIndex = (currentIndex - 1 + INITIAL_COINS.length) % INITIAL_COINS.length;
        setSelectedCoinId(INITIAL_COINS[prevIndex].id);
    };

    // Render logic for different scenes
    const renderScene = () => {
        if (selectedCoin.id === 'GAFR') {
            return <GafferScene />;
        }
        if (selectedCoin.id === 'USTC' && ustcVariant === 'exotic') {
            return <SkyPodScene />;
        }
        return <SkyWayScene />;
    };

    return (
        <div className="relative w-full h-full min-h-[600px] overflow-hidden bg-black text-white">
            {renderScene()}
            
            <button 
                onClick={() => setUiVisible(!uiVisible)} 
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/20 hover:bg-black/50 text-cyan-400 hover:text-white transition-all backdrop-blur-sm border border-cyan-500/20 hover:border-cyan-500/50 pointer-events-auto"
            >
                {uiVisible ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>

            {/* Chart Container - Widened to max-w-7xl */}
            <div className={`absolute inset-0 z-10 transition-opacity duration-500 ease-in-out flex items-center justify-center p-4 lg:p-8 ${uiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="w-full max-w-7xl h-full max-h-[600px] relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-black/20 flex flex-col">
                    <div className="flex-1 min-h-0 relative">
                        <CryptoChart coin={selectedCoin} />
                    </div>
                    
                    {/* Coin Switcher Controls */}
                    <div className="h-16 bg-[#14191e]/90 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-6 pointer-events-auto">
                        <button onClick={handlePrevCoin} className="p-2 hover:bg-white/10 rounded-full transition-colors text-cyan-400">
                            <ChevronLeft size={24} />
                        </button>
                        
                        <div className="flex items-center gap-4 overflow-x-auto px-4 hide-scrollbar">
                            {INITIAL_COINS.map(coin => (
                                <button
                                    key={coin.id}
                                    onClick={() => setSelectedCoinId(coin.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${selectedCoinId === coin.id ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-transparent border-transparent text-gray-500 hover:text-white'}`}
                                >
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: coin.color }}></div>
                                    <span className="font-bold text-sm">{coin.symbol}</span>
                                </button>
                            ))}
                        </div>

                        {/* Variant Switcher for USTC */}
                        {selectedCoin.id === 'USTC' && (
                            <button 
                                onClick={() => setUstcVariant(prev => prev === 'standard' ? 'exotic' : 'standard')}
                                className="ml-4 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/40 transition-colors text-xs font-bold flex items-center gap-2"
                            >
                                <RefreshCw size={12} className={ustcVariant === 'exotic' ? 'animate-spin' : ''} />
                                {ustcVariant === 'standard' ? 'Exotic View' : 'Standard View'}
                            </button>
                        )}

                        <button onClick={handleNextCoin} className="p-2 hover:bg-white/10 rounded-full transition-colors text-cyan-400">
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoxelTrade;
