'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Music: "Life On Hold" by Everet Almond
// Duration: 161 seconds (2:41)
// BPM: 119
// Mood: Reflective, emotional, warm, inspirational

const SONG_DURATION = 161; // seconds
const BPM = 119;
const BEAT_DURATION = 60 / BPM; // ~0.504 seconds per beat

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isPlayingRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      const size = Math.min(window.innerWidth, window.innerHeight) * 0.98;
      canvas.width = size;
      canvas.height = size;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    let animationId: number;
    let startTime: number | null = null;

    const CX = () => canvas.width / 2;
    const CY = () => canvas.height / 2;
    const SIZE = () => Math.min(canvas.width, canvas.height);

    const ease = {
      out: (t: number) => 1 - Math.pow(1 - t, 3),
      inOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
      smooth: (t: number) => t * t * (3 - 2 * t),
      smoother: (t: number) => t * t * t * (t * (t * 6 - 15) + 10),
    };

    // Beat sync function - returns 0-1 pulse on each beat
    const getBeatPulse = (t: number) => {
      const beatPhase = (t % BEAT_DURATION) / BEAT_DURATION;
      return Math.pow(1 - beatPhase, 3); // Sharp attack, quick decay
    };

    // Get bar progress (0-1 for each 4-beat bar)
    const getBarProgress = (t: number) => {
      return (t % (BEAT_DURATION * 4)) / (BEAT_DURATION * 4);
    };

    // Project 3D to 2D
    const project = (x: number, y: number, z: number, camZ: number) => {
      const relZ = z - camZ;
      if (relZ < 10) return null;

      const scale = 600 / relZ;
      const screenX = CX() + x * scale;
      const screenY = CY() + y * scale;

      const dist = Math.sqrt((screenX - CX()) ** 2 + (screenY - CY()) ** 2);
      if (dist > SIZE() * 0.5) return null;

      return { x: screenX, y: screenY, scale, z: relZ };
    };

    // ========== CREATE UNIVERSE ==========
    // Stars distributed to ALWAYS be visible throughout the entire journey

    // Layer 1: Far background (z: 6000 - 25000) - always visible
    const farStars: Array<{x: number; y: number; z: number; size: number; brightness: number; color: string}> = [];
    for (let i = 0; i < 35000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 200 + Math.random() * 4000;
      const colors = ['#ffffff', '#ffe4c4', '#add8e6', '#ffd700', '#87ceeb', '#ffb0a0', '#a0c0ff'];
      farStars.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: 6000 + Math.random() * 19000,
        size: Math.random() * 1.0 + 0.3,
        brightness: Math.random() * 0.35 + 0.15,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    // Layer 2: Mid stars (z: 1500 - 12000)
    const midStars: Array<{x: number; y: number; z: number; size: number; brightness: number; color: string}> = [];
    for (let i = 0; i < 15000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 150 + Math.random() * 2500;
      midStars.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: 1500 + Math.random() * 10500,
        size: Math.random() * 1.5 + 0.5,
        brightness: Math.random() * 0.5 + 0.25,
        color: '#ffffff'
      });
    }

    // Layer 3: Near stars (z: 500 - 6000)
    const nearStars: Array<{x: number; y: number; z: number; size: number; brightness: number; color: string}> = [];
    for (let i = 0; i < 5000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 50 + Math.random() * 800;
      nearStars.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: 500 + Math.random() * 5500,
        size: Math.random() * 2.5 + 1,
        brightness: Math.random() * 0.7 + 0.4,
        color: '#ffffff'
      });
    }

    // Backdrop stars for Earth closeup scene
    const backdropStars: Array<{x: number; y: number; z: number; size: number; brightness: number; color: string}> = [];
    for (let i = 0; i < 8000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 300 + Math.random() * 2000;
      backdropStars.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: 8000 + Math.random() * 7000,
        size: Math.random() * 1.2 + 0.4,
        brightness: Math.random() * 0.5 + 0.3,
        color: '#ffffff'
      });
    }

    // Nebulae
    const nebulae: Array<{x: number; y: number; z: number; size: number; r: number; g: number; b: number; opacity: number}> = [];
    const nebulaColors = [
      { r: 200, g: 100, b: 180 },
      { r: 100, g: 150, b: 200 },
      { r: 200, g: 120, b: 80 },
      { r: 120, g: 180, b: 150 },
      { r: 180, g: 80, b: 200 },
    ];
    for (let i = 0; i < 80; i++) {
      const color = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
      nebulae.push({
        x: (Math.random() - 0.5) * 5000,
        y: (Math.random() - 0.5) * 2500,
        z: 3000 + Math.random() * 15000,
        size: 200 + Math.random() * 350,
        ...color,
        opacity: 0.03 + Math.random() * 0.05
      });
    }

    // Galaxies
    const galaxies: Array<{x: number; y: number; z: number; size: number; rotation: number}> = [];
    for (let i = 0; i < 5; i++) {
      galaxies.push({
        x: (Math.random() - 0.5) * 3000,
        y: (Math.random() - 0.5) * 1500,
        z: 5000 + i * 3000,
        size: 150 + Math.random() * 100,
        rotation: Math.random() * Math.PI
      });
    }

    // ========== ANIMATION ==========
    const animate = (timestamp: number) => {
      if (!isPlayingRef.current) {
        ctx.fillStyle = '#000008';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        [...farStars, ...midStars].slice(0, 3000).forEach(star => {
          const p = project(star.x, star.y, star.z, 0);
          if (!p) return;
          const s = Math.max(0.3, star.size * p.scale * 0.3);
          ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * 0.3})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
          ctx.fill();
        });

        animationId = requestAnimationFrame(animate);
        return;
      }

      if (startTime === null) startTime = timestamp;
      const t = (timestamp - startTime) / 1000;
      setCurrentTime(t);

      ctx.fillStyle = '#000006';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Beat-synced pulse
      const beatPulse = getBeatPulse(t);
      const _barProgress = getBarProgress(t);

      // ========== CAMERA - Synced to music structure ==========
      let camZ = 0;
      let fade = 1;
      let brightness = 0.8;
      let energyLevel = 0.5; // 0-1, synced to music energy

      // Music structure synced phases:
      // 0-8s: Intro (gentle fade in, first beats)
      if (t < 8) {
        fade = ease.smooth(t / 8);
        brightness = fade * 0.5;
        camZ = t * 30;
        energyLevel = 0.2 + fade * 0.1;
      }
      // 8-35s: Verse 1 (emotional, building - deep space journey)
      else if (t < 35) {
        const lt = t - 8;
        const verseProgress = lt / 27;
        camZ = 240 + lt * 100;
        brightness = 0.6 + verseProgress * 0.15;
        energyLevel = 0.3 + verseProgress * 0.2;
      }
      // 35-65s: Chorus 1 (uplifting, more energy - solar approach)
      else if (t < 65) {
        const lt = t - 35;
        const chorusProgress = ease.inOut(lt / 30);
        camZ = 2940 + chorusProgress * 2000;
        brightness = 0.75 + Math.sin(lt * 0.3) * 0.05;
        energyLevel = 0.6 + chorusProgress * 0.15;
      }
      // 65-95s: Verse 2 (reflective - solar system view)
      else if (t < 95) {
        const lt = t - 65;
        camZ = 4940 + lt * 35;
        brightness = 0.7;
        energyLevel = 0.55;
      }
      // 95-130s: Chorus 2 (emotional peak - Earth closeup)
      else if (t < 130) {
        const lt = t - 95;
        const chorusProgress = ease.smoother(lt / 35);
        camZ = 5990 + chorusProgress * 1500;
        brightness = 0.75 + Math.sin(lt * 0.4) * 0.08;
        energyLevel = 0.7 + chorusProgress * 0.2;
      }
      // 130-145s: Outro start (pull back)
      else if (t < 145) {
        const lt = t - 130;
        const pullBack = ease.smooth(lt / 15);
        camZ = 7490 - pullBack * 2500;
        brightness = 0.8 - pullBack * 0.1;
        energyLevel = 0.6 - pullBack * 0.3;
      }
      // 145-161s: Outro end (fade out)
      else if (t < SONG_DURATION) {
        const lt = t - 145;
        fade = 1 - ease.smoother(lt / 16);
        brightness = 0.7 * fade;
        energyLevel = 0.3 * fade;
      }
      else {
        isPlayingRef.current = false;
        setIsPlaying(false);
        startTime = null;
        setCurrentTime(0);
        setShowWelcome(true);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        animationId = requestAnimationFrame(animate);
        return;
      }

      // Beat-synced brightness pulse
      const pulseBrightness = brightness * (1 + beatPulse * 0.08 * energyLevel);

      // ========== RENDER NEBULAE ==========
      nebulae.forEach(n => {
        const p = project(n.x, n.y, n.z, camZ);
        if (!p) return;
        const s = n.size * p.scale;
        if (s < 3) return;
        const op = n.opacity * pulseBrightness * fade * Math.min(p.scale, 0.6);
        if (op < 0.005) return;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s);
        grad.addColorStop(0, `rgba(${n.r}, ${n.g}, ${n.b}, ${op})`);
        grad.addColorStop(0.4, `rgba(${n.r}, ${n.g}, ${n.b}, ${op * 0.3})`);
        grad.addColorStop(1, `rgba(${n.r}, ${n.g}, ${n.b}, 0)`);
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      });

      // ========== RENDER GALAXIES ==========
      galaxies.forEach(g => {
        const p = project(g.x, g.y, g.z, camZ);
        if (!p) return;
        const s = g.size * p.scale;
        if (s < 8) return;
        const op = pulseBrightness * fade * 0.15 * Math.min(p.scale, 0.4);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s);
        grad.addColorStop(0, `rgba(200, 180, 230, ${op})`);
        grad.addColorStop(0.5, `rgba(160, 140, 200, ${op * 0.35})`);
        grad.addColorStop(1, `rgba(120, 100, 160, 0)`);
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
        const rot = g.rotation + t * 0.015;
        ctx.strokeStyle = `rgba(180, 160, 210, ${op * 0.4})`;
        ctx.lineWidth = Math.max(0.5, s * 0.025);
        for (let arm = 0; arm < 3; arm++) {
          ctx.beginPath();
          for (let i = 0; i < 50; i++) {
            const angle = rot + (arm * Math.PI * 2 / 3) + i * 0.08;
            const dist = (i / 50) * s * 0.85;
            const px = p.x + Math.cos(angle) * dist;
            const py = p.y + Math.sin(angle) * dist * 0.5;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      });

      // ========== RENDER ALL STARS ==========
      
      // Far stars with beat pulse
      farStars.forEach(star => {
        const p = project(star.x, star.y, star.z, camZ);
        if (!p) return;
        const op = star.brightness * pulseBrightness * fade * Math.min(p.scale * 0.25, 0.5);
        if (op < 0.02) return;
        const s = Math.max(0.25, star.size * p.scale * (1 + beatPulse * 0.15));
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 1.5);
        const mc = star.color.match(/\w\w/g);
        const r = mc ? parseInt(mc[0], 16) : 255;
        const g = mc ? parseInt(mc[1], 16) : 255;
        const b = mc ? parseInt(mc[2], 16) : 255;
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${op})`);
        grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${op * 0.25})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s * 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Mid stars
      midStars.forEach(star => {
        const p = project(star.x, star.y, star.z, camZ);
        if (!p) return;
        const op = star.brightness * pulseBrightness * fade * Math.min(p.scale * 0.3, 0.6);
        if (op < 0.02) return;
        const s = Math.max(0.35, star.size * p.scale * (1 + beatPulse * 0.2));
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 2);
        grad.addColorStop(0, `rgba(255, 255, 255, ${op})`);
        grad.addColorStop(0.4, `rgba(255, 255, 255, ${op * 0.35})`);
        grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s * 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Near stars
      nearStars.forEach(star => {
        const p = project(star.x, star.y, star.z, camZ);
        if (!p) return;
        const op = star.brightness * pulseBrightness * fade * Math.min(p.scale * 0.4, 0.75);
        if (op < 0.02) return;
        const s = Math.max(0.4, star.size * p.scale * (1 + beatPulse * 0.3));
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 2.5);
        grad.addColorStop(0, `rgba(255, 255, 255, ${op})`);
        grad.addColorStop(0.35, `rgba(255, 255, 255, ${op * 0.4})`);
        grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s * 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Backdrop stars
      if (t >= 60) {
        backdropStars.forEach(star => {
          const p = project(star.x, star.y, star.z, camZ);
          if (!p) return;
          const op = star.brightness * pulseBrightness * fade * Math.min(p.scale * 0.35, 0.6);
          if (op < 0.02) return;
          const s = Math.max(0.3, star.size * p.scale * (1 + beatPulse * 0.25));
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 2);
          grad.addColorStop(0, `rgba(255, 255, 255, ${op})`);
          grad.addColorStop(0.4, `rgba(255, 255, 255, ${op * 0.35})`);
          grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, s * 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // ========== SOLAR SYSTEM (from 35s) ==========
      if (t >= 35 && t < 140) {
        const solarOpacity = Math.min((t - 35) / 4, 1) * fade;
        const sunZ = 8500;

        const sunP = project(0, 0, sunZ, camZ);
        if (sunP && solarOpacity > 0) {
          const sunSize = 60 * sunP.scale * (1 + beatPulse * 0.1 * energyLevel);

          for (let i = 4; i >= 0; i--) {
            const gr = sunSize * (1 + i * 0.65);
            const grad = ctx.createRadialGradient(sunP.x, sunP.y, 0, sunP.x, sunP.y, gr);
            const int = solarOpacity * (1 - i * 0.15) * 0.5;
            grad.addColorStop(0, `rgba(255, 245, 200, ${int})`);
            grad.addColorStop(0.3, `rgba(255, 200, 100, ${int * 0.5})`);
            grad.addColorStop(0.7, `rgba(255, 150, 50, ${int * 0.2})`);
            grad.addColorStop(1, `rgba(255, 100, 0, 0)`);
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sunP.x, sunP.y, gr, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
          }

          const planets = [
            { name: 'Mercury', dist: 80, size: 4, color: '#a0522d', speed: 1.8 },
            { name: 'Venus', dist: 130, size: 7, color: '#daa520', speed: 1.2 },
            { name: 'Earth', dist: 190, size: 9, color: '#4169e1', speed: 0.8 },
            { name: 'Mars', dist: 260, size: 6, color: '#cd5c5c', speed: 0.6 },
            { name: 'Jupiter', dist: 360, size: 24, color: '#f4a460', speed: 0.35 },
            { name: 'Saturn', dist: 480, size: 20, color: '#deb887', speed: 0.22, rings: true },
            { name: 'Uranus', dist: 600, size: 12, color: '#87ceeb', speed: 0.12 },
            { name: 'Neptune', dist: 720, size: 11, color: '#4682b4', speed: 0.08 },
          ];

          planets.forEach((planet, i) => {
            const angle = t * planet.speed + i * 0.8;
            const px = Math.cos(angle) * planet.dist;
            const py = Math.sin(angle) * planet.dist * 0.35;
            const pz = sunZ + Math.sin(angle) * planet.dist * 0.12;

            const pp = project(px, py, pz, camZ);
            if (!pp) return;

            const ps = planet.size * pp.scale;
            if (ps < 1.5) return;

            const mc = planet.color.match(/\w\w/g);
            const pr = mc ? parseInt(mc[0], 16) : 128;
            const pg = mc ? parseInt(mc[1], 16) : 128;
            const pb = mc ? parseInt(mc[2], 16) : 128;

            const grad = ctx.createRadialGradient(
              pp.x - ps * 0.3, pp.y - ps * 0.3, 0,
              pp.x, pp.y, ps
            );
            grad.addColorStop(0, `rgba(${Math.min(pr + 50, 255)}, ${Math.min(pg + 50, 255)}, ${Math.min(pb + 50, 255)}, ${solarOpacity * 0.8})`);
            grad.addColorStop(0.5, `rgba(${pr}, ${pg}, ${pb}, ${solarOpacity * 0.8})`);
            grad.addColorStop(1, `rgba(${Math.max(pr - 50, 0)}, ${Math.max(pg - 50, 0)}, ${Math.max(pb - 50, 0)}, ${solarOpacity * 0.8})`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pp.x, pp.y, ps, 0, Math.PI * 2);
            ctx.fill();

            if (planet.rings) {
              ctx.strokeStyle = `rgba(210, 190, 160, ${solarOpacity * 0.5})`;
              ctx.lineWidth = Math.max(1.5, ps * 0.15);
              ctx.beginPath();
              ctx.ellipse(pp.x, pp.y, ps * 2.2, ps * 0.6, 0.3, 0, Math.PI * 2);
              ctx.stroke();
            }

            if (planet.name === 'Earth' && t >= 80) {
              const moonAngle = t * 2.5;
              const moonDist = ps * 2.5;
              ctx.fillStyle = `rgba(180, 180, 190, ${solarOpacity * 0.7})`;
              ctx.beginPath();
              ctx.arc(pp.x + Math.cos(moonAngle) * moonDist, pp.y + Math.sin(moonAngle) * moonDist * 0.4, ps * 0.28, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }
      }

      // ========== EARTH CLOSEUP (95-145s - synced to Chorus 2) ==========
      if (t >= 95) {
        let earthPhase: number;
        
        if (t < 115) {
          earthPhase = (t - 95) / 20;
        }
        else if (t < 130) {
          earthPhase = 1;
        }
        else if (t < 145) {
          const pullBack = ease.smooth((t - 130) / 15);
          earthPhase = 1 - pullBack * 0.7;
        }
        else {
          earthPhase = 0.3;
        }

        const earthOpacity = fade * ease.smooth(Math.min((t - 95) / 5, 1));
        const earthProgress = ease.smoother(Math.max(0, Math.min(earthPhase, 1)));
        const earthRadius = SIZE() * (0.08 + earthProgress * 0.35);
        const earthX = CX();
        const earthY = CY();

        // Beat-synced Earth pulse
        const earthPulse = 1 + beatPulse * 0.03 * energyLevel;

        if (earthOpacity > 0 && earthRadius > 5) {
          // Atmosphere glow with beat pulse
          for (let a = 5; a >= 0; a--) {
            const as = (earthRadius + 8 + a * 6) * earthPulse;
            const ag = ctx.createRadialGradient(earthX, earthY, earthRadius * 0.9, earthX, earthY, as);
            ag.addColorStop(0, `rgba(100, 180, 255, ${earthOpacity * 0.15 * (1 - a * 0.15)})`);
            ag.addColorStop(1, 'rgba(100, 180, 255, 0)');
            ctx.fillStyle = ag;
            ctx.beginPath();
            ctx.arc(earthX, earthY, as, 0, Math.PI * 2);
            ctx.fill();
          }

          // Earth base
          const earthGrad = ctx.createRadialGradient(
            earthX - earthRadius * 0.3, earthY - earthRadius * 0.3, 0,
            earthX, earthY, earthRadius
          );
          earthGrad.addColorStop(0, `rgba(80, 140, 200, ${earthOpacity})`);
          earthGrad.addColorStop(0.5, `rgba(40, 100, 170, ${earthOpacity})`);
          earthGrad.addColorStop(1, `rgba(20, 60, 120, ${earthOpacity})`);
          ctx.fillStyle = earthGrad;
          ctx.beginPath();
          ctx.arc(earthX, earthY, earthRadius * earthPulse, 0, Math.PI * 2);
          ctx.fill();

          // Continents
          if (t >= 105) {
            const detailLevel = ease.smooth(Math.min((t - 105) / 10, 1)) * earthOpacity;
            const landAngle = t * 0.02;

            ctx.globalAlpha = detailLevel * 0.7;
            ctx.fillStyle = '#2d6a30';

            ctx.beginPath();
            ctx.ellipse(earthX + Math.cos(landAngle) * earthRadius * 0.2, earthY - earthRadius * 0.15,
              earthRadius * 0.18, earthRadius * 0.35, 0.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(earthX - Math.cos(landAngle) * earthRadius * 0.25, earthY + earthRadius * 0.05,
              earthRadius * 0.15, earthRadius * 0.3, -0.1, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(earthX - Math.cos(landAngle) * earthRadius * 0.5, earthY - earthRadius * 0.1,
              earthRadius * 0.22, earthRadius * 0.2, 0.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
          }

          // Clouds
          if (t >= 110) {
            const cloudOpacity = ease.smooth(Math.min((t - 110) / 8, 1)) * earthOpacity;
            const cloudAngle = t * 0.03;

            ctx.globalAlpha = cloudOpacity * 0.5;
            ctx.fillStyle = '#ffffff';

            for (let c = 0; c < 8; c++) {
              const cloudX = earthX + Math.cos(cloudAngle + c * 0.8) * earthRadius * 0.5;
              const cloudY = earthY + Math.sin(cloudAngle * 0.7 + c * 1.2) * earthRadius * 0.4;
              const cloudSize = earthRadius * (0.06 + Math.sin(c * 2.5) * 0.02);
              ctx.beginPath();
              ctx.arc(cloudX, cloudY, cloudSize, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.globalAlpha = 1;
          }

          // Specular highlight
          const specGrad = ctx.createRadialGradient(
            earthX - earthRadius * 0.35, earthY - earthRadius * 0.35, 0,
            earthX - earthRadius * 0.35, earthY - earthRadius * 0.35, earthRadius * 0.4
          );
          specGrad.addColorStop(0, `rgba(255, 255, 255, ${earthOpacity * 0.25})`);
          specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = specGrad;
          ctx.beginPath();
          ctx.arc(earthX, earthY, earthRadius * earthPulse, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ========== BEAT SYNCED CENTER GLOW ==========
      if (energyLevel > 0.5 && t > 8) {
        const glowSize = SIZE() * 0.15 * (1 + beatPulse * 0.3);
        const glowGrad = ctx.createRadialGradient(CX(), CY(), 0, CX(), CY(), glowSize);
        const glowOpacity = beatPulse * 0.08 * energyLevel * fade;
        glowGrad.addColorStop(0, `rgba(150, 180, 255, ${glowOpacity})`);
        glowGrad.addColorStop(1, 'rgba(150, 180, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(CX(), CY(), glowSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // ========== VIGNETTE ==========
      const vignette = ctx.createRadialGradient(CX(), CY(), SIZE() * 0.3, CX(), CY(), SIZE() * 0.52);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(0.6, 'rgba(0,0,0,0.15)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (fade < 1) {
        ctx.fillStyle = `rgba(0, 0, 6, ${1 - fade})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(CX(), CY(), SIZE() * 0.48, 0, Math.PI * 2);
      ctx.stroke();

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  const handleStart = useCallback(() => {
    setShowWelcome(false);
    setIsPlaying(true);
    isPlayingRef.current = true;
    if (audioRef.current && audioReady) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Audio playback may fail due to autoplay policies
      });
    }
  }, [audioReady]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentTime(0);
    setShowWelcome(true);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  const getPhase = (t: number) => {
    if (t < 8) return 'Intro';
    if (t < 35) return 'Verse 1';
    if (t < 65) return 'Chorus 1';
    if (t < 95) return 'Verse 2';
    if (t < 130) return 'Chorus 2';
    if (t < 145) return 'Outro';
    if (t < SONG_DURATION) return 'Fade Out';
    return 'Complete';
  };

  return (
    <div className="w-full h-screen bg-black flex flex-col items-center justify-center">
      <canvas ref={canvasRef} />
      
      {/* Audio Element - Life On Hold by Everet Almond */}
      {/* Note: For the full experience, download from: https://hypeddit.com/everetalmond/lifeonhold */}
      {/* Or from YouTube Audio Library */}
      <audio 
        ref={audioRef}
        preload="auto"
        loop={false}
      >
        <source src="/life-on-hold.mp3" type="audio/mpeg" />
      </audio>

      {showWelcome && !isPlaying && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
          <h1 className="text-6xl md:text-8xl font-extralight text-white/70 tracking-[0.3em] mb-4" style={{ textShadow: '0 0 40px rgba(100,150,255,0.3)' }}>
            COSMOS
          </h1>
          <p className="text-sm text-white/35 tracking-[0.25em] mb-2 uppercase">
            A Journey Through Space
          </p>
          <p className="text-xs text-white/25 tracking-[0.2em] mb-6">
            ♪ &quot;Life On Hold&quot; by Everet Almond • 119 BPM
          </p>
          
          <button onClick={handleStart} className="pointer-events-auto px-12 py-4 bg-white/12 text-white text-lg rounded-full hover:bg-white/20 transition-all cursor-pointer border border-white/15">
            Launch Journey
          </button>
          
          <p className="text-xs text-white/15 mt-6 max-w-md text-center">
            Download &quot;Life On Hold&quot; from YouTube Audio Library or SoundCloud and save as <code className="text-white/30 bg-white/5 px-1 rounded">public/life-on-hold.mp3</code>
          </p>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 items-center bg-black/60 px-6 py-3 rounded-full border border-white/10">
        <button onClick={handleStart} disabled={isPlaying} className="px-8 py-3 bg-white/10 text-white rounded-full hover:bg-white/20 disabled:bg-white/5 disabled:opacity-50 transition-all cursor-pointer">
          {isPlaying ? 'Playing...' : 'Launch'}
        </button>
        <button onClick={handleReset} className="px-6 py-3 bg-white/5 text-white/60 rounded-full hover:bg-white/10 transition-all cursor-pointer">
          Reset
        </button>
        <div className="text-white/60 font-mono text-xl min-w-[60px] text-center">{formatTime(currentTime)}</div>
        <div className="text-xs text-white/35 min-w-[100px]">{isPlaying && getPhase(currentTime)}</div>
      </div>

      <div className="absolute top-3 left-1/2 -translate-x-1/2 text-white/20 text-xs tracking-widest">
        63,000 Stars • 8 Planets • {BPM} BPM • {Math.floor(SONG_DURATION / 60)}:{(SONG_DURATION % 60).toString().padStart(2, '0')} Journey
      </div>
    </div>
  );
}
