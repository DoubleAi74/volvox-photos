"use client";

import React, { useEffect, useRef } from "react";

/**
 * Single Volvox Appearance Component
 * This is the visual representation (Green sphere + daughter colonies)
 */
const VolvoxGraphic = ({ size }) => {
  return (
    // We use 'w-full h-full' here so the parent controls the actual size
    <div className="relative w-full h-full">
      {/* Mother Colony Body */}
      <div className="w-full h-full rounded-full border border-green-400/40 bg-green-500/10 backdrop-blur-[2px] shadow-[0_0_40px_rgba(34,197,94,0.2)] overflow-hidden animate-[spin_20s_linear_infinite]">
        {/* Surface Texture (Somatic Cells) */}
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(#4ade80_1.5px,transparent_1.5px)] [background-size:12px_12px]" />

        {/* Daughter Colonies (positioned relative to percentage to scale correctly) */}
        <div className="absolute top-[20%] left-[20%] w-[25%] h-[25%] rounded-full bg-green-600/80 shadow-inner blur-[0.5px] animate-[spin_10s_linear_infinite]" />
        <div className="absolute bottom-[20%] right-[15%] w-[30%] h-[30%] rounded-full bg-green-700/80 shadow-inner blur-[0.5px] animate-[pulse_5s_ease-in-out_infinite]" />
        <div className="absolute bottom-[25%] left-[25%] w-[18%] h-[18%] rounded-full bg-green-800/70 shadow-inner blur-[0.5px]" />

        {/* Shine */}
        <div className="absolute top-[10%] left-[10%] w-[30%] h-[15%] bg-white/10 rounded-[100%] blur-md -rotate-45" />
      </div>
    </div>
  );
};

const VolvoxSimulation = () => {
  // We need refs to access the DOM elements directly for performance (no re-renders)
  const itemsRef = useRef([]);
  const requestRef = useRef();

  // Configuration for the 3 organisms
  // Position (x,y), Velocity (vx,vy), Radius (r)
  const organisms = useRef([
    { x: 100, y: 100, vx: 0.5, vy: 0.5, r: 80, id: 0 },
    { x: 400, y: 200, vx: -0.5, vy: 0.8, r: 96, id: 1 }, // Slightly bigger
    { x: 200, y: 500, vx: 0.2, vy: -0.5, r: 72, id: 2 }, // Slightly smaller
  ]);

  const animate = () => {
    const orgs = organisms.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Physics Loop
    orgs.forEach((org, i) => {
      // --- Brownian Motion Aspect ---
      // Add small random random jitters to velocity
      org.vx += (Math.random() - 0.5) * 0.1;
      org.vy += (Math.random() - 0.5) * 0.1;

      // Friction (Damping) to stop them from accelerating infinitely
      org.vx *= 0.99;
      org.vy *= 0.99;

      // --- Interaction: Soft Repulsion between Volvoxes ---
      for (let j = 0; j < orgs.length; j++) {
        if (i === j) continue; // Don't check against self
        const other = orgs[j];

        const dx = other.x - org.x;
        const dy = other.y - org.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = org.r + other.r; // The touch radius

        // If they overlap or are very close
        if (distance < minDistance) {
          // Calculate repulsion angle
          const angle = Math.atan2(dy, dx);
          const force = 0.5; // Soft bounce force

          // Push current org away
          org.vx -= Math.cos(angle) * force;
          org.vy -= Math.sin(angle) * force;
        }
      }

      // --- Update Position ---
      org.x += org.vx;
      org.y += org.vy;

      // --- Boundary Collision (Bounce off walls) ---
      // We flip velocity and push them back inside to prevent sticking
      if (org.x < 0) {
        org.x = 0;
        org.vx *= -1;
      }
      if (org.x > width - org.r * 2) {
        org.x = width - org.r * 2;
        org.vx *= -1;
      }
      if (org.y < 0) {
        org.y = 0;
        org.vy *= -1;
      }
      if (org.y > height - org.r * 2) {
        org.y = height - org.r * 2;
        org.vy *= -1;
      }

      // --- Apply to DOM ---
      // This is much faster than React State for 60fps
      if (itemsRef.current[i]) {
        itemsRef.current[
          i
        ].style.transform = `translate3d(${org.x}px, ${org.y}px, 0)`;
      }
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden">
      {/* Background hint of water/depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950" />

      {organisms.current.map((org, index) => (
        <div
          key={org.id}
          ref={(el) => (itemsRef.current[index] = el)}
          className="absolute will-change-transform" // will-change optimizes rendering
          style={{
            width: org.r * 2,
            height: org.r * 2,
            // Initial render position (JS takes over immediately after)
            left: 0,
            top: 0,
          }}
        >
          <VolvoxGraphic />
        </div>
      ))}

      {/* Optional overlay text */}
      <div className="absolute bottom-5 right-5 text-green-500/30 text-sm font-mono pointer-events-none select-none">
        Volvox Simulation // Brownian Motion
      </div>
    </div>
  );
};

export default VolvoxSimulation;
