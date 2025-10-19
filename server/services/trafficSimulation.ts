import { type TrafficSystemState, type IncomingPlatoon, type TrafficMetrics, type SystemEvent } from "@shared/schema";
import { AIEngine } from "./aiEngine";
import { randomUUID } from "crypto";

export class TrafficSimulation {
  private aiEngine = new AIEngine();
  private simulationInterval?: NodeJS.Timeout;
  private phaseChangeTime = Date.now();
  private currentTime = 0;
  private currentState: TrafficSystemState;
  
  constructor(private onStateUpdate: (state: TrafficSystemState) => void) {}
  
  start(initialState: TrafficSystemState): void {
    this.stop();
    this.currentState = initialState;
    
    this.simulationInterval = setInterval(() => {
      this.simulationStep();
    }, 1000 / initialState.simulationSpeed);
  }
  
  stop(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = undefined;
    }
  }
  
  private simulationStep(): void {
    this.currentTime += 1;
    
    // Update platoons (simulate movement and queue processing)
    const updatedPlatoons = this.updatePlatoons(this.currentState.incomingPlatoons);
    
    // Process vehicles through intersection based on current signal
    const processedPlatoons = this.processVehiclesThroughIntersection(updatedPlatoons, this.currentState.signalState);
    
    // Generate new random platoons more conservatively
    if (Math.random() < 0.05 && processedPlatoons.length < 8) {
      processedPlatoons.push(this.generateRandomPlatoon());
    }
    
    // Update AI decision
    const aiDecision = this.aiEngine.makeDecision(
      processedPlatoons,
      this.currentState.signalState,
      true
    );
    
    // Update traffic signals based on AI decision
    const updatedSignalState = this.updateTrafficSignals(this.currentState.signalState, aiDecision);
    
    // Calculate new metrics based on current state
    const updatedMetrics = this.calculateMetrics(this.currentState.metrics, processedPlatoons, updatedSignalState);
    
    // Generate system events
    const events = this.generateSystemEvents(this.currentState, aiDecision);
    
    const updatedState: TrafficSystemState = {
      ...this.currentState,
      metrics: updatedMetrics,
      signalState: updatedSignalState,
      incomingPlatoons: processedPlatoons,
      aiDecision,
      events,
    };
    
    this.currentState = updatedState;
    this.onStateUpdate(updatedState);
  }
  
  private updatePlatoons(platoons: IncomingPlatoon[]): IncomingPlatoon[] {
    return platoons
      .map(platoon => ({
        ...platoon,
        eta: Math.max(0, platoon.eta - 1),
        vehicleCount: platoon.vehicleCount // Keep vehicles to process through intersection
      }))
      .filter(platoon => platoon.eta > 0 || platoon.vehicleCount > 0); // Keep platoons that haven't arrived or still have vehicles
  }
  
  private processVehiclesThroughIntersection(platoons: IncomingPlatoon[], signalState: any): IncomingPlatoon[] {
    return platoons.map(platoon => {
      // If platoon has arrived and the signal is green for their direction, process some vehicles
      if (platoon.eta <= 0 && platoon.vehicleCount > 0) {
        const isGreenDirection = this.isGreenDirection(platoon.direction, signalState);
        if (isGreenDirection) {
          // Process 2-4 vehicles per second when green
          const processedVehicles = Math.min(platoon.vehicleCount, 4); // Fixed processing rate
          return {
            ...platoon,
            vehicleCount: Math.max(0, platoon.vehicleCount - processedVehicles)
          };
        }
      }
      return platoon;
    }).filter(platoon => platoon.vehicleCount > 0);
  }
  
  private isGreenDirection(direction: string, signalState: any): boolean {
    if (signalState.currentPhase === 'NS') {
      return direction === 'north' || direction === 'south';
    } else if (signalState.currentPhase === 'EW') {
      return direction === 'east' || direction === 'west';
    }
    return false;
  }
  
  private generateRandomPlatoon(): IncomingPlatoon {
    const directions: Array<'north' | 'east' | 'south' | 'west'> = ['north', 'east', 'south', 'west'];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    return {
      direction,
      vehicleCount: Math.floor(Math.random() * 30) + 5,
      eta: Math.floor(Math.random() * 60) + 10,
      speed: Math.floor(Math.random() * 20) + 40,
    };
  }
  
  private updateTrafficSignals(currentSignal: any, aiDecision: any): any {
    const now = Date.now();
    const timeInPhase = now - this.phaseChangeTime;
    
    // Check if we should change phase based on AI recommendation
    if (aiDecision.recommendedAction !== 'HOLD' && 
        aiDecision.recommendedAction !== currentSignal.currentPhase &&
        aiDecision.guardianChecks.minGreenTime) {
      
      this.phaseChangeTime = now;
      
      if (aiDecision.recommendedAction === 'NS') {
        return {
          northSouth: 'green',
          eastWest: 'red',
          currentPhase: 'NS',
          phaseTimeRemaining: aiDecision.timingPlan.duration,
          nextPhaseTime: aiDecision.timingPlan.endTime,
        };
      } else {
        return {
          northSouth: 'red',
          eastWest: 'green',
          currentPhase: 'EW',
          phaseTimeRemaining: aiDecision.timingPlan.duration,
          nextPhaseTime: aiDecision.timingPlan.endTime,
        };
      }
    }
    
    // Update remaining time
    const phaseRemaining = Math.max(0, currentSignal.phaseTimeRemaining - 1);
    
    return {
      ...currentSignal,
      phaseTimeRemaining: phaseRemaining,
    };
  }
  
  private calculateMetrics(
    currentMetrics: TrafficMetrics,
    platoons: IncomingPlatoon[],
    signalState: any
  ): TrafficMetrics {
    // Calculate queue lengths by direction
    const northQueue = platoons.filter(p => p.direction === 'north').reduce((sum, p) => sum + p.vehicleCount, 0);
    const eastQueue = platoons.filter(p => p.direction === 'east').reduce((sum, p) => sum + p.vehicleCount, 0);
    const southQueue = platoons.filter(p => p.direction === 'south').reduce((sum, p) => sum + p.vehicleCount, 0);
    const westQueue = platoons.filter(p => p.direction === 'west').reduce((sum, p) => sum + p.vehicleCount, 0);
    
    const totalQueueLength = northQueue + eastQueue + southQueue + westQueue;
    
    // Calculate wait time more realistically
    let averageWaitTime = 0;
    const totalVehicles = Math.max(1, totalQueueLength);
    
    if (signalState.currentPhase === 'NS') {
      // NS vehicles wait less, EW vehicles wait more
      const nsVehicles = northQueue + southQueue;
      const ewVehicles = eastQueue + westQueue;
      averageWaitTime = (nsVehicles * 2 + ewVehicles * 8) / totalVehicles;
    } else {
      // EW vehicles wait less, NS vehicles wait more
      const nsVehicles = northQueue + southQueue;
      const ewVehicles = eastQueue + westQueue;
      averageWaitTime = (ewVehicles * 2 + nsVehicles * 8) / totalVehicles;
    }
    
    // Calculate throughput based on actual processing
    const greenDirectionVehicles = signalState.currentPhase === 'NS' ? northQueue + southQueue : eastQueue + westQueue;
    const throughput = Math.max(80, 120 - (totalQueueLength * 0.5) + (greenDirectionVehicles * 0.3));
    
    // Calculate efficiency based on queue management and wait times
    const queueEfficiency = Math.max(0, 100 - (totalQueueLength * 2));
    const waitTimeEfficiency = Math.max(0, 100 - (averageWaitTime * 3));
    const efficiency = (queueEfficiency + waitTimeEfficiency) / 2;
    
    return {
      id: randomUUID(),
      timestamp: Date.now(),
      averageWaitTime: Math.round(averageWaitTime * 10) / 10,
      totalQueueLength,
      throughput: Math.round(throughput),
      efficiency: Math.round(Math.max(70, Math.min(98, efficiency)) * 10) / 10,
      northQueue,
      eastQueue,
      southQueue,
      westQueue,
    };
  }
  
  private generateSystemEvents(state: TrafficSystemState, aiDecision: any): SystemEvent[] {
    const events: SystemEvent[] = [...state.events];
    
    // Generate events based on AI decisions
    if (aiDecision.recommendedAction !== state.signalState.currentPhase && aiDecision.recommendedAction !== 'HOLD') {
      events.unshift({
        id: randomUUID(),
        timestamp: Date.now(),
        level: 'INFO',
        message: `AI recommended phase switch: ${state.signalState.currentPhase} → ${aiDecision.recommendedAction}`,
      });
    }
    
    // Generate events for high pressure
    if (aiDecision.pressureAnalysis.eastWest > 2.5) {
      events.unshift({
        id: randomUUID(),
        timestamp: Date.now(),
        level: 'WARN',
        message: `High pressure detected in E-W corridor: ${aiDecision.pressureAnalysis.eastWest}`,
      });
    }
    
    if (aiDecision.pressureAnalysis.northSouth > 2.5) {
      events.unshift({
        id: randomUUID(),
        timestamp: Date.now(),
        level: 'WARN',
        message: `High pressure detected in N-S corridor: ${aiDecision.pressureAnalysis.northSouth}`,
      });
    }
    
    // Generate guardian check events
    events.unshift({
      id: randomUUID(),
      timestamp: Date.now(),
      level: 'DEBUG',
      message: `Guardian safety check: ${aiDecision.guardianChecks.minGreenTime && aiDecision.guardianChecks.safeTransition && aiDecision.guardianChecks.systemHealth ? 'PASSED' : 'FAILED'}`,
    });
    
    // Keep only last 20 events
    return events.slice(0, 20);
  }
}
