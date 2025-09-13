import { 
  type User, 
  type InsertUser, 
  type TrafficMetrics, 
  type TrafficSystemState, 
  type SystemEvent,
  type Intersection,
  type Road,
  type Vehicle,
  type NetworkState,
  type NetworkMetrics,
  type InsertIntersection,
  type InsertRoad,
  type InsertVehicle,
  type RouteSegment,
  type NetworkTopology,
  type Position
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Single intersection traffic system methods (backward compatibility)
  getCurrentTrafficState(): Promise<TrafficSystemState>;
  updateTrafficState(state: TrafficSystemState): Promise<void>;
  getTrafficHistory(hours: number): Promise<TrafficMetrics[]>;
  addSystemEvent(event: Omit<SystemEvent, 'id'>): Promise<SystemEvent>;
  getSystemEvents(limit: number): Promise<SystemEvent[]>;

  // Network state management
  getNetworkState(): Promise<NetworkState>;
  updateNetworkState(state: NetworkState): Promise<void>;
  initializeNetwork(layout: 'grid-2x2' | 'custom'): Promise<NetworkState>;
  setNetworkMode(mode: 'single' | 'network'): Promise<void>;
  getNetworkMode(): Promise<'single' | 'network'>;

  // Intersection CRUD operations
  createIntersection(intersection: InsertIntersection): Promise<Intersection>;
  getIntersection(id: string): Promise<Intersection | undefined>;
  getAllIntersections(): Promise<Intersection[]>;
  updateIntersection(id: string, updates: Partial<Intersection>): Promise<Intersection | undefined>;
  deleteIntersection(id: string): Promise<boolean>;
  getIntersectionsByPosition(bounds: { minX: number; maxX: number; minY: number; maxY: number }): Promise<Intersection[]>;

  // Road CRUD operations
  createRoad(road: InsertRoad): Promise<Road>;
  getRoad(id: string): Promise<Road | undefined>;
  getAllRoads(): Promise<Road[]>;
  getRoadsByIntersection(intersectionId: string): Promise<Road[]>;
  getConnectedRoads(intersectionId: string, direction?: 'incoming' | 'outgoing'): Promise<Road[]>;
  updateRoad(id: string, updates: Partial<Road>): Promise<Road | undefined>;
  deleteRoad(id: string): Promise<boolean>;
  updateRoadFlow(roadId: string, flow: number, travelTime: number): Promise<void>;

  // Vehicle CRUD operations
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getAllVehicles(): Promise<Vehicle[]>;
  getVehiclesByIntersection(intersectionId: string): Promise<Vehicle[]>;
  getVehiclesByRoad(roadId: string): Promise<Vehicle[]>;
  updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: string): Promise<boolean>;
  moveVehicle(vehicleId: string, newPosition: { roadId?: string; intersectionId?: string; position: Position }): Promise<Vehicle | undefined>;
  
  // Vehicle routing and pathfinding
  calculateRoute(vehicleId: string, fromIntersectionId: string, toIntersectionId: string): Promise<RouteSegment[]>;
  updateVehicleRoute(vehicleId: string, route: RouteSegment[]): Promise<Vehicle | undefined>;
  getVehiclesInQueue(intersectionId: string, direction: 'north' | 'east' | 'south' | 'west'): Promise<Vehicle[]>;

  // Network topology and analysis
  getNetworkTopology(): Promise<NetworkTopology>;
  findShortestPath(fromIntersectionId: string, toIntersectionId: string): Promise<RouteSegment[]>;
  calculateNetworkMetrics(): Promise<NetworkMetrics>;
  
  // Vehicle spawning and management
  spawnRandomVehicle(): Promise<Vehicle>;
  spawnVehicleAtIntersection(intersectionId: string, destinationId: string): Promise<Vehicle>;
  cleanupCompletedVehicles(): Promise<number>;
  
  // Simulation control
  resetNetwork(): Promise<void>;
  pauseSimulation(): Promise<void>;
  resumeSimulation(): Promise<void>;
  setSimulationSpeed(speed: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private currentTrafficState: TrafficSystemState;
  private trafficHistory: TrafficMetrics[];
  private systemEvents: SystemEvent[];
  
  // Network storage maps
  private intersections: Map<string, Intersection>;
  private roads: Map<string, Road>;
  private vehicles: Map<string, Vehicle>;
  private networkState: NetworkState | null;
  private networkMode: 'single' | 'network';
  private simulationRunning: boolean;
  private simulationSpeed: number;

  constructor() {
    this.users = new Map();
    this.trafficHistory = [];
    this.systemEvents = [];
    
    // Initialize network storage maps
    this.intersections = new Map();
    this.roads = new Map();
    this.vehicles = new Map();
    this.networkState = null;
    this.networkMode = 'single';
    this.simulationRunning = true;
    this.simulationSpeed = 1.0;
    
    // Initialize traffic state
    this.currentTrafficState = {
      metrics: {
        id: randomUUID(),
        timestamp: Date.now(),
        averageWaitTime: 24.3,
        totalQueueLength: 38,
        throughput: 142,
        efficiency: 87.4,
        northQueue: 8,
        eastQueue: 15,
        southQueue: 3,
        westQueue: 12,
      },
      signalState: {
        northSouth: 'red',
        eastWest: 'green',
        currentPhase: 'EW',
        phaseTimeRemaining: 25,
        nextPhaseTime: 45,
      },
      incomingPlatoons: [
        { direction: 'north', vehicleCount: 10, eta: 15, speed: 50 },
        { direction: 'east', vehicleCount: 40, eta: 20, speed: 45 },
        { direction: 'south', vehicleCount: 5, eta: 30, speed: 55 },
        { direction: 'west', vehicleCount: 20, eta: 15, speed: 48 },
      ],
      aiDecision: {
        predictorQValues: {
          northSouth: 85.1,
          eastWest: 340.9,
        },
        recommendedAction: 'EW',
        guardianChecks: {
          minGreenTime: true,
          safeTransition: true,
          systemHealth: true,
        },
        timingPlan: {
          startTime: 12,
          duration: 33,
          endTime: 45,
        },
        pressureAnalysis: {
          northSouth: 0.84,
          eastWest: 3.33,
        },
      },
      events: [],
      isSimulationRunning: true,
      simulationSpeed: 1.0,
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getCurrentTrafficState(): Promise<TrafficSystemState> {
    return { ...this.currentTrafficState };
  }

  async updateTrafficState(state: TrafficSystemState): Promise<void> {
    this.currentTrafficState = { ...state };
    
    // Add to history
    this.trafficHistory.push({ ...state.metrics });
    
    // Keep only last 24 hours of history
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.trafficHistory = this.trafficHistory.filter(m => m.timestamp > oneDayAgo);
  }

  async getTrafficHistory(hours: number): Promise<TrafficMetrics[]> {
    const hoursAgo = Date.now() - (hours * 60 * 60 * 1000);
    return this.trafficHistory.filter(m => m.timestamp > hoursAgo);
  }

  async addSystemEvent(event: Omit<SystemEvent, 'id'>): Promise<SystemEvent> {
    const systemEvent: SystemEvent = {
      id: randomUUID(),
      ...event,
    };
    
    this.systemEvents.unshift(systemEvent);
    
    // Keep only last 100 events
    if (this.systemEvents.length > 100) {
      this.systemEvents = this.systemEvents.slice(0, 100);
    }
    
    return systemEvent;
  }

  async getSystemEvents(limit: number): Promise<SystemEvent[]> {
    return this.systemEvents.slice(0, limit);
  }

  // Network state management methods
  async getNetworkState(): Promise<NetworkState> {
    if (!this.networkState) {
      // Create empty network state if not initialized
      this.networkState = {
        intersections: {},
        roads: {},
        vehicles: {},
        networkMetrics: {
          totalVehicles: 0,
          averageWaitTime: 0,
          networkThroughput: 0,
          totalQueueLength: 0,
          averageSpeed: 0,
          congestionLevel: 'low',
          efficiency: 100,
        },
        events: [...this.systemEvents],
        isSimulationRunning: this.simulationRunning,
        simulationSpeed: this.simulationSpeed,
        timestamp: Date.now(),
        mode: this.networkMode,
      };
    }
    
    // Sync current state with maps
    this.networkState.intersections = Object.fromEntries(this.intersections);
    this.networkState.roads = Object.fromEntries(this.roads);
    this.networkState.vehicles = Object.fromEntries(this.vehicles);
    this.networkState.events = [...this.systemEvents];
    this.networkState.isSimulationRunning = this.simulationRunning;
    this.networkState.simulationSpeed = this.simulationSpeed;
    this.networkState.timestamp = Date.now();
    this.networkState.mode = this.networkMode;
    
    return { ...this.networkState };
  }

  async updateNetworkState(state: NetworkState): Promise<void> {
    this.networkState = { ...state };
    
    // Sync maps from network state
    this.intersections.clear();
    Object.entries(state.intersections).forEach(([id, intersection]) => {
      this.intersections.set(id, intersection);
    });
    
    this.roads.clear();
    Object.entries(state.roads).forEach(([id, road]) => {
      this.roads.set(id, road);
    });
    
    this.vehicles.clear();
    Object.entries(state.vehicles).forEach(([id, vehicle]) => {
      this.vehicles.set(id, vehicle);
    });
    
    this.simulationRunning = state.isSimulationRunning;
    this.simulationSpeed = state.simulationSpeed;
    this.networkMode = state.mode;
  }

  async initializeNetwork(layout: 'grid-2x2' | 'custom'): Promise<NetworkState> {
    if (layout === 'grid-2x2') {
      // Create 2x2 grid with 4 intersections
      const intersections = new Map<string, Intersection>();
      const roads = new Map<string, Road>();
      
      // Define intersection positions in a 2x2 grid
      const intersectionData = [
        { id: 'int-nw', name: 'Northwest Intersection', x: 0, y: 1000 },
        { id: 'int-ne', name: 'Northeast Intersection', x: 1000, y: 1000 },
        { id: 'int-sw', name: 'Southwest Intersection', x: 0, y: 0 },
        { id: 'int-se', name: 'Southeast Intersection', x: 1000, y: 0 },
      ];
      
      // Create intersections
      for (const intData of intersectionData) {
        const intersection: Intersection = {
          id: intData.id,
          name: intData.name,
          position: { x: intData.x, y: intData.y },
          signalState: {
            northSouth: 'red',
            eastWest: 'green',
            currentPhase: 'EW',
            phaseTimeRemaining: 30,
            nextPhaseTime: 60,
          },
          metrics: {
            id: randomUUID(),
            timestamp: Date.now(),
            averageWaitTime: Math.random() * 30,
            totalQueueLength: Math.floor(Math.random() * 20),
            throughput: Math.floor(Math.random() * 200) + 100,
            efficiency: Math.random() * 20 + 80,
            northQueue: Math.floor(Math.random() * 10),
            eastQueue: Math.floor(Math.random() * 10),
            southQueue: Math.floor(Math.random() * 10),
            westQueue: Math.floor(Math.random() * 10),
          },
          incomingPlatoons: [],
          aiDecision: {
            intersectionId: intData.id,
            predictorQValues: { northSouth: 50, eastWest: 50 },
            recommendedAction: 'EW',
            guardianChecks: {
              minGreenTime: true,
              safeTransition: true,
              systemHealth: true,
            },
            timingPlan: { startTime: 0, duration: 30, endTime: 30 },
            pressureAnalysis: { northSouth: 1.0, eastWest: 1.0 },
          },
          isActive: true,
        };
        intersections.set(intData.id, intersection);
      }
      
      // Create roads connecting intersections
      const roadConnections = [
        // Horizontal roads (east-west)
        { from: 'int-nw', to: 'int-ne', dir: 'east' as const },
        { from: 'int-ne', to: 'int-nw', dir: 'west' as const },
        { from: 'int-sw', to: 'int-se', dir: 'east' as const },
        { from: 'int-se', to: 'int-sw', dir: 'west' as const },
        // Vertical roads (north-south)
        { from: 'int-nw', to: 'int-sw', dir: 'south' as const },
        { from: 'int-sw', to: 'int-nw', dir: 'north' as const },
        { from: 'int-ne', to: 'int-se', dir: 'south' as const },
        { from: 'int-se', to: 'int-ne', dir: 'north' as const },
      ];
      
      for (const conn of roadConnections) {
        const road: Road = {
          id: `road-${conn.from}-${conn.to}`,
          fromIntersectionId: conn.from,
          toIntersectionId: conn.to,
          lanes: 2,
          length: 1000, // 1km between intersections
          speedLimit: 50,
          direction: conn.dir,
          capacity: 100,
          currentFlow: Math.floor(Math.random() * 50),
          travelTime: 72, // ~72 seconds at 50km/h for 1km
        };
        roads.set(road.id, road);
      }
      
      // Update storage maps
      this.intersections = intersections;
      this.roads = roads;
      this.vehicles.clear(); // Start with no vehicles
      
      // Create network state
      this.networkState = {
        intersections: Object.fromEntries(intersections),
        roads: Object.fromEntries(roads),
        vehicles: {},
        networkMetrics: await this.calculateNetworkMetrics(),
        events: [...this.systemEvents],
        isSimulationRunning: true,
        simulationSpeed: 1.0,
        timestamp: Date.now(),
        mode: 'network',
      };
      
      this.networkMode = 'network';
      
      await this.addSystemEvent({
        timestamp: Date.now(),
        level: 'INFO',
        message: 'Network initialized with 2x2 grid layout (4 intersections, 8 roads)',
      });
    }
    
    return await this.getNetworkState();
  }

  async setNetworkMode(mode: 'single' | 'network'): Promise<void> {
    this.networkMode = mode;
    await this.addSystemEvent({
      timestamp: Date.now(),
      level: 'INFO',
      message: `Network mode changed to: ${mode}`,
    });
  }

  async getNetworkMode(): Promise<'single' | 'network'> {
    return this.networkMode;
  }

  // Intersection CRUD operations
  async createIntersection(intersection: InsertIntersection): Promise<Intersection> {
    const id = randomUUID();
    const newIntersection: Intersection = {
      id,
      ...intersection,
      signalState: {
        northSouth: 'red',
        eastWest: 'green',
        currentPhase: 'EW',
        phaseTimeRemaining: 30,
        nextPhaseTime: 60,
      },
      metrics: {
        id: randomUUID(),
        timestamp: Date.now(),
        averageWaitTime: 0,
        totalQueueLength: 0,
        throughput: 0,
        efficiency: 100,
        northQueue: 0,
        eastQueue: 0,
        southQueue: 0,
        westQueue: 0,
      },
      incomingPlatoons: [],
      aiDecision: {
        intersectionId: id,
        predictorQValues: { northSouth: 50, eastWest: 50 },
        recommendedAction: 'EW',
        guardianChecks: {
          minGreenTime: true,
          safeTransition: true,
          systemHealth: true,
        },
        timingPlan: { startTime: 0, duration: 30, endTime: 30 },
        pressureAnalysis: { northSouth: 1.0, eastWest: 1.0 },
      },
    };
    
    this.intersections.set(id, newIntersection);
    return newIntersection;
  }

  async getIntersection(id: string): Promise<Intersection | undefined> {
    return this.intersections.get(id);
  }

  async getAllIntersections(): Promise<Intersection[]> {
    return Array.from(this.intersections.values());
  }

  async updateIntersection(id: string, updates: Partial<Intersection>): Promise<Intersection | undefined> {
    const intersection = this.intersections.get(id);
    if (!intersection) return undefined;
    
    const updated = { ...intersection, ...updates };
    this.intersections.set(id, updated);
    return updated;
  }

  async deleteIntersection(id: string): Promise<boolean> {
    const deleted = this.intersections.delete(id);
    if (deleted) {
      // Also delete connected roads and vehicles at this intersection
      const connectedRoads = Array.from(this.roads.values()).filter(
        road => road.fromIntersectionId === id || road.toIntersectionId === id
      );
      for (const road of connectedRoads) {
        this.roads.delete(road.id);
      }
      
      const vehiclesAtIntersection = Array.from(this.vehicles.values()).filter(
        vehicle => vehicle.currentIntersectionId === id
      );
      for (const vehicle of vehiclesAtIntersection) {
        this.vehicles.delete(vehicle.id);
      }
    }
    return deleted;
  }

  async getIntersectionsByPosition(bounds: { minX: number; maxX: number; minY: number; maxY: number }): Promise<Intersection[]> {
    return Array.from(this.intersections.values()).filter(intersection => 
      intersection.position.x >= bounds.minX &&
      intersection.position.x <= bounds.maxX &&
      intersection.position.y >= bounds.minY &&
      intersection.position.y <= bounds.maxY
    );
  }

  // Road CRUD operations
  async createRoad(road: InsertRoad): Promise<Road> {
    const id = randomUUID();
    const newRoad: Road = {
      id,
      ...road,
      currentFlow: 0,
      travelTime: (road.length / 1000) * (3600 / road.speedLimit), // Convert to seconds
    };
    
    this.roads.set(id, newRoad);
    return newRoad;
  }

  async getRoad(id: string): Promise<Road | undefined> {
    return this.roads.get(id);
  }

  async getAllRoads(): Promise<Road[]> {
    return Array.from(this.roads.values());
  }

  async getRoadsByIntersection(intersectionId: string): Promise<Road[]> {
    return Array.from(this.roads.values()).filter(
      road => road.fromIntersectionId === intersectionId || road.toIntersectionId === intersectionId
    );
  }

  async getConnectedRoads(intersectionId: string, direction?: 'incoming' | 'outgoing'): Promise<Road[]> {
    const roads = Array.from(this.roads.values());
    
    if (direction === 'incoming') {
      return roads.filter(road => road.toIntersectionId === intersectionId);
    } else if (direction === 'outgoing') {
      return roads.filter(road => road.fromIntersectionId === intersectionId);
    } else {
      return roads.filter(
        road => road.fromIntersectionId === intersectionId || road.toIntersectionId === intersectionId
      );
    }
  }

  async updateRoad(id: string, updates: Partial<Road>): Promise<Road | undefined> {
    const road = this.roads.get(id);
    if (!road) return undefined;
    
    const updated = { ...road, ...updates };
    this.roads.set(id, updated);
    return updated;
  }

  async deleteRoad(id: string): Promise<boolean> {
    const deleted = this.roads.delete(id);
    if (deleted) {
      // Remove vehicles on this road
      const vehiclesOnRoad = Array.from(this.vehicles.values()).filter(
        vehicle => vehicle.currentRoadId === id
      );
      for (const vehicle of vehiclesOnRoad) {
        this.vehicles.delete(vehicle.id);
      }
    }
    return deleted;
  }

  async updateRoadFlow(roadId: string, flow: number, travelTime: number): Promise<void> {
    const road = this.roads.get(roadId);
    if (road) {
      road.currentFlow = flow;
      road.travelTime = travelTime;
      this.roads.set(roadId, road);
    }
  }

  // Vehicle CRUD operations
  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const id = randomUUID();
    const newVehicle: Vehicle = {
      id,
      ...vehicle,
      currentRoadId: null,
      currentIntersectionId: null,
      route: [],
      routeProgress: 0,
      waitTime: 0,
    };
    
    this.vehicles.set(id, newVehicle);
    return newVehicle;
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }

  async getAllVehicles(): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values());
  }

  async getVehiclesByIntersection(intersectionId: string): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values()).filter(
      vehicle => vehicle.currentIntersectionId === intersectionId
    );
  }

  async getVehiclesByRoad(roadId: string): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values()).filter(
      vehicle => vehicle.currentRoadId === roadId
    );
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) return undefined;
    
    const updated = { ...vehicle, ...updates };
    this.vehicles.set(id, updated);
    return updated;
  }

  async deleteVehicle(id: string): Promise<boolean> {
    return this.vehicles.delete(id);
  }

  async moveVehicle(vehicleId: string, newPosition: { roadId?: string; intersectionId?: string; position: Position }): Promise<Vehicle | undefined> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return undefined;
    
    const updated = {
      ...vehicle,
      currentRoadId: newPosition.roadId || null,
      currentIntersectionId: newPosition.intersectionId || null,
      position: newPosition.position,
    };
    
    this.vehicles.set(vehicleId, updated);
    return updated;
  }

  // Vehicle routing and pathfinding
  async calculateRoute(vehicleId: string, fromIntersectionId: string, toIntersectionId: string): Promise<RouteSegment[]> {
    return await this.findShortestPath(fromIntersectionId, toIntersectionId);
  }

  async updateVehicleRoute(vehicleId: string, route: RouteSegment[]): Promise<Vehicle | undefined> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return undefined;
    
    const updated = { ...vehicle, route, routeProgress: 0 };
    this.vehicles.set(vehicleId, updated);
    return updated;
  }

  async getVehiclesInQueue(intersectionId: string, direction: 'north' | 'east' | 'south' | 'west'): Promise<Vehicle[]> {
    // Get vehicles at intersection waiting in the specified direction queue
    return Array.from(this.vehicles.values()).filter(vehicle => {
      if (vehicle.currentIntersectionId !== intersectionId) return false;
      
      // This is simplified - in a full implementation, we'd check the vehicle's
      // intended direction based on their route
      return vehicle.waitTime > 0;
    });
  }

  // Network topology and analysis
  async getNetworkTopology(): Promise<NetworkTopology> {
    const intersections = Array.from(this.intersections.keys());
    const roadConnections: Record<string, string[]> = {};
    const trafficWeights: Record<string, number> = {};
    
    // Build adjacency relationships
    for (const intersection of intersections) {
      const connectedRoads = await this.getConnectedRoads(intersection);
      roadConnections[intersection] = connectedRoads.map(road => road.id);
    }
    
    // Calculate traffic weights for roads
    for (const road of this.roads.values()) {
      const congestionFactor = road.currentFlow / road.capacity;
      trafficWeights[road.id] = road.travelTime * (1 + congestionFactor);
    }
    
    // Create distance matrix (simplified - in practice would use proper graph algorithms)
    const adjacencyMatrix = intersections.map(() => 
      intersections.map(() => Infinity)
    );
    
    for (let i = 0; i < intersections.length; i++) {
      adjacencyMatrix[i][i] = 0;
      const intersection = intersections[i];
      const outgoingRoads = await this.getConnectedRoads(intersection, 'outgoing');
      
      for (const road of outgoingRoads) {
        const toIndex = intersections.indexOf(road.toIntersectionId);
        if (toIndex !== -1) {
          adjacencyMatrix[i][toIndex] = trafficWeights[road.id] || road.travelTime;
        }
      }
    }
    
    return {
      intersections,
      adjacencyMatrix,
      roadConnections,
      trafficWeights,
    };
  }

  async findShortestPath(fromIntersectionId: string, toIntersectionId: string): Promise<RouteSegment[]> {
    // Simplified Dijkstra's algorithm implementation
    const intersections = Array.from(this.intersections.keys());
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set(intersections);
    
    // Initialize distances
    for (const intersection of intersections) {
      distances.set(intersection, intersection === fromIntersectionId ? 0 : Infinity);
      previous.set(intersection, null);
    }
    
    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let current = null;
      let minDistance = Infinity;
      for (const node of unvisited) {
        const dist = distances.get(node) || Infinity;
        if (dist < minDistance) {
          minDistance = dist;
          current = node;
        }
      }
      
      if (!current || minDistance === Infinity) break;
      
      unvisited.delete(current);
      
      if (current === toIntersectionId) break;
      
      // Check neighbors
      const outgoingRoads = await this.getConnectedRoads(current, 'outgoing');
      for (const road of outgoingRoads) {
        if (unvisited.has(road.toIntersectionId)) {
          const alt = (distances.get(current) || 0) + road.travelTime;
          if (alt < (distances.get(road.toIntersectionId) || Infinity)) {
            distances.set(road.toIntersectionId, alt);
            previous.set(road.toIntersectionId, current);
          }
        }
      }
    }
    
    // Reconstruct path
    const path: RouteSegment[] = [];
    let current = toIntersectionId;
    
    while (current && previous.get(current)) {
      const prev = previous.get(current)!;
      const road = Array.from(this.roads.values()).find(
        r => r.fromIntersectionId === prev && r.toIntersectionId === current
      );
      
      if (road) {
        path.unshift({
          roadId: road.id,
          fromIntersectionId: prev,
          toIntersectionId: current,
          distanceRemaining: road.length,
        });
      }
      current = prev;
    }
    
    return path;
  }

  async calculateNetworkMetrics(): Promise<NetworkMetrics> {
    const vehicles = Array.from(this.vehicles.values());
    const totalVehicles = vehicles.length;
    const averageWaitTime = totalVehicles > 0 
      ? vehicles.reduce((sum, v) => sum + v.waitTime, 0) / totalVehicles 
      : 0;
    const averageSpeed = totalVehicles > 0
      ? vehicles.reduce((sum, v) => sum + v.speed, 0) / totalVehicles
      : 0;
    
    const totalQueueLength = Array.from(this.intersections.values())
      .reduce((sum, int) => sum + int.metrics.totalQueueLength, 0);
    
    const networkThroughput = Array.from(this.intersections.values())
      .reduce((sum, int) => sum + int.metrics.throughput, 0);
    
    const efficiency = Array.from(this.intersections.values())
      .reduce((sum, int) => sum + int.metrics.efficiency, 0) / this.intersections.size;
    
    let congestionLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (averageWaitTime > 60) congestionLevel = 'critical';
    else if (averageWaitTime > 40) congestionLevel = 'high';
    else if (averageWaitTime > 20) congestionLevel = 'medium';
    
    return {
      totalVehicles,
      averageWaitTime,
      networkThroughput,
      totalQueueLength,
      averageSpeed,
      congestionLevel,
      efficiency,
    };
  }

  // Vehicle spawning and management
  async spawnRandomVehicle(): Promise<Vehicle> {
    const intersections = Array.from(this.intersections.keys());
    if (intersections.length < 2) {
      throw new Error('Need at least 2 intersections to spawn vehicles');
    }
    
    const startId = intersections[Math.floor(Math.random() * intersections.length)];
    let destId = intersections[Math.floor(Math.random() * intersections.length)];
    while (destId === startId) {
      destId = intersections[Math.floor(Math.random() * intersections.length)];
    }
    
    return await this.spawnVehicleAtIntersection(startId, destId);
  }

  async spawnVehicleAtIntersection(intersectionId: string, destinationId: string): Promise<Vehicle> {
    const intersection = this.intersections.get(intersectionId);
    if (!intersection) {
      throw new Error(`Intersection ${intersectionId} not found`);
    }
    
    const vehicleTypes: Array<'car' | 'truck' | 'bus' | 'motorcycle' | 'emergency'> = 
      ['car', 'car', 'car', 'truck', 'bus', 'motorcycle']; // Weighted towards cars
    const priorities: Array<'normal' | 'emergency' | 'public_transport'> = 
      ['normal', 'normal', 'normal', 'emergency', 'public_transport'];
    
    const vehicle: InsertVehicle = {
      destinationIntersectionId: destinationId,
      speed: Math.random() * 20 + 30, // 30-50 km/h
      position: { ...intersection.position },
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
    };
    
    const newVehicle = await this.createVehicle(vehicle);
    
    // Calculate initial route
    const route = await this.calculateRoute(newVehicle.id, intersectionId, destinationId);
    await this.updateVehicleRoute(newVehicle.id, route);
    
    // Place vehicle at intersection
    await this.moveVehicle(newVehicle.id, {
      intersectionId,
      position: intersection.position,
    });
    
    return newVehicle;
  }

  async cleanupCompletedVehicles(): Promise<number> {
    const vehicles = Array.from(this.vehicles.values());
    let cleaned = 0;
    
    for (const vehicle of vehicles) {
      // Remove vehicles that have reached their destination
      if (vehicle.currentIntersectionId === vehicle.destinationIntersectionId && 
          vehicle.routeProgress >= 1.0) {
        this.vehicles.delete(vehicle.id);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  // Simulation control
  async resetNetwork(): Promise<void> {
    this.intersections.clear();
    this.roads.clear();
    this.vehicles.clear();
    this.networkState = null;
    this.systemEvents.length = 0;
    
    await this.addSystemEvent({
      timestamp: Date.now(),
      level: 'INFO',
      message: 'Network has been reset',
    });
  }

  async pauseSimulation(): Promise<void> {
    this.simulationRunning = false;
    await this.addSystemEvent({
      timestamp: Date.now(),
      level: 'INFO',
      message: 'Simulation paused',
    });
  }

  async resumeSimulation(): Promise<void> {
    this.simulationRunning = true;
    await this.addSystemEvent({
      timestamp: Date.now(),
      level: 'INFO',
      message: 'Simulation resumed',
    });
  }

  async setSimulationSpeed(speed: number): Promise<void> {
    this.simulationSpeed = Math.max(0.1, Math.min(10.0, speed)); // Clamp between 0.1x and 10x
    await this.addSystemEvent({
      timestamp: Date.now(),
      level: 'INFO',
      message: `Simulation speed changed to ${this.simulationSpeed}x`,
    });
  }
}

export const storage = new MemStorage();
