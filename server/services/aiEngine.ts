import { type AIDecisionData, type IncomingPlatoon, type TrafficSignalState } from "@shared/schema";

export class PredictorDQN {
  private qTable: Map<string, { NS: number; EW: number }> = new Map();
  
  constructor() {
    // Initialize with some learned Q-values
    this.qTable.set('high_ew_pressure', { NS: 85.1, EW: 340.9 });
    this.qTable.set('high_ns_pressure', { NS: 280.5, EW: 120.3 });
    this.qTable.set('balanced_pressure', { NS: 150.2, EW: 148.7 });
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
    const ratio = ewPressure / (nsPressure + 0.1);
    
    if (ratio > 2.0) return 'high_ew_pressure';
    if (ratio < 0.5) return 'high_ns_pressure';
    return 'balanced_pressure';
  }

  predict(platoons: IncomingPlatoon[], currentSignal: TrafficSignalState): { NS: number; EW: number; recommended: 'NS' | 'EW' } {
    const nsPressure = this.calculatePressure(platoons, 'NS');
    const ewPressure = this.calculatePressure(platoons, 'EW');
    
    const stateKey = this.getStateKey(nsPressure, ewPressure);
    const qValues = this.qTable.get(stateKey) || { NS: 100, EW: 100 };
    
    // Add some randomness and learning
    qValues.NS += Math.random() * 10 - 5;
    qValues.EW += Math.random() * 10 - 5;
    
    const recommended = qValues.EW > qValues.NS ? 'EW' : 'NS';
    
    return {
      NS: Math.round(qValues.NS * 10) / 10,
      EW: Math.round(qValues.EW * 10) / 10,
      recommended
    };
  }
}

export class GuardianSafety {
  private lastPhaseChangeTime = Date.now();
  private readonly MIN_GREEN_TIME = 7000; // 7 seconds
  
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
    
    // Calculate timing plan
    const vehicleLoad = this.calculateVehicleLoad(platoons, prediction.recommended);
    const saturationFlow = 2; // vehicles per second
    const baseDuration = Math.max(10, vehicleLoad / saturationFlow);
    const bufferTime = 3;
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
