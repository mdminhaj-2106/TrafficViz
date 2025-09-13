import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { TrafficSimulation } from "./services/trafficSimulation";
import { type TrafficSystemState } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Traffic simulation instance
  let trafficSimulation: TrafficSimulation | null = null;
  
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
  
  // Initialize traffic simulation
  const initializeSimulation = async () => {
    const initialState = await storage.getCurrentTrafficState();
    
    trafficSimulation = new TrafficSimulation((updatedState: TrafficSystemState) => {
      storage.updateTrafficState(updatedState);
      broadcast({ type: 'trafficUpdate', data: updatedState });
    });
    
    if (initialState.isSimulationRunning) {
      trafficSimulation.start(initialState);
    }
  };
  
  // WebSocket connection handling
  wss.on('connection', async (ws) => {
    connections.add(ws);
    
    // Send initial state
    const currentState = await storage.getCurrentTrafficState();
    ws.send(JSON.stringify({ type: 'trafficUpdate', data: currentState }));
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'startSimulation') {
          const state = await storage.getCurrentTrafficState();
          state.isSimulationRunning = true;
          state.simulationSpeed = data.speed || 1.0;
          await storage.updateTrafficState(state);
          
          if (trafficSimulation) {
            trafficSimulation.start(state);
          }
          
          broadcast({ type: 'simulationStarted', data: state });
        } else if (data.type === 'stopSimulation') {
          const state = await storage.getCurrentTrafficState();
          state.isSimulationRunning = false;
          await storage.updateTrafficState(state);
          
          if (trafficSimulation) {
            trafficSimulation.stop();
          }
          
          broadcast({ type: 'simulationStopped', data: state });
        } else if (data.type === 'setSimulationSpeed') {
          const state = await storage.getCurrentTrafficState();
          state.simulationSpeed = data.speed;
          await storage.updateTrafficState(state);
          
          if (trafficSimulation && state.isSimulationRunning) {
            trafficSimulation.stop();
            trafficSimulation.start(state);
          }
          
          broadcast({ type: 'simulationSpeedChanged', data: state });
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
