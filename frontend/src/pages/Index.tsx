import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Index() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStart = () => {
    navigate('/select-industry');
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Cleanup Previous Canvas ---
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    // --- Three.js Setup ---
    const scene = new THREE.Scene();
    scene.background = null; // Use transparent background to show CSS gradients

    // Camera setup: Positioned to feel "immersed" but seeing the depth
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 0; // We will sit in the center

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    containerRef.current.appendChild(renderer.domElement);

    // --- Particle System ---
    const particleCount = 4000; // Increased density
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const randoms = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);

    // Volumetric Distribution (Spherical Cloud)
    for (let i = 0; i < particleCount; i++) {
      // Create a thick shell/volume instead of a thin surface
      // Radius varies from 4.0 to 12.0 to create deep layers
      const r = 5.0 + Math.random() * 10.0;

      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;

      const x = r * Math.cos(theta) * Math.sin(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      randoms[i] = Math.random();
      // vary size slightly per particle
      sizes[i] = 0.5 + Math.random() * 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    // --- Custom Shader Material ---
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x4285F4) }, // Google Blue
        uBaseSize: { value: 25.0 }, // Much larger base size
        uPixelRatio: { value: renderer.getPixelRatio() }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uBaseSize;
        uniform float uPixelRatio;
        attribute float aRandom;
        attribute float aSize;

        varying float vAlpha;

        void main() {
          vec3 pos = position;

          // Organic floating motion (Noise-like)
          float time = uTime * 0.3;

          // Independent movement for each particle
          pos.x += sin(time * 0.5 + aRandom * 10.0) * 0.2;
          pos.y += cos(time * 0.3 + aRandom * 20.0) * 0.2;
          pos.z += sin(time * 0.4 + aRandom * 30.0) * 0.2;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Size Attenuation: Particles closer to camera are much bigger
          // We clamp minimal size to avoid disappearing
          gl_PointSize = uBaseSize * aSize * uPixelRatio * (1.0 / -mvPosition.z);

          // Distance-based opacity (Fade out if too close or too far)
          float dist = length(mvPosition.xyz);
          // Soft fade for very close particles to avoid jarring clipping
          float alphaFade = smoothstep(0.5, 2.0, dist);

          vAlpha = (0.6 + 0.4 * sin(uTime + aRandom * 100.0)) * alphaFade;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;

        void main() {
          // Soft circular particle with gradient edge
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);

          if(dist > 0.5) discard;

          // Soften the edge
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

          gl_FragColor = vec4(uColor, vAlpha * alpha * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    const particles = new THREE.Points(geometry, material);
    const group = new THREE.Group();
    group.add(particles);
    scene.add(group);

    // --- Mouse Interaction (Subtle Parallax) ---
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // --- Animation Loop ---
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      clock.getDelta(); // Keep clock in sync

      // Update Uniforms
      material.uniforms.uTime.value = elapsedTime;

      // Smooth camera/particle rotation based on mouse
      targetRotationY = mouseX * 0.1;
      targetRotationX = mouseY * 0.1;

      // Lerp rotation for smoothness (Group handles the tilt)
      group.rotation.y += (targetRotationY - group.rotation.y) * 0.05;
      group.rotation.x += (targetRotationX - group.rotation.x) * 0.05;

      // Constant slow rotation (Particles handle the spin)
      particles.rotation.y += 0.0005;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    // --- Resize Handler ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">

      {/* --- Ambient Background (Fluid Gradients) --- */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-400/20 rounded-full blur-[100px] animate-fluid pointer-events-none mix-blend-multiply filter" />
      <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-purple-400/20 rounded-full blur-[100px] animate-fluid-reverse pointer-events-none mix-blend-multiply filter animation-delay-2000" />
      <div className="absolute bottom-[-20%] left-[20%] w-[45vw] h-[45vw] bg-cyan-400/20 rounded-full blur-[100px] animate-fluid pointer-events-none mix-blend-multiply filter animation-delay-4000" />

      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-auto" />

      {/* Gradient Overlay for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-white/50 z-0 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center relative z-10"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 text-slate-900 drop-shadow-sm">
            智简 · <span className="text-blue-600">SmartCV</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium">
            AI 赋能的简历优化专家，智能分析短板，一键生成专业简历。
          </p>
        </div>

        {/* 开始使用按钮 */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full text-lg font-semibold shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300"
        >
          开始使用
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </motion.div>

    </div>
  );
}
