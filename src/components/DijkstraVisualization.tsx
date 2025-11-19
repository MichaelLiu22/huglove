import { useEffect, useRef, useState } from 'react';

interface Node {
  id: number;
  x: number;
  y: number;
  distance: number;
  visited: boolean;
  previous: number | null;
  isStart: boolean;
  isEnd: boolean;
  exploring: boolean;
}

interface Edge {
  from: number;
  to: number;
  weight: number;
}

interface Particle {
  x: number;
  y: number;
  progress: number;
  speed: number;
}

type AnimationState = 'INIT' | 'EXPLORING' | 'FOUND' | 'PARTICLES';

export const DijkstraVisualization = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [statusText, setStatusText] = useState("正在智能分析所有可能路径...");
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = Math.min(500, window.innerHeight * 0.5);
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    const width = canvas.width;
    const height = canvas.height;

    // Generate nodes in street grid layout
    const nodes: Node[] = [];
    const gridRows = 5;
    const gridCols = 7;
    const nodeCount = gridRows * gridCols;
    
    const marginX = width * 0.1;
    const marginY = height * 0.15;
    const gridWidth = width - marginX * 2;
    const gridHeight = height - marginY * 2;
    const cellWidth = gridWidth / (gridCols - 1);
    const cellHeight = gridHeight / (gridRows - 1);

    let nodeId = 0;
    
    // Create grid nodes with slight random offsets for natural look
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const baseX = marginX + col * cellWidth;
        const baseY = marginY + row * cellHeight;
        
        // Add small random offset (except for start and end nodes)
        const isStart = row === 2 && col === 0;
        const isEnd = row === 2 && col === gridCols - 1;
        const offsetX = (isStart || isEnd) ? 0 : (Math.random() - 0.5) * cellWidth * 0.2;
        const offsetY = (isStart || isEnd) ? 0 : (Math.random() - 0.5) * cellHeight * 0.2;
        
        nodes.push({
          id: nodeId++,
          x: baseX + offsetX,
          y: baseY + offsetY,
          distance: isStart ? 0 : Infinity,
          visited: false,
          previous: null,
          isStart,
          isEnd,
          exploring: false
        });
      }
    }

    // Generate edges in street-like pattern (horizontal, vertical, and some diagonals)
    const edges: Edge[] = [];
    const adjacency: number[][] = Array(nodeCount).fill(0).map(() => []);

    const addEdge = (from: number, to: number) => {
      if (adjacency[from].includes(to)) return;
      const fromNode = nodes[from];
      const toNode = nodes[to];
      const dist = Math.sqrt((fromNode.x - toNode.x) ** 2 + (fromNode.y - toNode.y) ** 2);
      const weight = Math.round(dist * (0.9 + Math.random() * 0.2));
      edges.push({ from, to, weight });
      adjacency[from].push(to);
      adjacency[to].push(from);
    };

    // Connect grid nodes like a street network
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const currentIdx = row * gridCols + col;
        
        // Horizontal connections (streets going left-right)
        if (col < gridCols - 1) {
          addEdge(currentIdx, currentIdx + 1);
        }
        
        // Vertical connections (streets going up-down)
        if (row < gridRows - 1) {
          addEdge(currentIdx, currentIdx + gridCols);
        }
        
        // Some diagonal shortcuts (like diagonal streets in a city)
        if (row < gridRows - 1 && col < gridCols - 1 && Math.random() > 0.6) {
          addEdge(currentIdx, currentIdx + gridCols + 1);
        }
        
        if (row < gridRows - 1 && col > 0 && Math.random() > 0.6) {
          addEdge(currentIdx, currentIdx + gridCols - 1);
        }
      }
    }

    // Animation state
    let animationState: AnimationState = 'INIT';
    let currentTime = 0;
    let exploredCount = 0;
    let shortestPath: number[] = [];
    let particles: Particle[] = [];

    // Dijkstra simulation
    const unvisited: number[] = [0];
    const explorationOrder: number[] = [];

    const drawNode = (node: Node, pulsePhase: number) => {
      const nodeRadius = width < 600 ? 6 : 8;
      const largeRadius = width < 600 ? 10 : 12;

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.isStart || node.isEnd ? largeRadius : nodeRadius, 0, Math.PI * 2);

      if (node.isStart) {
        ctx.fillStyle = 'hsl(0, 80%, 60%)';
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'hsl(0, 80%, 60%)';
      } else if (node.isEnd) {
        ctx.fillStyle = 'hsl(220, 80%, 60%)';
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'hsl(220, 80%, 60%)';
      } else if (shortestPath.includes(node.id) && animationState === 'FOUND' || animationState === 'PARTICLES') {
        ctx.fillStyle = 'hsl(145, 70%, 50%)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'hsl(145, 70%, 50%)';
      } else if (node.exploring) {
        const scale = 1 + Math.sin(pulsePhase) * 0.2;
        ctx.arc(node.x, node.y, (nodeRadius * scale) * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'hsl(45, 90%, 60%)';
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'hsl(45, 90%, 60%)';
      } else if (node.visited) {
        ctx.fillStyle = 'hsl(270, 30%, 60%)';
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'hsl(0, 0%, 60%)';
        ctx.shadowBlur = 0;
      }

      ctx.fill();
      ctx.shadowBlur = 0;

      // Labels
      if (node.isStart || node.isEnd) {
        ctx.fillStyle = 'hsl(0, 0%, 100%)';
        ctx.font = `${width < 600 ? '10' : '12'}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.isStart ? 'A' : 'B', node.x, node.y);
      }
    };

    const drawEdge = (edge: Edge, isInPath: boolean, isExploring: boolean) => {
      const fromNode = nodes[edge.from];
      const toNode = nodes[edge.to];

      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);

      if (isInPath && (animationState === 'FOUND' || animationState === 'PARTICLES')) {
        ctx.strokeStyle = 'hsl(145, 70%, 50%)';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'hsl(145, 70%, 50%)';
      } else if (isExploring) {
        ctx.strokeStyle = 'hsl(45, 70%, 70%)';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = 'hsl(0, 0%, 70%)';
        ctx.lineWidth = 1;
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
    };

    const drawParticles = () => {
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'hsl(145, 90%, 70%)';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'hsl(145, 90%, 70%)';
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    };

    const animate = (timestamp: number) => {
      if (!ctx) return;

      const deltaTime = timestamp - currentTime;
      currentTime = timestamp;

      ctx.clearRect(0, 0, width, height);

      const pulsePhase = timestamp * 0.005;

    // State machine (faster initialization)
      if (animationState === 'INIT' && timestamp > 500) {
        animationState = 'EXPLORING';
        setStatusText("正在智能分析所有可能路径...");
      }

      if (animationState === 'EXPLORING') {
        // Simulate Dijkstra exploration every 80ms (faster)
        if (timestamp % 80 < deltaTime && unvisited.length > 0) {
          // Find node with minimum distance
          let minDist = Infinity;
          let minIndex = -1;
          unvisited.forEach(nodeId => {
            if (nodes[nodeId].distance < minDist) {
              minDist = nodes[nodeId].distance;
              minIndex = nodeId;
            }
          });

          if (minIndex !== -1) {
            const currentNode = nodes[minIndex];
            currentNode.exploring = true;
            explorationOrder.push(minIndex);

            // Update neighbors
            edges.forEach(edge => {
              if (edge.from === minIndex || edge.to === minIndex) {
                const neighborId = edge.from === minIndex ? edge.to : edge.from;
                const newDist = currentNode.distance + edge.weight;
                if (newDist < nodes[neighborId].distance) {
                  nodes[neighborId].distance = newDist;
                  nodes[neighborId].previous = minIndex;
                  if (!unvisited.includes(neighborId)) {
                    unvisited.push(neighborId);
                  }
                }
              }
            });

            // Mark as visited after a short delay
            setTimeout(() => {
              currentNode.exploring = false;
              currentNode.visited = true;
              exploredCount++;
              setStatusText(`计算中：已探索 ${exploredCount}/${nodeCount} 个节点`);
            }, 60);

            unvisited.splice(unvisited.indexOf(minIndex), 1);

            // Check if we reached the end (find the end node)
            const endNodeId = nodes.findIndex(n => n.isEnd);
            if (minIndex === endNodeId) {
              setTimeout(() => {
                animationState = 'FOUND';
                // Reconstruct path
                let current: number | null = endNodeId;
                shortestPath = [];
                while (current !== null) {
                  shortestPath.unshift(current);
                  current = nodes[current].previous;
                }
                const totalDist = Math.round(nodes[endNodeId].distance);
                setStatusText(`✓ 找到最优路径！总距离 ${totalDist} 米`);

                // Initialize particles (more for visual effect)
                particles = Array(16).fill(0).map((_, i) => ({
                  x: nodes[shortestPath[0]].x,
                  y: nodes[shortestPath[0]].y,
                  progress: i * 0.06,
                  speed: 0.02 + Math.random() * 0.015
                }));

                setTimeout(() => {
                  animationState = 'PARTICLES';
                  setStatusText(`相比其他路线节省 28% 时间`);
                }, 600);
              }, 300);
            }
          }
        }
      }

      if (animationState === 'PARTICLES') {
        // Update particles
        particles.forEach(p => {
          p.progress += p.speed;
          if (p.progress > 1) p.progress = 0;

          // Interpolate position along path
          const segmentCount = shortestPath.length - 1;
          const totalProgress = p.progress * segmentCount;
          const segmentIndex = Math.floor(totalProgress);
          const segmentProgress = totalProgress - segmentIndex;

          if (segmentIndex < shortestPath.length - 1) {
            const fromNode = nodes[shortestPath[segmentIndex]];
            const toNode = nodes[shortestPath[segmentIndex + 1]];
            p.x = fromNode.x + (toNode.x - fromNode.x) * segmentProgress;
            p.y = fromNode.y + (toNode.y - fromNode.y) * segmentProgress;
          }
        });
      }

      // Draw edges
      edges.forEach(edge => {
        const isInPath = shortestPath.includes(edge.from) && 
                        shortestPath.includes(edge.to) &&
                        (nodes[edge.from].previous === edge.to || nodes[edge.to].previous === edge.from);
        const isExploring = nodes[edge.from].exploring || nodes[edge.to].exploring;
        drawEdge(edge, isInPath, isExploring);
      });

      // Draw nodes
      nodes.forEach(node => drawNode(node, pulsePhase));

      // Draw particles
      if (animationState === 'PARTICLES') {
        drawParticles();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    <div className="relative w-full">
      <canvas 
        ref={canvasRef} 
        className="w-full rounded-lg bg-background/50 border border-border"
        style={{ maxHeight: '500px' }}
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
        <p className="text-sm font-medium text-foreground">{statusText}</p>
      </div>
    </div>
  );
};
