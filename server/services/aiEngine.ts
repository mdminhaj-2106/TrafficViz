import { type AIDecisionData, type IncomingPlatoon, type TrafficSignalState } from "@shared/schema";

export class PredictorDQN {
  private qTable: Map<string, { NS: number; EW: number }> = new Map();
  private learningRate = 0.1;
  private explorationRate = 0.2;
  
  constructor() {
    // Initialize with more sophisticated Q-values based on traffic patterns
    this.qTable.set('high_ew_pressure', { NS: 85.1, EW: 340.9 });
    this.qTable.set('high_ns_pressure', { NS: 280.5, EW: 120.3 });
    this.qTable.set('balanced_pressure', { NS: 150.2, EW: 148.7 });
    this.qTable.set('very_high_ew_pressure', { NS: 45.2, EW: 450.8 });
    this.qTable.set('very_high_ns_pressure', { NS: 380.6, EW: 85.4 });
    this.qTable.set('low_traffic', { NS: 120.0, EW: 125.0 });
  }

  private calculatePressure(platoons: IncomingPlatoon[], direction: 'NS' | 'EW'): number {
    const relevantPlatoons = platoons.filter(p => {
      if (direction === 'NS') return p.direction === 'north' || p.direction === 'south';
      return p.direction === 'east' || p.direction === 'west';
    });

    return relevantPlatoons.reduce((pressure, platoon) => {
      return pressure + (platoon.vehicleCount / Math.max(platoon.eta, 1));
    }, 0);
  }

  private getStateKey(nsPressure: number, ewPressure: number): string {
    const totalPressure = nsPressure + ewPressure;
    const ratio = ewPressure / (nsPressure + 0.1);
    
    if (totalPressure < 1.0) return 'low_traffic';
    if (ratio > 3.0) return 'very_high_ew_pressure';
    if (ratio > 2.0) return 'high_ew_pressure';
    if (ratio < 0.33) return 'very_high_ns_pressure';
    if (ratio < 0.5) return 'high_ns_pressure';
    return 'balanced_pressure';
  }

  predict(platoons: IncomingPlatoon[], currentSignal: TrafficSignalState): { NS: number; EW: number; recommended: 'NS' | 'EW' } {
    const nsPressure = this.calculatePressure(platoons, 'NS');
    const ewPressure = this.calculatePressure(platoons, 'EW');
    
    const stateKey = this.getStateKey(nsPressure, ewPressure);
    const qValues = this.qTable.get(stateKey) || { NS: 100, EW: 100 };
    
    // Add strategic randomness for exploration, but favor high-pressure directions
    const pressureBonus = {
      NS: nsPressure * 20,
      EW: ewPressure * 20
    };
    
    const explorationNoise = {
      NS: (Math.random() - 0.5) * this.explorationRate * 20,
      EW: (Math.random() - 0.5) * this.explorationRate * 20
    };
    
    const finalQValues = {
      NS: qValues.NS + pressureBonus.NS + explorationNoise.NS,
      EW: qValues.EW + pressureBonus.EW + explorationNoise.EW
    };
    
    // Learn from current situation
    this.updateQValues(stateKey, finalQValues.NS, finalQValues.EW);
    
    const recommended = finalQValues.EW > finalQValues.NS ? 'EW' : 'NS';
    
    return {
      NS: Math.round(finalQValues.NS * 10) / 10,
      EW: Math.round(finalQValues.EW * 10) / 10,
      recommended
    };
  }
  
  private updateQValues(stateKey: string, nsValue: number, ewValue: number): void {
    const current = this.qTable.get(stateKey) || { NS: 100, EW: 100 };
    
    // Simple Q-learning update
    current.NS = current.NS + this.learningRate * (nsValue - current.NS);
    current.EW = current.EW + this.learningRate * (ewValue - current.EW);
    
    this.qTable.set(stateKey, current);
  }
}

export class GuardianSafety {
  private lastPhaseChangeTime = Date.now();
  private readonly MIN_GREEN_TIME = 5000; // Reduced to 5 seconds for better responsiveness
  private readonly MAX_GREEN_TIME = 45000; // Maximum 45 seconds to prevent starvation
  
