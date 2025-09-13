import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { TrafficSimulation } from "./services/trafficSimulation";
import { SimulationOrchestrator } from "./services/simulationOrchestrator";
import { type TrafficSystemState, type NetworkState } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Simulation instances
  let trafficSimulation: TrafficSimulation | null = null;
  let simulationOrchestrator: SimulationOrchestrator | null = null;
  
  // WebSocket connections
  const connections = new Set<WebSocket>();
  
  // Broadcast function
  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  };
  
  // Initialize appropriate simulation based on mode
  const initializeSimulation = async () => {
    const mode = await storage.getNetworkMode();
    
    if (mode === 'network') {
      // Initialize network orchestrator
      let networkState = await storage.getNetworkState();
      
      // Initialize network if empty
      if (Object.keys(networkState.intersections).length === 0) {
        networkState = await storage.initializeNetwork('grid-2x2');
      }
      
      simulationOrchestrator = new SimulationOrchestrator((updatedState: NetworkState) => {
        storage.updateNetworkState(updatedState);
        broadcast({ type: 'networkUpdate', data: updatedState });
      });
      
      if (networkState.isSimulationRunning) {
        simulationOrchestrator.start(networkState);
      }
    } else {
      // Initialize single intersection mode
      const initialState = await storage.getCurrentTrafficState();
      
      trafficSimulation = new TrafficSimulation((updatedState: TrafficSystemState) => {
        storage.updateTrafficState(updatedState);
        broadcast({ type: 'trafficUpdate', data: updatedState });
      });
      
      if (initialState.isSimulationRunning) {
        trafficSimulation.start(initialState);
      }
    }
  };
  
  // WebSocket connection handling
  wss.on('connection', async (ws) => {
    connections.add(ws);
    
    // Send initial state based on mode
    const mode = await storage.getNetworkMode();
    if (mode === 'network') {
      const networkState = await storage.getNetworkState();
      ws.send(JSON.stringify({ type: 'networkUpdate', data: networkState }));
    } else {
      const currentState = await storage.getCurrentTrafficState();
      ws.send(JSON.stringify({ type: 'trafficUpdate', data: currentState }));
    }
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        const mode = await storage.getNetworkMode();
        
        if (data.type === 'startSimulation') {
          if (mode === 'network') {
            const networkState = await storage.getNetworkState();
            networkState.isSimulationRunning = true;
            networkState.simulationSpeed = data.speed || 1.0;
            await storage.updateNetworkState(networkState);
            
            if (simulationOrchestrator) {
              simulationOrchestrator.start(networkState);
            }
            
            broadcast({ type: 'networkSimulationStarted', data: networkState });
          } else {
            const state = await storage.getCurrentTrafficState();
            state.isSimulationRunning = true;
            state.simulationSpeed = data.speed || 1.0;
            await storage.updateTrafficState(state);
            
            if (trafficSimulation) {
              trafficSimulation.start(state);
            }
            
            broadcast({ type: 'simulationStarted', data: state });
          }
        } else if (data.type === 'stopSimulation') {
          if (mode === 'network') {
            const networkState = await storage.getNetworkState();
            networkState.isSimulationRunning = false;
            await storage.updateNetworkState(networkState);
            
            if (simulationOrchestrator) {
              simulationOrchestrator.stop();
            }
            
            broadcast({ type: 'networkSimulationStopped', data: networkState });
          } else {
            const state = await storage.getCurrentTrafficState();
            state.isSimulationRunning = false;
            await storage.updateTrafficState(state);
            
            if (trafficSimulation) {
              trafficSimulation.stop();
            }
            
            broadcast({ type: 'simulationStopped', data: state });
          }
        } else if (data.type === 'setSimulationSpeed') {
          if (mode === 'network') {
            const networkState = await storage.getNetworkState();
            networkState.simulationSpeed = data.speed;
            await storage.updateNetworkState(networkState);
            
            if (simulationOrchestrator && networkState.isSimulationRunning) {
              simulationOrchestrator.stop();
              simulationOrchestrator.start(networkState);
            }
            
            broadcast({ type: 'networkSimulationSpeedChanged', data: networkState });
          } else {
            const state = await storage.getCurrentTrafficState();
            state.simulationSpeed = data.speed;
            await storage.updateTrafficState(state);
            
            if (trafficSimulation && state.isSimulationRunning) {
              trafficSimulation.stop();
              trafficSimulation.start(state);
            }
            
            broadcast({ type: 'simulationSpeedChanged', data: state });
          }
        } else if (data.type === 'switchMode') {
          // Switch between single and network modes
          const newMode = data.mode === 'network' ? 'network' : 'single';
          
          // Stop current simulation
          if (trafficSimulation) {
            trafficSimulation.stop();
            trafficSimulation = null;
          }
          if (simulationOrchestrator) {
            simulationOrchestrator.stop();
            simulationOrchestrator = null;
          }
          
          // Update mode
          await storage.setNetworkMode(newMode);
          
          // Initialize new mode
          await initializeSimulation();
          
          // Send appropriate state
          if (newMode === 'network') {
            const networkState = await storage.getNetworkState();
            broadcast({ type: 'modeChanged', data: { mode: newMode, state: networkState } });
          } else {
            const state = await storage.getCurrentTrafficState();
            broadcast({ type: 'modeChanged', data: { mode: newMode, state } });
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      connections.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connections.delete(ws);
    });
  });
  
  // REST API routes
  app.get('/api/traffic/state', async (req, res) => {
    try {
      const state = await storage.getCurrentTrafficState();
      res.json(state);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get traffic state' });
    }
  });
  
  app.get('/api/traffic/history/:hours', async (req, res) => {
    try {
      const hours = parseInt(req.params.hours);
      const history = await storage.getTrafficHistory(hours);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get traffic history' });
    }
  });
  
  // Network API routes
  app.get('/api/network/state', async (req, res) => {
    try {
      const networkState = await storage.getNetworkState();
      res.json(networkState);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get network state' });
    }
  });
  
  app.get('/api/network/mode', async (req, res) => {
    try {
      const mode = await storage.getNetworkMode();
      res.json({ mode });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get network mode' });
    }
  });
  
  app.post('/api/network/mode', async (req, res) => {
    try {
      const { mode } = req.body;
      if (mode !== 'single' && mode !== 'network') {
        return res.status(400).json({ message: 'Invalid mode. Must be "single" or "network"' });
      }
      
      await storage.setNetworkMode(mode);
      
      // Reinitialize simulation with new mode
      if (trafficSimulation) {
        trafficSimulation.stop();
        trafficSimulation = null;
      }
      if (simulationOrchestrator) {
        simulationOrchestrator.stop();
        simulationOrchestrator = null;
      }
      
      await initializeSimulation();
      
      res.json({ mode, message: 'Mode changed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to change network mode' });
    }
  });
  
  app.post('/api/network/initialize/:layout', async (req, res) => {
    try {
      const layout = req.params.layout as 'grid-2x2' | 'custom';
      if (layout !== 'grid-2x2' && layout !== 'custom') {
        return res.status(400).json({ message: 'Invalid layout. Must be "grid-2x2" or "custom"' });
      }
      
      const networkState = await storage.initializeNetwork(layout);
      
      // Restart orchestrator if running
      if (simulationOrchestrator) {
        simulationOrchestrator.stop();
        if (networkState.isSimulationRunning) {
          simulationOrchestrator.start(networkState);
        }
      }
      
      broadcast({ type: 'networkInitialized', data: networkState });
      res.json(networkState);
    } catch (error) {
      res.status(500).json({ message: 'Failed to initialize network' });
    }
  });
  
  app.get('/api/network/intersections', async (req, res) => {
    try {
      const intersections = await storage.getAllIntersections();
      res.json(intersections);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get intersections' });
    }
  });
  
  app.get('/api/network/vehicles', async (req, res) => {
    try {
      const vehicles = await storage.getAllVehicles();
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get vehicles' });
    }
  });
  
  app.get('/api/network/roads', async (req, res) => {
    try {
      const roads = await storage.getAllRoads();
      res.json(roads);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get roads' });
    }
  });
  
  app.post('/api/network/vehicle/spawn', async (req, res) => {
    try {
      const vehicle = await storage.spawnRandomVehicle();
      broadcast({ type: 'vehicleSpawned', data: vehicle });
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ message: 'Failed to spawn vehicle' });
    }
  });
  
  app.delete('/api/network/vehicles/cleanup', async (req, res) => {
    try {
      const cleanedCount = await storage.cleanupCompletedVehicles();
      res.json({ cleanedCount, message: `Cleaned up ${cleanedCount} completed vehicles` });
    } catch (error) {
      res.status(500).json({ message: 'Failed to cleanup vehicles' });
    }
  });
  
  app.get('/api/system/events/:limit?', async (req, res) => {
    try {
      const limit = parseInt(req.params.limit || '50');
      const events = await storage.getSystemEvents(limit);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get system events' });
    }
  });
  
  app.post('/api/system/event', async (req, res) => {
    try {
      const event = await storage.addSystemEvent(req.body);
      broadcast({ type: 'systemEvent', data: event });
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: 'Failed to add system event' });
    }
  });
  
  // Initialize simulation on server start
  initializeSimulation();
  
  return httpServer;
}
