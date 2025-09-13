import { type TrafficSystemState, type IncomingPlatoon, type TrafficMetrics, type SystemEvent } from "@shared/schema";
import { AIEngine } from "./aiEngine";
import { randomUUID } from "crypto";

export class TrafficSimulation {
  private aiEngine = new AIEngine();
  private simulationInterval?: NodeJS.Timeout;
  private phaseChangeTime = Date.now();
  private currentTime = 0;
  
  constructor(private onStateUpdate: (state: TrafficSystemState) => void) {}
  
  start(initialState: TrafficSystemState): void {
    this.stop();
    
    this.simulationInterval = setInterval(() => {
      this.simulationStep(initialState);
    }, 1000 / initialState.simulationSpeed);
  }
  
  stop(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = undefined;
    }
  }
  
  private simulationStep(state: TrafficSystemState): void {
    this.currentTime += 1;
    
    // Update platoons (simulate movement)
    const updatedPlatoons = this.updatePlatoons(state.incomingPlatoons);
    
    // Generate new random platoons occasionally
    if (Math.random() < 0.1) {
      updatedPlatoons.push(this.generateRandomPlatoon());
    }
    
    // Update AI decision
    const aiDecision = this.aiEngine.makeDecision(
      updatedPlatoons,
      state.signalState,
      true
    );
    
    // Update traffic signals based on AI decision
    const updatedSignalState = this.updateTrafficSignals(state.signalState, aiDecision);
    
    // Calculate new metrics based on current state
    const updatedMetrics = this.calculateMetrics(state.metrics, updatedPlatoons, updatedSignalState);
    
    // Generate system events
    const events = this.generateSystemEvents(state, aiDecision);
    
    const updatedState: TrafficSystemState = {
      ...state,
      metrics: updatedMetrics,
      signalState: updatedSignalState,
      incomingPlatoons: updatedPlatoons,
      aiDecision,
      events,
    };
    
    this.onStateUpdate(updatedState);
  }
  
  private updatePlatoons(platoons: IncomingPlatoon[]): IncomingPlatoon[] {
    return platoons
      .map(platoon => ({
        ...platoon,
        eta: Math.max(0, platoon.eta - 1)
      }))
      .filter(platoon => platoon.eta > 0); // Remove arrived platoons
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
    
    // Simulate wait time based on queue length and signal state
    let averageWaitTime = currentMetrics.averageWaitTime;
    if (signalState.currentPhase === 'NS') {
      averageWaitTime = (northQueue + southQueue) * 0.5 + (eastQueue + westQueue) * 1.2;
    } else {
      averageWaitTime = (eastQueue + westQueue) * 0.5 + (northQueue + southQueue) * 1.2;
    }
    
    // Calculate throughput (vehicles per minute)
    const throughput = Math.max(100, 180 - (totalQueueLength * 2));
    
    // Calculate efficiency based on optimal vs actual performance
    const efficiency = Math.max(60, Math.min(95, 90 - (averageWaitTime - 20)));
    
    return {
      id: randomUUID(),
      timestamp: Date.now(),
      averageWaitTime: Math.round(averageWaitTime * 10) / 10,
      totalQueueLength,
      throughput,
      efficiency: Math.round(efficiency * 10) / 10,
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
