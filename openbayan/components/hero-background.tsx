"use client"

import { motion } from "motion/react"
import { useEffect, useState } from "react"

type Node = { 
  id: number; 
  x: number; 
  y: number; 
  vx: number; 
  vy: number; 
  size: number; 
  delay: number 
}

type Edge = { 
  id: string; 
  fromId: number; 
  toId: number; 
  delay: number; 
  duration: number 
}

export function HeroBackground() {
  const [mounted, setMounted] = useState(false)
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  useEffect(() => {
    // Generate scattered nodes across the view with initial velocities
    const newNodes: Node[] = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: 5 + Math.random() * 90,
      y: 5 + Math.random() * 90,
      vx: (Math.random() - 0.5) * 0.02, // Very slow movement
      vy: (Math.random() - 0.5) * 0.02,
      size: Math.random() * 2 + 1.5,
      delay: Math.random() * 5,
    }))

    // Create interconnected edges for nodes that are close to each other
    const newEdges: Edge[] = []
    for (let i = 0; i < newNodes.length; i++) {
      for (let j = i + 1; j < newNodes.length; j++) {
        const dx = newNodes[i].x - newNodes[j].x
        const dy = newNodes[i].y - newNodes[j].y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 25) {
          if (Math.random() > 0.3) {
            newEdges.push({
              id: `${i}-${j}`,
              fromId: newNodes[i].id,
              toId: newNodes[j].id,
              delay: Math.random() * 4,
              duration: Math.random() * 8 + 8,
            })
          }
        }
      }
    }

    setNodes(newNodes)
    setEdges(newEdges)
    setMounted(true)

    // Animation loop for slow drifting nodes
    let animationFrame: number;
    const updatePositions = () => {
      setNodes(currentNodes => 
        currentNodes.map(node => {
          let nextX = node.x + node.vx;
          let nextY = node.y + node.vy;
          let nextVx = node.vx;
          let nextVy = node.vy;

          // Bounce off boundaries
          if (nextX < 2 || nextX > 98) nextVx *= -1;
          if (nextY < 2 || nextY > 98) nextVy *= -1;

          return { ...node, x: nextX, y: nextY, vx: nextVx, vy: nextVy };
        })
      );
      animationFrame = requestAnimationFrame(updatePositions);
    };

    animationFrame = requestAnimationFrame(updatePositions);

    return () => cancelAnimationFrame(animationFrame);
  }, [])

  if (!mounted) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-background">
      {/* Soft subtle background glow */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, color-mix(in oklab, var(--primary) 5%, transparent), transparent 70%)'
        }}
      />

      {/* SVG Network Graph */}
      <svg className="absolute inset-0 w-full h-full opacity-40">
        {/* Render edges (connections) */}
        {edges.map((edge) => {
          const fromNode = nodes.find(n => n.id === edge.fromId);
          const toNode = nodes.find(n => n.id === edge.toId);
          
          if (!fromNode || !toNode) return null;

          return (
            <motion.line
              key={edge.id}
              x1={`${fromNode.x}%`}
              y1={`${fromNode.y}%`}
              x2={`${toNode.x}%`}
              y2={`${toNode.y}%`}
              stroke="var(--chart-2)"
              strokeWidth="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: [0, 1, 1, 0], 
                opacity: [0, 0.8, 0.8, 0] 
              }}
              transition={{
                duration: edge.duration,
                repeat: Infinity,
                delay: edge.delay,
                ease: "easeInOut",
              }}
            />
          );
        })}

        {/* Render nodes (data points) */}
        {nodes.map((node) => (
          <g key={node.id}>
            {/* Animated aura — opacity only via Framer Motion, r via CSS animation */}
            <motion.circle
              cx={`${node.x}%`}
              cy={`${node.y}%`}
              r={node.size * 3}
              fill="var(--sidebar-primary)"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: [0.6, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: node.delay,
                ease: "easeOut",
              }}
            />
            {/* Core solid node */}
            <circle
              cx={`${node.x}%`}
              cy={`${node.y}%`}
              r={node.size ?? 2}
              fill="var(--sidebar-primary)"
            />
          </g>
        ))}
      </svg>

      {/* Fade out bottom edge to blend with page content */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
    </div>
  )
}
