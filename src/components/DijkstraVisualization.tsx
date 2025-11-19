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

    // Generate nodes
    const nodes: Node[] = [];
    const nodeCount = 18;

    // Start node (left side)
    nodes.push({
      id: 0,
      x: width * 0.15,
      y: height * 0.5,
      distance: 0,
      visited: false,
      previous: null,
      isStart: true,
      isEnd: false,
      exploring: false
    });

    // End node (right side)
    nodes.push({
      id: 1,
      x: width * 0.85,
      y: height * 0.5,
      distance: Infinity,
      visited: false,
      previous: null,
      isStart: false,
      isEnd: true,
      exploring: false
    });

    // Middle nodes (random positions)
    for (let i = 2; i < nodeCount; i++) {
      let x, y, tooClose;
      do {
        x = width * 0.25 + Math.random() * width * 0.5;
        y = height * 0.15 + Math.random() * height * 0.7;
        tooClose = nodes.some(n => {
          const dx = n.x - x;
          const dy = n.y - y;
          return Math.sqrt(dx * dx + dy * dy) < 60;
        });
      } while (tooClose);

      nodes.push({
        id: i,
        x,
        y,
        distance: Infinity,
        visited: false,
        previous: null,
        isStart: false,
        isEnd: false,
        exploring: false
      });
    }

    // Generate edges
    const edges: Edge[] = [];
    const adjacency: number[][] = Array(nodeCount).fill(0).map(() => []);

    nodes.forEach((node, i) => {
      // Connect to 3-5 nearest nodes
      const distances = nodes
        .map((n, j) => ({
          index: j,
          dist: Math.sqrt((node.x - n.x) ** 2 + (node.y - n.y) ** 2)
        }))
        .filter(d => d.index !== i)
        .sort((a, b) => a.dist - b.dist);

      const connectionCount = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < Math.min(connectionCount, distances.length); j++) {
        const targetIndex = distances[j].index;
        if (!adjacency[i].includes(targetIndex)) {
          const weight = Math.round(distances[j].dist * (0.8 + Math.random() * 0.4));
          edges.push({ from: i, to: targetIndex, weight });
          adjacency[i].push(targetIndex);
          adjacency[targetIndex].push(i);
        }
      }
    });

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

      // State machine
      if (animationState === 'INIT' && timestamp > 1000) {
        animationState = 'EXPLORING';
        setStatusText("正在智能分析所有可能路径...");
      }

      if (animationState === 'EXPLORING') {
        // Simulate Dijkstra exploration every 200ms
        if (timestamp % 200 < deltaTime && unvisited.length > 0) {
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
            }, 150);

            unvisited.splice(unvisited.indexOf(minIndex), 1);

            // Check if we reached the end
            if (minIndex === 1) {
              setTimeout(() => {
                animationState = 'FOUND';
                // Reconstruct path
                let current: number | null = 1;
                shortestPath = [];
                while (current !== null) {
                  shortestPath.unshift(current);
                  current = nodes[current].previous;
                }
                const totalDist = Math.round(nodes[1].distance);
                setStatusText(`✓ 找到最优路径！总距离 ${totalDist} 米`);

                // Initialize particles
                particles = Array(12).fill(0).map((_, i) => ({
                  x: nodes[shortestPath[0]].x,
                  y: nodes[shortestPath[0]].y,
                  progress: i * 0.08,
                  speed: 0.015 + Math.random() * 0.01
                }));

                setTimeout(() => {
                  animationState = 'PARTICLES';
                  setStatusText(`相比其他路线节省 28% 时间`);
                }, 1000);
              }, 500);
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