  validateDecision(
    recommendation: 'NS' | 'EW',
    currentSignal: TrafficSignalState,
    systemHealth: boolean = true
  ): {
    minGreenTime: boolean;
    safeTransition: boolean;
    systemHealth: boolean;
    approved: boolean;
  } {
    const now = Date.now();
    const timeInPhase = now - this.lastPhaseChangeTime;
    
    const checks = {
      minGreenTime: timeInPhase >= this.MIN_GREEN_TIME,
      safeTransition: this.canSafelyTransition(currentSignal, recommendation),
      systemHealth: systemHealth,
      approved: false
    };
    
    // Override minGreenTime if we've been in phase too long (prevent starvation)
    if (timeInPhase >= this.MAX_GREEN_TIME) {
      checks.minGreenTime = true;
    }
    
    checks.approved = checks.minGreenTime && checks.safeTransition && checks.systemHealth;
    
    if (checks.approved && currentSignal.currentPhase !== recommendation) {
      this.lastPhaseChangeTime = now;
    }
    
    return checks;
  }
  
  private canSafelyTransition(current: TrafficSignalState, target: 'NS' | 'EW'): boolean {
    // Always allow staying in current phase
    if (current.currentPhase === target) return true;
    
    // Check if we're not in a conflicting state
    if (current.northSouth === 'yellow' || current.eastWest === 'yellow') {
      return false; // Wait for yellow to clear
    }
    
    return true;
  }
}

export class AIEngine {
  private predictor = new PredictorDQN();
  private guardian = new GuardianSafety();
  
  makeDecision(
    platoons: IncomingPlatoon[],
    currentSignal: TrafficSignalState,
    systemHealth: boolean = true
  ): AIDecisionData {
    const prediction = this.predictor.predict(platoons, currentSignal);
    const guardianChecks = this.guardian.validateDecision(
      prediction.recommended,
      currentSignal,
      systemHealth
    );
    
    // Calculate timing plan more intelligently
    const vehicleLoad = this.calculateVehicleLoad(platoons, prediction.recommended);
    const saturationFlow = 2.5; // Increased throughput - vehicles per second
    const baseDuration = Math.max(8, Math.min(35, vehicleLoad / saturationFlow)); // Constrained duration
    const bufferTime = 2; // Reduced buffer for faster response
    const totalDuration = baseDuration + bufferTime;
    
    const startTime = Math.max(0, this.calculateOptimalStartTime(platoons, prediction.recommended));
    
    // Calculate pressure analysis
    const nsPressure = platoons
      .filter(p => p.direction === 'north' || p.direction === 'south')
      .reduce((sum, p) => sum + (p.vehicleCount / Math.max(p.eta, 1)), 0);
    
    const ewPressure = platoons
      .filter(p => p.direction === 'east' || p.direction === 'west')
      .reduce((sum, p) => sum + (p.vehicleCount / Math.max(p.eta, 1)), 0);
    
    return {
      predictorQValues: {
        northSouth: prediction.NS,
        eastWest: prediction.EW,
      },
      recommendedAction: guardianChecks.approved ? prediction.recommended : 'HOLD',
      guardianChecks: {
        minGreenTime: guardianChecks.minGreenTime,
        safeTransition: guardianChecks.safeTransition,
        systemHealth: guardianChecks.systemHealth,
      },
      timingPlan: {
        startTime,
        duration: Math.round(totalDuration),
        endTime: startTime + Math.round(totalDuration),
      },
      pressureAnalysis: {
        northSouth: Math.round(nsPressure * 100) / 100,
        eastWest: Math.round(ewPressure * 100) / 100,
      },
    };
  }
  
  private calculateVehicleLoad(platoons: IncomingPlatoon[], phase: 'NS' | 'EW'): number {
    return platoons
      .filter(p => {
        if (phase === 'NS') return p.direction === 'north' || p.direction === 'south';
        return p.direction === 'east' || p.direction === 'west';
      })
      .reduce((sum, p) => sum + p.vehicleCount, 0);
  }
  
  private calculateOptimalStartTime(platoons: IncomingPlatoon[], phase: 'NS' | 'EW'): number {
    const relevantPlatoons = platoons.filter(p => {
      if (phase === 'NS') return p.direction === 'north' || p.direction === 'south';
      return p.direction === 'east' || p.direction === 'west';
    });
    
    if (relevantPlatoons.length === 0) return 0;
    
    // Start just before the first platoon arrives
    const earliestETA = Math.min(...relevantPlatoons.map(p => p.eta));
    return Math.max(0, earliestETA - 3);
  }
}
