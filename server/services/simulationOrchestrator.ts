import { type NetworkState, type Intersection, type Vehicle, type Road, type RouteSegment, type NetworkMetrics, type SystemEvent, type IncomingPlatoon, type Position } from "@shared/schema";
import { AIEngine } from "./aiEngine";
import { randomUUID } from "crypto";

// Intersection queue data structure for managing vehicles waiting at each approach
interface IntersectionQueues {
  north: string[]; // Vehicle IDs waiting to go north
  east: string[];  // Vehicle IDs waiting to go east
  south: string[]; // Vehicle IDs waiting to go south
  west: string[];  // Vehicle IDs waiting to go west
}

/**
 * SimulationOrchestrator manages a multi-intersection traffic network with:
 * - Per-node AI engines for each intersection
 * - Vehicle spawning, routing, and movement
 * - Network-wide coordination and optimization
 * - Real-time state updates for visualization
 */
export class SimulationOrchestrator {
  private aiEngines: Map<string, AIEngine> = new Map();
  private intersectionQueues: Map<string, IntersectionQueues> = new Map();
  private simulationInterval?: NodeJS.Timeout;
  private currentTime = 0;
  private lastVehicleSpawn = 0;
  private vehicleSpawnRate = 5000; // milliseconds between spawns
  
  constructor(private onStateUpdate: (state: NetworkState) => void) {}
  
  /**
   * Initialize the orchestrator with a network state
   */
  async start(initialState: NetworkState): Promise<void> {
    this.stop();
    
    // Initialize AI engines and queues for each intersection
    Object.keys(initialState.intersections).forEach(intersectionId => {
      this.aiEngines.set(intersectionId, new AIEngine());
      this.intersectionQueues.set(intersectionId, {
        north: [],
        east: [],
        south: [],
        west: []
      });
    });
    
    // Start simulation loop at 10Hz for smooth real-time updates
    const updateInterval = 1000 / 10; // 100ms intervals
    this.simulationInterval = setInterval(() => {
      this.simulationStep(initialState);
    }, updateInterval / initialState.simulationSpeed);
  }
  
