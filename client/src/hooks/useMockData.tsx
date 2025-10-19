import { useState, useEffect } from "react";
import { type TrafficSystemState } from "@shared/schema";

// Mock data for static deployment
const mockTrafficState: TrafficSystemState = {
  metrics: {
    id: "mock-metrics-1",
    timestamp: Date.now(),
    averageWaitTime: 2.9,
    totalQueueLength: 89,
    throughput: 98,
    efficiency: 70,
    northQueue: 14,
    eastQueue: 42,
    southQueue: 0,
    westQueue: 33
  },
  signalState: {
    northSouth: "red",
    eastWest: "green",
    currentPhase: "EW",
    phaseTimeRemaining: 25,
    nextPhaseTime: 45
  },
  incomingPlatoons: [
    { direction: "east", vehicleCount: 11, eta: 25, speed: 48 },
    { direction: "west", vehicleCount: 33, eta: 11, speed: 47 },
    { direction: "north", vehicleCount: 14, eta: 27, speed: 48 },
    { direction: "east", vehicleCount: 31, eta: 56, speed: 58 }
  ],
  aiDecision: {
    predictorQValues: {
      northSouth: 609.7,
      eastWest: 5252.7
    },
    recommendedAction: "EW",
    guardianChecks: {
      minGreenTime: true,
      safeTransition: true,
      systemHealth: true
    },
    timingPlan: {
      startTime: 8,
      duration: 32,
      endTime: 40
    },
    pressureAnalysis: {
      northSouth: 0.52,
      eastWest: 3.99
    }
  },
  events: [
    {
      id: "mock-event-1",
      timestamp: Date.now(),
      level: "DEBUG",
      message: "Guardian safety check: PASSED"
    },
    {
      id: "mock-event-2", 
      timestamp: Date.now() - 1000,
      level: "WARN",
      message: "High pressure detected in E-W corridor: 3.99"
    }
  ],
  isSimulationRunning: true,
  simulationSpeed: 1
};

export function useMockData() {
  const [trafficState, setTrafficState] = useState<TrafficSystemState | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Simulate connection delay
    const timer = setTimeout(() => {
      setIsConnected(true);
      setTrafficState(mockTrafficState);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!trafficState) return;

    // Simulate real-time updates
    const interval = setInterval(() => {
      setTrafficState(prevState => {
        if (!prevState) return null;

        // Update metrics with small variations
        const newMetrics = {
          ...prevState.metrics,
          timestamp: Date.now(),
          averageWaitTime: Math.max(0, prevState.metrics.averageWaitTime + (Math.random() - 0.5) * 0.5),
          totalQueueLength: Math.max(0, prevState.metrics.totalQueueLength + Math.floor((Math.random() - 0.5) * 4)),
          throughput: Math.max(50, prevState.metrics.throughput + Math.floor((Math.random() - 0.5) * 10)),
          efficiency: Math.max(30, Math.min(95, prevState.metrics.efficiency + (Math.random() - 0.5) * 2)),
          northQueue: Math.max(0, prevState.metrics.northQueue + Math.floor((Math.random() - 0.5) * 3)),
          eastQueue: Math.max(0, prevState.metrics.eastQueue + Math.floor((Math.random() - 0.5) * 5)),
          southQueue: Math.max(0, prevState.metrics.southQueue + Math.floor((Math.random() - 0.5) * 2)),
          westQueue: Math.max(0, prevState.metrics.westQueue + Math.floor((Math.random() - 0.5) * 4))
        };

        // Update signal timing
        const newSignalState = {
          ...prevState.signalState,
          phaseTimeRemaining: Math.max(0, prevState.signalState.phaseTimeRemaining - 1)
        };

        // Update platoon ETAs
        const newPlatoons = prevState.incomingPlatoons.map(platoon => ({
          ...platoon,
          eta: Math.max(0, platoon.eta - 1),
          vehicleCount: Math.max(1, platoon.vehicleCount + Math.floor((Math.random() - 0.5) * 2))
        })).filter(platoon => platoon.eta > 0 || platoon.vehicleCount > 0);

        // Add new platoons occasionally
        if (Math.random() < 0.1 && newPlatoons.length < 6) {
          const directions = ["north", "east", "south", "west"];
          const direction = directions[Math.floor(Math.random() * directions.length)];
          newPlatoons.push({
            direction,
            vehicleCount: Math.floor(Math.random() * 25) + 5,
            eta: Math.floor(Math.random() * 60) + 10,
            speed: Math.floor(Math.random() * 20) + 40
          });
        }

        // Update AI decision with variations
        const newAiDecision = {
          ...prevState.aiDecision,
          predictorQValues: {
            northSouth: Math.max(0, prevState.aiDecision.predictorQValues.northSouth + (Math.random() - 0.5) * 50),
            eastWest: Math.max(0, prevState.aiDecision.predictorQValues.eastWest + (Math.random() - 0.5) * 100)
          },
          pressureAnalysis: {
            northSouth: Math.max(0, prevState.aiDecision.pressureAnalysis.northSouth + (Math.random() - 0.5) * 0.2),
            eastWest: Math.max(0, prevState.aiDecision.pressureAnalysis.eastWest + (Math.random() - 0.5) * 0.5)
          }
        };

        return {
          ...prevState,
          metrics: newMetrics,
          signalState: newSignalState,
          incomingPlatoons: newPlatoons,
          aiDecision: newAiDecision,
          events: prevState.events.slice(0, 15) // Keep only recent events
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [trafficState]);

  const sendMessage = (message: any) => {
    console.log("Mock mode - message would be sent:", message);
  };

  return {
    trafficState,
    isConnected,
    sendMessage
  };
}
