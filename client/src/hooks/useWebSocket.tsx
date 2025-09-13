import { useState, useEffect, useRef, useCallback } from "react";
import { type TrafficSystemState } from "@shared/schema";

interface WebSocketMessage {
  type: string;
  data?: any;
  [key: string]: any;
}

export function useWebSocket() {
  const [trafficState, setTrafficState] = useState<TrafficSystemState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const port = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
      const host = window.location.hostname;
      const wsUrl = `${protocol}//${host}:${port}/ws`;
      
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
      };

      socketRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'trafficUpdate':
              setTrafficState(message.data);
              break;
            case 'simulationStarted':
            case 'simulationStopped':
            case 'simulationSpeedChanged':
              setTrafficState(message.data);
              break;
            case 'systemEvent':
              // Handle individual system events if needed
              console.log('System event:', message.data);
              break;
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socketRef.current.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect...");
          connect();
        }, 3000);
      };

      socketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      setIsConnected(false);
      
      // Retry connection after 5 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
      }
    } else {
      console.warn("WebSocket is not connected. Message not sent:", message);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setTrafficState(null);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    trafficState,
    isConnected,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
}