  /**
   * Stop the simulation
   */
  stop(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = undefined;
    }
    this.aiEngines.clear();
    this.intersectionQueues.clear();
  }
  
  /**
   * Main simulation step - orchestrates all network updates
   */
  private async simulationStep(state: NetworkState): Promise<void> {
    this.currentTime += 100; // 100ms increment
    
    // 1. Spawn new vehicles periodically
    if (this.currentTime - this.lastVehicleSpawn > this.vehicleSpawnRate) {
      this.spawnRandomVehicles(state);
      this.lastVehicleSpawn = this.currentTime;
    }
    
    // 2. Update vehicle positions and routing
    await this.updateVehicleMovement(state);
    
    // 3. Apply AI decisions per intersection
    await this.updateIntersectionAI(state);
    
    // 4. Apply network coordination strategies
    await this.applyNetworkCoordination(state);
    
    // 5. Update traffic signals based on AI + coordination
    this.updateTrafficSignals(state);
    
    // 6. Calculate updated network metrics
    state.networkMetrics = this.calculateNetworkMetrics(state);
    
    // 7. Generate system events
    this.generateSystemEvents(state);
    
    // 8. Update timestamp and broadcast
    state.timestamp = Date.now();
    this.onStateUpdate(state);
  }
  
  /**
   * Spawn random vehicles at network edges
   */
  private spawnRandomVehicles(state: NetworkState): void {
    const intersectionIds = Object.keys(state.intersections);
    if (intersectionIds.length === 0) return;
    
    // Spawn 1-3 vehicles per cycle
    const spawnCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < spawnCount; i++) {
      const startId = intersectionIds[Math.floor(Math.random() * intersectionIds.length)];
      const endId = intersectionIds[Math.floor(Math.random() * intersectionIds.length)];
      
      if (startId !== endId) {
        const vehicle = this.createVehicle(startId, endId, state);
        state.vehicles[vehicle.id] = vehicle;
      }
    }
  }
  
  /**
   * Create a new vehicle with calculated route
   */
  private createVehicle(startIntersectionId: string, destinationId: string, state: NetworkState): Vehicle {
    const startIntersection = state.intersections[startIntersectionId];
    const vehicleTypes = ['car', 'truck', 'bus', 'motorcycle'] as const;
    const priorities = ['normal', 'emergency', 'public_transport'] as const;
    
    // Calculate route using Dijkstra's algorithm
    const route = this.calculateRoute(startIntersectionId, destinationId, state);
    
    return {
      id: randomUUID(),
      currentRoadId: null,
      currentIntersectionId: startIntersectionId,
      destinationIntersectionId: destinationId,
      route,
      routeProgress: 0,
      speed: Math.floor(Math.random() * 20) + 40, // 40-60 km/h
      position: { ...startIntersection.position },
      waitTime: 0,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
    };
  }
  
  /**
   * Calculate optimal route between intersections using Dijkstra's algorithm
   */
  private calculateRoute(startId: string, endId: string, state: NetworkState): RouteSegment[] {
    const intersections = Object.values(state.intersections);
    const roads = Object.values(state.roads);
    
    // Build adjacency map
    const adjacency = new Map<string, Array<{roadId: string, toId: string, weight: number}>>();
    
    intersections.forEach(intersection => {
      adjacency.set(intersection.id, []);
    });
    
    roads.forEach(road => {
      const weight = road.length / road.speedLimit + (road.currentFlow / road.capacity) * 10; // Distance + congestion factor
      adjacency.get(road.fromIntersectionId)?.push({
        roadId: road.id,
        toId: road.toIntersectionId,
        weight
      });
    });
    
    // Dijkstra's algorithm
    const distances = new Map<string, number>();
    const previous = new Map<string, {roadId: string, fromId: string} | null>();
    const unvisited = new Set<string>();
    
    intersections.forEach(intersection => {
      distances.set(intersection.id, intersection.id === startId ? 0 : Infinity);
      previous.set(intersection.id, null);
      unvisited.add(intersection.id);
    });
    
    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let current = '';
      let minDistance = Infinity;
      
      for (const node of Array.from(unvisited)) {
        const distance = distances.get(node) || Infinity;
        if (distance < minDistance) {
          minDistance = distance;
          current = node;
        }
      }
      
      if (current === endId) break;
      if (minDistance === Infinity) break;
      
      unvisited.delete(current);
      
      // Check neighbors
      const neighbors = adjacency.get(current) || [];
      for (const neighbor of neighbors) {
        const alt = minDistance + neighbor.weight;
        const currentDistance = distances.get(neighbor.toId) || Infinity;
        
        if (alt < currentDistance) {
          distances.set(neighbor.toId, alt);
          previous.set(neighbor.toId, {roadId: neighbor.roadId, fromId: current});
        }
      }
    }
    
    // Reconstruct path
    const route: RouteSegment[] = [];
    let currentNode = endId;
    
    while (previous.get(currentNode)) {
      const prev = previous.get(currentNode)!;
      const road = roads.find(r => r.id === prev.roadId)!;
      
      route.unshift({
        roadId: road.id,
        fromIntersectionId: prev.fromId,
        toIntersectionId: currentNode,
        distanceRemaining: road.length,
      });
      
      currentNode = prev.fromId;
    }
    
    return route;
  }
  
  /**
   * Update vehicle movement and handle transitions
   */
  private async updateVehicleMovement(state: NetworkState): Promise<void> {
    const deltaTime = 0.1; // 100ms in seconds
    
    Object.values(state.vehicles).forEach(vehicle => {
      if (vehicle.route.length === 0) {
        // Vehicle reached destination - remove it
        delete state.vehicles[vehicle.id];
        return;
      }
      
      // Handle vehicles currently at intersections (waiting in queue)
      if (vehicle.currentIntersectionId) {
        const intersection = state.intersections[vehicle.currentIntersectionId];
        if (intersection) {
          // Check if queued vehicle can now proceed
          const canProceed = this.canVehicleProceedThroughIntersection(vehicle, intersection, state);
          if (canProceed) {
            // Vehicle can leave intersection and continue on route
            this.dequeueVehicleFromIntersection(vehicle, intersection.id);
            vehicle.currentIntersectionId = null;
            // Don't increment wait time when proceeding
          } else {
            // Vehicle still waiting at intersection
            vehicle.waitTime += deltaTime;
            // Ensure vehicle is properly queued
            this.enqueueVehicleAtIntersection(vehicle, intersection.id, state);
          }
        }
        return; // Skip movement for queued vehicles
      }
      
      // Handle vehicles moving along roads
      const currentSegment = vehicle.route[0];
      const road = state.roads[currentSegment.roadId];
      
      if (!road) return;
      
      // Calculate movement distance
      const speedMS = (vehicle.speed * 1000) / 3600; // Convert km/h to m/s
      let movementDistance = speedMS * deltaTime;
      
      // Check if approaching intersection - slow down and check signals
      const approachingIntersection = currentSegment.distanceRemaining <= movementDistance * 2; // Deceleration zone
      
      if (approachingIntersection) {
        const toIntersection = state.intersections[currentSegment.toIntersectionId];
        if (toIntersection) {
          // Check if can proceed through upcoming intersection
          const canProceed = this.canVehicleProceedThroughIntersection(vehicle, toIntersection, state);
          if (!canProceed) {
            // Stop before intersection (red light)
            movementDistance = 0;
            vehicle.waitTime += deltaTime;
          }
        }
      }
      
      // Update position along road
      currentSegment.distanceRemaining -= movementDistance;
      vehicle.routeProgress = 1 - (currentSegment.distanceRemaining / road.length);
      
      // Update vehicle position
      const fromIntersection = state.intersections[currentSegment.fromIntersectionId];
      const toIntersection = state.intersections[currentSegment.toIntersectionId];
      
      if (fromIntersection && toIntersection) {
        const progress = vehicle.routeProgress;
        vehicle.position.x = fromIntersection.position.x + (toIntersection.position.x - fromIntersection.position.x) * progress;
        vehicle.position.y = fromIntersection.position.y + (toIntersection.position.y - fromIntersection.position.y) * progress;
      }
      
      // Check if reached intersection
      if (currentSegment.distanceRemaining <= 0) {
        const intersection = state.intersections[currentSegment.toIntersectionId];
        if (intersection) {
          const canProceed = this.canVehicleProceedThroughIntersection(vehicle, intersection, state);
          if (canProceed) {
            // Vehicle can proceed through intersection - complete segment
            vehicle.route.shift();
            vehicle.currentIntersectionId = null;
            vehicle.currentRoadId = null;
            vehicle.routeProgress = 0;
          } else {
            // Vehicle must stop at intersection - add to queue
            vehicle.route.shift(); // Complete the road segment
            vehicle.currentIntersectionId = currentSegment.toIntersectionId;
            vehicle.currentRoadId = null;
            vehicle.routeProgress = 0;
            this.enqueueVehicleAtIntersection(vehicle, intersection.id, state);
            vehicle.waitTime += deltaTime;
          }
        }
      } else {
        vehicle.currentRoadId = currentSegment.roadId;
        vehicle.currentIntersectionId = null;
      }
      
      // Update road occupancy
      this.updateRoadOccupancy(road, state);
    });
  }
  
  /**
   * Update road occupancy based on vehicles currently on the road
   */
  private updateRoadOccupancy(road: Road, state: NetworkState): void {
    // Count vehicles currently on this road
    const vehiclesOnRoad = Object.values(state.vehicles).filter(vehicle => 
      vehicle.currentRoadId === road.id
    );
    
    // Calculate current flow as percentage of capacity
    road.currentFlow = Math.min(vehiclesOnRoad.length, road.capacity);
    
    // Update travel time based on congestion
    const congestionFactor = road.currentFlow / road.capacity;
    const baseTravelTime = (road.length / 1000) / (road.speedLimit / 3.6); // Base time at speed limit
    road.travelTime = baseTravelTime * (1 + congestionFactor * 2); // Increase with congestion
  }

  /**
   * Add vehicle to appropriate intersection queue based on intended direction
   */
  private enqueueVehicleAtIntersection(vehicle: Vehicle, intersectionId: string, state: NetworkState): void {
    if (vehicle.route.length === 0) return;
    
    const nextSegment = vehicle.route[0];
    const nextRoad = state.roads[nextSegment.roadId];
    if (!nextRoad) return;
    
    const queues = this.intersectionQueues.get(intersectionId);
    if (!queues) return;
    
    const direction = nextRoad.direction;
    
    // Add vehicle to appropriate directional queue if not already queued
    if (!queues[direction].includes(vehicle.id)) {
      queues[direction].push(vehicle.id);
    }
  }
  
  /**
   * Remove vehicle from intersection queue
   */
  private dequeueVehicleFromIntersection(vehicle: Vehicle, intersectionId: string): void {
    const queues = this.intersectionQueues.get(intersectionId);
    if (!queues) return;
    
    // Remove vehicle from all queues (in case of queue transfers)
    Object.keys(queues).forEach(direction => {
      const queue = queues[direction as keyof IntersectionQueues];
      const index = queue.indexOf(vehicle.id);
      if (index >= 0) {
        queue.splice(index, 1);
      }
    });
  }
  
  /**
   * Process queued vehicles when signal phase changes
   */
  private processIntersectionQueues(intersection: Intersection, state: NetworkState): void {
    const queues = this.intersectionQueues.get(intersection.id);
    if (!queues) return;
    
    let allowedDirections: string[] = [];
    
    // Determine which directions are allowed based on current signal phase
    if (intersection.signalState.currentPhase === 'NS' && intersection.signalState.northSouth === 'green') {
      allowedDirections = ['north', 'south'];
    } else if (intersection.signalState.currentPhase === 'EW' && intersection.signalState.eastWest === 'green') {
      allowedDirections = ['east', 'west'];
    }
    
    // Process vehicles in allowed directions (let them proceed)
    allowedDirections.forEach(direction => {
      const queue = queues[direction as keyof IntersectionQueues];
      
      // Process vehicles in queue (FIFO)
      const vehiclesToProcess = [...queue]; // Make a copy to avoid modification during iteration
      vehiclesToProcess.forEach(vehicleId => {
        const vehicle = state.vehicles[vehicleId];
        if (vehicle && vehicle.currentIntersectionId === intersection.id) {
          // Allow vehicle to proceed
          this.dequeueVehicleFromIntersection(vehicle, intersection.id);
        }
      });
    });
  }

  /**
   * Check if vehicle can proceed through intersection based on signal state
   */
  private canVehicleProceedThroughIntersection(vehicle: Vehicle, intersection: Intersection, state: NetworkState): boolean {
    if (vehicle.route.length === 0) return true; // At destination
    
    // Emergency vehicles can always proceed (with priority)
    if (vehicle.priority === 'emergency') return true;
    
    const nextSegment = vehicle.route[0];
    const nextRoad = state.roads[nextSegment.roadId];
    
    if (!nextRoad) return false; // Road not found, can't proceed
    
    // Determine if vehicle's intended direction aligns with current signal phase
    const roadDirection = nextRoad.direction;
    const signalState = intersection.signalState;
    
    // Check if vehicle's direction is allowed by current signal phase
    let canProceed = false;
    
    if (signalState.currentPhase === 'NS') {
      // North-South phase is active (green for N/S, red for E/W)
      canProceed = (roadDirection === 'north' || roadDirection === 'south') && 
                   signalState.northSouth === 'green';
    } else {
      // East-West phase is active (green for E/W, red for N/S)
      canProceed = (roadDirection === 'east' || roadDirection === 'west') && 
                   signalState.eastWest === 'green';
    }
    
    // Don't proceed if signal is yellow (transitioning)
    if (signalState.northSouth === 'yellow' || signalState.eastWest === 'yellow') {
      canProceed = false;
    }
    
    return canProceed;
  }
  
  /**
   * Update AI decisions for each intersection
   */
  private async updateIntersectionAI(state: NetworkState): Promise<void> {
    Object.values(state.intersections).forEach(intersection => {
      const aiEngine = this.aiEngines.get(intersection.id);
      if (!aiEngine) return;
      
      // Convert vehicles near intersection to platoons
      const incomingPlatoons = this.calculateIncomingPlatoons(intersection, state);
      intersection.incomingPlatoons = incomingPlatoons;
      
      // Get AI decision
      const aiDecision = aiEngine.makeDecision(
        incomingPlatoons,
        intersection.signalState,
        true
      );
      
      aiDecision.intersectionId = intersection.id;
      intersection.aiDecision = aiDecision;
    });
  }
  
  /**
   * Calculate incoming platoons for an intersection based on nearby vehicles
   */
  private calculateIncomingPlatoons(intersection: Intersection, state: NetworkState): IncomingPlatoon[] {
    const platoons: IncomingPlatoon[] = [];
    const directions: Array<'north' | 'east' | 'south' | 'west'> = ['north', 'east', 'south', 'west'];
    
    directions.forEach(direction => {
      const vehiclesInDirection = Object.values(state.vehicles).filter(vehicle => {
        if (vehicle.currentIntersectionId === intersection.id) return true;
        
        // Check if vehicle is approaching this intersection
        if (vehicle.route.length > 0) {
          const nextSegment = vehicle.route[0];
          return nextSegment.toIntersectionId === intersection.id;
        }
        
        return false;
      });
      
      if (vehiclesInDirection.length > 0) {
        const avgSpeed = vehiclesInDirection.reduce((sum, v) => sum + v.speed, 0) / vehiclesInDirection.length;
        const avgETA = vehiclesInDirection.reduce((sum, v) => {
          if (v.currentIntersectionId === intersection.id) return sum;
          const segment = v.route[0];
          return sum + (segment?.distanceRemaining || 0) / (v.speed / 3.6); // Convert km/h to m/s
        }, 0) / vehiclesInDirection.length;
        
        platoons.push({
          direction,
          vehicleCount: vehiclesInDirection.length,
          eta: Math.max(1, avgETA),
          speed: avgSpeed,
        });
      }
    });
    
    return platoons;
  }
  
  /**
   * Apply network-wide coordination strategies
   */
  private async applyNetworkCoordination(state: NetworkState): Promise<void> {
    // Implement green-wave coordination
    this.applyGreenWaveCoordination(state);
    
    // Apply corridor pressure management
    this.applyCOrridorPressureManagement(state);
  }
  
  /**
   * Implement green-wave coordination for better flow
   */
  private applyGreenWaveCoordination(state: NetworkState): void {
    const intersections = Object.values(state.intersections);
    
    // Find intersections that could benefit from coordination
    intersections.forEach(intersection => {
      const connectedIntersections = this.getConnectedIntersections(intersection.id, state);
      
      connectedIntersections.forEach(connectedId => {
        const connected = state.intersections[connectedId];
        if (!connected) return;
        
        // Calculate optimal offset for green wave
        const distance = this.calculateDistance(intersection.position, connected.position);
        const travelTime = distance / (50 / 3.6); // Assume 50 km/h average speed
        
        // Adjust timing if beneficial
        if (intersection.aiDecision.recommendedAction === connected.aiDecision.recommendedAction) {
          // Both want same phase - coordinate timing
          const timeDiff = Math.abs(intersection.signalState.phaseTimeRemaining - connected.signalState.phaseTimeRemaining);
          if (timeDiff > travelTime * 0.8 && timeDiff < travelTime * 1.2) {
            // Good candidate for coordination
            intersection.aiDecision.timingPlan.duration += 5; // Extend phase slightly
          }
        }
      });
    });
  }
  
  /**
   * Apply corridor pressure management
   */
  private applyCOrridorPressureManagement(state: NetworkState): void {
    const intersections = Object.values(state.intersections);
    
    intersections.forEach(intersection => {
      const corridorPressure = this.calculateCorridorPressure(intersection, state);
      
      // Adjust AI recommendations based on corridor pressure
      if (corridorPressure.northSouth > 2.0 && intersection.aiDecision.recommendedAction !== 'NS') {
        intersection.aiDecision.recommendedAction = 'NS';
        intersection.aiDecision.timingPlan.duration = Math.max(30, intersection.aiDecision.timingPlan.duration);
      } else if (corridorPressure.eastWest > 2.0 && intersection.aiDecision.recommendedAction !== 'EW') {
        intersection.aiDecision.recommendedAction = 'EW';
        intersection.aiDecision.timingPlan.duration = Math.max(30, intersection.aiDecision.timingPlan.duration);
      }
      
      // Update pressure analysis in AI decision
      intersection.aiDecision.pressureAnalysis = corridorPressure;
    });
  }
  
  /**
   * Calculate corridor pressure for an intersection
   */
  private calculateCorridorPressure(intersection: Intersection, state: NetworkState): {northSouth: number, eastWest: number} {
    const nsVehicles = Object.values(state.vehicles).filter(v => {
      if (v.currentIntersectionId === intersection.id) return true;
      return v.route.some(segment => segment.toIntersectionId === intersection.id);
    }).filter(v => {
      // Determine if vehicle is coming from N/S direction
      const road = v.currentRoadId ? state.roads[v.currentRoadId] : null;
      return road && (road.direction === 'north' || road.direction === 'south');
    });
    
    const ewVehicles = Object.values(state.vehicles).filter(v => {
      if (v.currentIntersectionId === intersection.id) return true;
      return v.route.some(segment => segment.toIntersectionId === intersection.id);
    }).filter(v => {
      // Determine if vehicle is coming from E/W direction
      const road = v.currentRoadId ? state.roads[v.currentRoadId] : null;
      return road && (road.direction === 'east' || road.direction === 'west');
    });
    
    return {
      northSouth: nsVehicles.length * 0.5 + nsVehicles.reduce((sum, v) => sum + v.waitTime, 0) * 0.1,
      eastWest: ewVehicles.length * 0.5 + ewVehicles.reduce((sum, v) => sum + v.waitTime, 0) * 0.1,
    };
  }
  
  /**
   * Get intersections connected to the given intersection
   */
  private getConnectedIntersections(intersectionId: string, state: NetworkState): string[] {
    const connected: string[] = [];
    
    Object.values(state.roads).forEach(road => {
      if (road.fromIntersectionId === intersectionId) {
        connected.push(road.toIntersectionId);
      } else if (road.toIntersectionId === intersectionId) {
        connected.push(road.fromIntersectionId);
      }
    });
    
    return Array.from(new Set(connected)); // Remove duplicates
  }
  
  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Update traffic signals based on AI decisions and coordination
   */
  private updateTrafficSignals(state: NetworkState): void {
    Object.values(state.intersections).forEach(intersection => {
      const aiDecision = intersection.aiDecision;
      const previousPhase = intersection.signalState.currentPhase;
      
      // Update phase time
      intersection.signalState.phaseTimeRemaining = Math.max(0, intersection.signalState.phaseTimeRemaining - 0.1);
      
      // Check if should change phase
      if (aiDecision.recommendedAction !== 'HOLD' && 
          aiDecision.recommendedAction !== intersection.signalState.currentPhase &&
          aiDecision.guardianChecks.minGreenTime &&
          intersection.signalState.phaseTimeRemaining <= 0) {
        
        // Switch phase
        if (aiDecision.recommendedAction === 'NS') {
          intersection.signalState.northSouth = 'green';
          intersection.signalState.eastWest = 'red';
          intersection.signalState.currentPhase = 'NS';
        } else {
          intersection.signalState.northSouth = 'red';
          intersection.signalState.eastWest = 'green';
          intersection.signalState.currentPhase = 'EW';
        }
        
        intersection.signalState.phaseTimeRemaining = aiDecision.timingPlan.duration;
        intersection.signalState.nextPhaseTime = aiDecision.timingPlan.endTime;
        
        // Process queued vehicles when signal changes
        this.processIntersectionQueues(intersection, state);
      }
      
      // Update intersection metrics with current queue data
      this.updateIntersectionMetrics(intersection, state);
    });
  }
  
  /**
   * Update intersection metrics based on current queue data
   */
  private updateIntersectionMetrics(intersection: Intersection, state: NetworkState): void {
    const queues = this.intersectionQueues.get(intersection.id);
    if (!queues) return;
    
    // Update individual queue lengths
    intersection.metrics.northQueue = queues.north.length;
    intersection.metrics.eastQueue = queues.east.length;
    intersection.metrics.southQueue = queues.south.length;
    intersection.metrics.westQueue = queues.west.length;
    
    // Calculate total queue length and metrics
    const totalQueueLength = queues.north.length + queues.east.length + queues.south.length + queues.west.length;
    intersection.metrics.totalQueueLength = totalQueueLength;
    
    // Calculate average wait time for vehicles at this intersection
    const queuedVehicleIds = [...queues.north, ...queues.east, ...queues.south, ...queues.west];
    let totalWaitTime = 0;
    let queuedVehicleCount = 0;
    
    queuedVehicleIds.forEach(vehicleId => {
      const vehicle = state.vehicles[vehicleId];
      if (vehicle && vehicle.currentIntersectionId === intersection.id) {
        totalWaitTime += vehicle.waitTime;
        queuedVehicleCount++;
      }
    });
    
    intersection.metrics.averageWaitTime = queuedVehicleCount > 0 ? totalWaitTime / queuedVehicleCount : 0;
    
    // Calculate throughput (vehicles processed in recent time)
    // This is a simplified calculation - in a real system would track over time window
    intersection.metrics.throughput = Math.max(0, intersection.metrics.throughput * 0.95); // Decay factor
    
    // Update efficiency based on queue length and wait time
    const maxExpectedQueue = 10; // Expected max queue length per approach
    const maxExpectedWait = 60; // Expected max wait time in seconds
    
    const queueEfficiency = Math.max(0, 100 - (totalQueueLength / maxExpectedQueue) * 25);
    const waitEfficiency = Math.max(0, 100 - (intersection.metrics.averageWaitTime / maxExpectedWait) * 50);
    
    intersection.metrics.efficiency = Math.round((queueEfficiency + waitEfficiency) / 2);
    intersection.metrics.timestamp = Date.now();
  }

  /**
   * Calculate comprehensive network metrics
   */
  private calculateNetworkMetrics(state: NetworkState): NetworkMetrics {
    const vehicles = Object.values(state.vehicles);
    const intersections = Object.values(state.intersections);
    
    const totalVehicles = vehicles.length;
    const averageWaitTime = totalVehicles > 0 ? 
      vehicles.reduce((sum, v) => sum + v.waitTime, 0) / totalVehicles : 0;
    
    const averageSpeed = totalVehicles > 0 ?
      vehicles.reduce((sum, v) => sum + v.speed, 0) / totalVehicles : 0;
    
    const totalQueueLength = intersections.reduce((sum, intersection) => {
      return sum + intersection.metrics.totalQueueLength;
    }, 0);
    
    const networkThroughput = intersections.reduce((sum, intersection) => {
      return sum + intersection.metrics.throughput;
    }, 0);
    
    // Calculate congestion level
    let congestionLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (averageWaitTime > 60) congestionLevel = 'critical';
    else if (averageWaitTime > 30) congestionLevel = 'high';
    else if (averageWaitTime > 15) congestionLevel = 'medium';
    
    // Calculate overall efficiency
    const efficiency = Math.max(0, Math.min(100, 
      100 - (averageWaitTime * 2) - (totalQueueLength * 0.5)
    ));
    
    return {
      totalVehicles,
      averageWaitTime: Math.round(averageWaitTime * 10) / 10,
      networkThroughput: Math.round(networkThroughput),
      totalQueueLength,
      averageSpeed: Math.round(averageSpeed * 10) / 10,
      congestionLevel,
      efficiency: Math.round(efficiency * 10) / 10,
    };
  }
  
  /**
   * Generate system events for monitoring and debugging
   */
  private generateSystemEvents(state: NetworkState): void {
    const events: SystemEvent[] = [...state.events];
    
    // Check for high wait times
    Object.values(state.vehicles).forEach(vehicle => {
      if (vehicle.waitTime > 30) {
        events.unshift({
          id: randomUUID(),
          timestamp: Date.now(),
          level: 'WARN',
          message: `Vehicle ${vehicle.id} waiting ${Math.round(vehicle.waitTime)}s at intersection ${vehicle.currentIntersectionId}`,
        });
      }
    });
    
    // Check for coordination events
    Object.values(state.intersections).forEach(intersection => {
      if (intersection.aiDecision.pressureAnalysis.northSouth > 3.0 ||
          intersection.aiDecision.pressureAnalysis.eastWest > 3.0) {
        events.unshift({
          id: randomUUID(),
          timestamp: Date.now(),
          level: 'WARN',
          message: `High pressure at ${intersection.name}: NS=${intersection.aiDecision.pressureAnalysis.northSouth.toFixed(1)}, EW=${intersection.aiDecision.pressureAnalysis.eastWest.toFixed(1)}`,
        });
      }
    });
    
    // Network efficiency events
    if (state.networkMetrics.efficiency < 60) {
      events.unshift({
        id: randomUUID(),
        timestamp: Date.now(),
        level: 'ERROR',
        message: `Network efficiency critical: ${state.networkMetrics.efficiency}%`,
      });
    }
    
    // Keep only last 50 events
    state.events = events.slice(0, 50);
  }
}