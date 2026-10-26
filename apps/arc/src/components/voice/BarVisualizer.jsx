import React, { useEffect, useRef } from 'react';

/**
 * Modern Audio-Reactive Bar Visualizer
 * Inspired by ElevenLabs UI & ChatGPT Voice visualizer
 * Uses dual-spring damper physics and harmonic vocal modeling
 */
export default function BarVisualizer({
  state = 'idle', // 'idle' | 'listening' | 'thinking' | 'speaking'
  volume = 0,
  frequencyData = null,
  barCount = 34,
  minHeight = 4,
  maxHeight = 46,
  barWidth = 3.5,
  barGap = 4,
  colors = ['#c9f36e', '#10b981', '#38bdf8'],
  onInterrupt = null,
  className = '',
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const heightsRef = useRef(new Array(barCount).fill(minHeight));
  const velocitiesRef = useRef(new Array(barCount).fill(0));
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const totalWidth = barCount * barWidth + (barCount - 1) * barGap;
    const totalHeight = maxHeight + 14;

    canvas.width = totalWidth * dpr;
    canvas.height = totalHeight * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    let lastTime = performance.now();

    const render = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;
      timeRef.current += dt;

      ctx.clearRect(0, 0, totalWidth, totalHeight);

      const isListening = state === 'listening';
      const isSpeaking = state === 'speaking' || state === 'talking';
      const isThinking = state === 'thinking';
      const centerY = totalHeight / 2;

      // Spring physics parameters for fluid organic motion
      const springK = isSpeaking ? 0.26 : 0.22;
      const damping = isSpeaking ? 0.68 : 0.74;

      for (let i = 0; i < barCount; i++) {
        const normIndex = i / (barCount - 1); // 0 to 1
        const centerDist = Math.abs(normIndex - 0.5) * 2; // 0 at center, 1 at edges
        const bellCurve = Math.cos(centerDist * Math.PI * 0.48); // Natural voice EQ envelope

        let targetH = minHeight;

        if (frequencyData && frequencyData.length > 0) {
          const freqIdx = Math.floor(normIndex * frequencyData.length * 0.72);
          const rawVal = (frequencyData[freqIdx] || 0) / 255;
          targetH = minHeight + rawVal * (maxHeight - minHeight) * (bellCurve * 0.7 + 0.3);
        } else if (isListening) {
          const micEnergy = Math.max(volume, 0.12);
          const wave1 = Math.sin(timeRef.current * 10 + i * 0.5) * 0.5 + 0.5;
          const wave2 = Math.sin(timeRef.current * 19 + i * 1.1) * 0.25;
          const energy = (wave1 * 0.75 + wave2 + 0.25) * micEnergy;
          targetH = minHeight + energy * (maxHeight - minHeight) * bellCurve;
        } else if (isSpeaking) {
          const speechVol = Math.max(volume, 0.38 + 0.22 * Math.sin(timeRef.current * 4.5));
          const wave1 = Math.sin(timeRef.current * 14 + i * 0.42) * 0.5 + 0.5;
          const wave2 = Math.cos(timeRef.current * 8.5 + i * 0.85) * 0.35 + 0.35;
          const wave3 = Math.sin(timeRef.current * 22 + i * 1.4) * 0.15;
          const energy = (wave1 * 0.55 + wave2 * 0.35 + wave3) * speechVol;
          targetH = minHeight + energy * (maxHeight - minHeight) * (bellCurve * 0.75 + 0.25);
        } else if (isThinking) {
          const travelPos = (timeRef.current * 2.6) % 1;
          const distToTravel = Math.abs(normIndex - travelPos);
          const pulse = Math.max(0, 1 - distToTravel * 5.0);
          const ambient = Math.sin(timeRef.current * 3 + i * 0.3) * 0.2 + 0.2;
          targetH = minHeight + (pulse * 0.8 + ambient * 0.2) * (maxHeight * 0.65 - minHeight);
        } else {
          // Calm idle undulating breath
          const gentle = Math.sin(timeRef.current * 2.0 + i * 0.32) * 0.5 + 0.5;
          targetH = minHeight + gentle * 6 * bellCurve;
        }

        // Numerical Verlet/Spring integration
        const currentH = heightsRef.current[i];
        const force = (targetH - currentH) * springK;
        velocitiesRef.current[i] = (velocitiesRef.current[i] + force) * damping;
        heightsRef.current[i] = Math.max(minHeight, Math.min(maxHeight, currentH + velocitiesRef.current[i]));

        const h = heightsRef.current[i];
        const x = i * (barWidth + barGap);
        const y = centerY - h / 2;

        // Render rounded pill bar with neon gradient
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(0.5, colors[1]);
        grad.addColorStop(1, colors[2] || colors[0]);

        ctx.fillStyle = grad;
        ctx.beginPath();
        const r = barWidth / 2;
        ctx.roundRect(x, y, barWidth, h, r);
        ctx.fill();

        // Soft tip glow for active bars
        if (h > minHeight + 10) {
          ctx.shadowColor = colors[0];
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [state, volume, frequencyData, barCount, minHeight, maxHeight, barWidth, barGap, colors]);

  const totalWidth = barCount * barWidth + (barCount - 1) * barGap;
  const totalHeight = maxHeight + 14;

  return (
    <div
      className={`elevenlabs-bar-visualizer-wrap ${className}`}
      onClick={onInterrupt}
      title={state === 'speaking' ? 'Click to interrupt' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: state === 'speaking' ? 'pointer' : 'default',
        padding: '10px 18px',
        borderRadius: '999px',
        background: 'rgba(15, 23, 17, 0.45)',
        border: '1px solid rgba(201, 243, 110, 0.15)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: totalWidth,
          height: totalHeight,
          display: 'block',
        }}
      />
    </div>
  );
}
