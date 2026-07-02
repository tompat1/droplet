import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, MeshTransmissionMaterial, Float, Sparkles } from '@react-three/drei';

import gsap from 'gsap';

function ProceduralDroplet() {
  const meshRef = useRef();

  // Scroll rotation effect
  useEffect(() => {
    const handleScroll = () => {
      if (meshRef.current) {
        const scrollY = window.scrollY;
        // Smoothly rotate based on scroll depth
        gsap.to(meshRef.current.rotation, {
          y: scrollY * 0.003,
          x: scrollY * 0.001,
          duration: 1.5,
          ease: 'power2.out',
        });
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useFrame((state) => {
    // Idle floating animation
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} position={[0, 0, 0]} scale={1.8}>
        {/* TorusKnot acts as a sleek, abstract representation resembling the connected R/d/p loops in the Droplet logo */}
        <torusKnotGeometry args={[1, 0.35, 256, 64]} />
        <MeshTransmissionMaterial 
          backside
          samples={4}
          thickness={1.5}
          chromaticAberration={0.05}
          anisotropy={0.2}
          distortion={0.3}
          distortionScale={0.4}
          temporalDistortion={0.1}
          iridescence={1}
          iridescenceIOR={1}
          iridescenceThicknessRange={[0, 1400]}
          color="#4B5EFA" 
          attenuationDistance={0.5}
          attenuationColor="#ffffff"
        />
      </mesh>
    </Float>
  );
}

export default function ThreeScene() {
  const containerRef = useRef(null);

  useEffect(() => {
    // The 3D scene container starts at opacity 0 and fades in as you scroll past the hero section
    const ctx = gsap.context(() => {
      gsap.to(containerRef.current, {
        opacity: 1,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: document.body,
          start: 'top -40%', // Start fading in after scrolling 40% of the viewport
          end: 'top -80%',   // Fully visible after 80%
          scrub: true,
        }
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -2, pointerEvents: 'none', opacity: 0 }}>
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#4B5EFA" />
        <directionalLight position={[-10, -10, -5]} intensity={0.8} color="#7928ca" />
        
        <ProceduralDroplet />
        
        <Sparkles count={80} scale={12} size={1.5} speed={0.4} opacity={0.3} color="#4B5EFA" />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
