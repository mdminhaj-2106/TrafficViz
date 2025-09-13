import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Traffic-related schemas
export interface TrafficMetrics {
  id: string;
  timestamp: number;
  averageWaitTime: number;
  totalQueueLength: number;
  throughput: number;
  efficiency: number;
  northQueue: number;
  eastQueue: number;
  southQueue: number;
  westQueue: number;
}

export interface TrafficSignalState {
  northSouth: 'red' | 'yellow' | 'green';
  eastWest: 'red' | 'yellow' | 'green';
  currentPhase: 'NS' | 'EW';
  phaseTimeRemaining: number;
  nextPhaseTime: number;
}

export interface IncomingPlatoon {
  direction: 'north' | 'east' | 'south' | 'west';
  vehicleCount: number;
  eta: number;
  speed: number;
}

export interface AIDecisionData {
  intersectionId?: string; // Added for multi-intersection support
  predictorQValues: {
    northSouth: number;
    eastWest: number;
  };
  recommendedAction: 'NS' | 'EW' | 'HOLD';
  guardianChecks: {
    minGreenTime: boolean;
    safeTransition: boolean;
    systemHealth: boolean;
  };
  timingPlan: {
    startTime: number;
    duration: number;
    endTime: number;
  };
  pressureAnalysis: {
    northSouth: number;
    eastWest: number;
  };
}

// Multi-intersection network schemas
export interface Position {
  x: number;
  y: number;
}

export interface Intersection {
  id: string;
  name: string;
  position: Position;
  signalState: TrafficSignalState;
  metrics: TrafficMetrics;
  incomingPlatoons: IncomingPlatoon[];
  aiDecision: AIDecisionData;
  isActive: boolean;
}

// Road schema represents a unidirectional road segment between intersections
// For bidirectional roads, create two Road records with opposite directions
// Example: road-1-north (A→B) and road-1-south (B→A) for bidirectional road between A and B
export interface Road {
  id: string;
  fromIntersectionId: string;
  toIntersectionId: string;
  lanes: number;
  length: number; // in meters
  speedLimit: number; // km/h
  direction: 'north' | 'east' | 'south' | 'west';
  capacity: number;
  currentFlow: number;
  travelTime: number; // current travel time in seconds
}

export interface RouteSegment {
  roadId: string;
  fromIntersectionId: string;
  toIntersectionId: string;
  distanceRemaining: number;
}

export interface Vehicle {
  id: string;
  currentRoadId: string | null; // null if at intersection
  currentIntersectionId: string | null; // null if on road
  destinationIntersectionId: string;
  route: RouteSegment[];
  routeProgress: number; // 0-1 where 1 is completed
  speed: number; // current speed in km/h
  position: Position;
  waitTime: number; // time waiting in queue
  priority: 'normal' | 'emergency' | 'public_transport';
  vehicleType: 'car' | 'truck' | 'bus' | 'motorcycle' | 'emergency';
}

export interface NetworkMetrics {
  totalVehicles: number;
  averageWaitTime: number;
  networkThroughput: number;
  totalQueueLength: number;
  averageSpeed: number;
  congestionLevel: 'low' | 'medium' | 'high' | 'critical';
  efficiency: number;
}

export interface SystemEvent {
  id: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
}

// Network-wide state for multi-intersection management
// Note: Uses Record<string, T> instead of Map<string, T> for JSON serialization compatibility with WebSocket transport
export interface NetworkState {
  intersections: Record<string, Intersection>;
  roads: Record<string, Road>;
  vehicles: Record<string, Vehicle>;
  networkMetrics: NetworkMetrics;
  events: SystemEvent[];
  isSimulationRunning: boolean;
  simulationSpeed: number;
  timestamp: number;
  mode: 'single' | 'network'; // Mode selector for backward compatibility
}

// Backward compatible - extends original for single intersection mode
export interface TrafficSystemState {
  metrics: TrafficMetrics;
  signalState: TrafficSignalState;
  incomingPlatoons: IncomingPlatoon[];
  aiDecision: AIDecisionData;
  events: SystemEvent[];
  isSimulationRunning: boolean;
  simulationSpeed: number;
  
  // Extended for multi-intersection support
  networkState?: NetworkState;
  intersectionId?: string; // Which intersection this state represents in network mode
}

// Insert schemas for new types (following drizzle-zod pattern)
export const insertPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const insertIntersectionSchema = z.object({
  name: z.string().min(1),
  position: insertPositionSchema,
  isActive: z.boolean().default(true),
});

export const insertRoadSchema = z.object({
  fromIntersectionId: z.string().min(1),
  toIntersectionId: z.string().min(1),
  lanes: z.number().int().min(1).max(6),
  length: z.number().positive(),
  speedLimit: z.number().int().min(10).max(120),
  direction: z.enum(['north', 'east', 'south', 'west']),
  capacity: z.number().int().positive(),
});

export const insertVehicleSchema = z.object({
  destinationIntersectionId: z.string().min(1),
  speed: z.number().min(0).max(200),
  position: insertPositionSchema,
  priority: z.enum(['normal', 'emergency', 'public_transport']).default('normal'),
  vehicleType: z.enum(['car', 'truck', 'bus', 'motorcycle', 'emergency']).default('car'),
});

// Type inference for inserts
export type InsertIntersection = z.infer<typeof insertIntersectionSchema>;
export type InsertRoad = z.infer<typeof insertRoadSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertPosition = z.infer<typeof insertPositionSchema>;

// Utility types for route finding and network analysis
export interface PathfindingNode {
  intersectionId: string;
  position: Position;
  gCost: number; // Distance from start
  hCost: number; // Heuristic distance to goal
  fCost: number; // Total cost (g + h)
  parent?: PathfindingNode;
  connections: string[]; // Connected road IDs
}

export interface RouteCalculation {
  vehicleId: string;
  startIntersectionId: string;
  endIntersectionId: string;
  route: RouteSegment[];
  totalDistance: number;
  estimatedTime: number;
  alternativeRoutes: RouteSegment[][];
}

export interface NetworkTopology {
  intersections: string[];
  adjacencyMatrix: number[][]; // Distance matrix
  roadConnections: Record<string, string[]>; // intersection -> connected roads
  trafficWeights: Record<string, number>; // road -> current traffic weight
}
