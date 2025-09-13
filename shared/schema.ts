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

export interface SystemEvent {
  id: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
}

export interface TrafficSystemState {
  metrics: TrafficMetrics;
  signalState: TrafficSignalState;
  incomingPlatoons: IncomingPlatoon[];
  aiDecision: AIDecisionData;
  events: SystemEvent[];
  isSimulationRunning: boolean;
  simulationSpeed: number;
}
