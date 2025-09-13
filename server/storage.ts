import { type User, type InsertUser, type TrafficMetrics, type TrafficSystemState, type SystemEvent } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Traffic system storage methods
  getCurrentTrafficState(): Promise<TrafficSystemState>;
  updateTrafficState(state: TrafficSystemState): Promise<void>;
  getTrafficHistory(hours: number): Promise<TrafficMetrics[]>;
  addSystemEvent(event: Omit<SystemEvent, 'id'>): Promise<SystemEvent>;
  getSystemEvents(limit: number): Promise<SystemEvent[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private currentTrafficState: TrafficSystemState;
  private trafficHistory: TrafficMetrics[];
  private systemEvents: SystemEvent[];

  constructor() {
    this.users = new Map();
    this.trafficHistory = [];
    this.systemEvents = [];
    
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
}

export const storage = new MemStorage();
