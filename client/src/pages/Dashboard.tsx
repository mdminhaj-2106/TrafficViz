import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
// import TrafficVisualization from "@/components/TrafficVisualization";
// import MetricsPanel from "@/components/MetricsPanel";
// import AIDecisionPanel from "@/components/AIDecisionPanel";
// import PerformanceCharts from "@/components/PerformanceCharts";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useTrafficData } from "@/hooks/useTrafficData";
import { TrafficCone, Play, Pause, Download, Clock } from "lucide-react";

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const { trafficState, sendMessage, isConnected } = useWebSocket();
  const { data: trafficHistory } = useTrafficData();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync local simulationSpeed with trafficState from WebSocket
  useEffect(() => {
    if (trafficState && trafficState.simulationSpeed !== simulationSpeed) {
      setSimulationSpeed(trafficState.simulationSpeed);
    }
  }, [trafficState?.simulationSpeed, simulationSpeed]);

  const handleStartSimulation = () => {
    sendMessage({ type: 'startSimulation', speed: simulationSpeed });
  };

  const handleStopSimulation = () => {
    sendMessage({ type: 'stopSimulation' });
  };

  const handleSpeedChange = (value: number[]) => {
    const newSpeed = value[0];
    setSimulationSpeed(newSpeed);
    sendMessage({ type: 'setSimulationSpeed', speed: newSpeed });
  };

  const handleExportData = () => {
    if (trafficState) {
      const dataStr = JSON.stringify(trafficState, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `traffic-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    }
  };

  if (!trafficState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <TrafficCone className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Connecting to TrafficCone System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm" data-testid="header-main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <TrafficCone className="h-8 w-8 text-primary" />
                <h1 className="text-xl font-bold text-foreground">Predictive Guardian TrafficCone System</h1>
              </div>
              <div className="flex items-center space-x-2 ml-8">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
                <span className="text-sm text-muted-foreground">
                  {isConnected ? 'System Active' : 'System Offline'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                AI Model: Active
              </Badge>
              <div className="text-sm text-muted-foreground flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span data-testid="current-time">{currentTime}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TrafficCone Visualization */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🧪 Traffic Visualization (Testing Mode)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-lg text-muted-foreground">TrafficVisualization component disabled for testing</p>
                    <p className="text-sm">THREE.js visualization placeholder</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>🧪 AI Decision Panel (Testing Mode)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">AIDecisionPanel component disabled for testing</p>
              </CardContent>
            </Card>
          </div>

          {/* Metrics and Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🧪 Metrics Panel (Testing Mode)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">MetricsPanel component disabled for testing</p>
              </CardContent>
            </Card>
            
            {/* Control Panel */}
            <Card data-testid="control-panel">
              <CardHeader>
                <CardTitle>System Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">AI Mode</span>
                  <Switch 
                    checked={true} 
                    data-testid="switch-ai-mode"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">
                    Simulation Speed: {simulationSpeed}x
                  </label>
                  <Slider
                    value={[simulationSpeed]}
                    onValueChange={handleSpeedChange}
                    min={0.5}
                    max={3}
                    step={0.5}
                    className="w-full"
                    data-testid="slider-simulation-speed"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0.5x</span>
                    <span>1x</span>
                    <span>3x</span>
                  </div>
                </div>
                
                <Button 
                  onClick={trafficState.isSimulationRunning ? handleStopSimulation : handleStartSimulation}
                  className="w-full"
                  variant={trafficState.isSimulationRunning ? "destructive" : "default"}
                  data-testid={trafficState.isSimulationRunning ? "button-stop" : "button-start"}
                >
                  {trafficState.isSimulationRunning ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Stop Simulation
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Simulation
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleExportData}
                  variant="secondary"
                  className="w-full"
                  data-testid="button-export"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Performance Charts */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>🧪 Performance Charts (Testing Mode)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">PerformanceCharts component disabled for testing</p>
              <p className="text-sm text-muted-foreground">Chart.js visualization placeholder</p>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <div className="mt-8">
          <Card data-testid="system-status">
            <CardHeader>
              <CardTitle>System Status & Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-success/10 p-4 rounded-lg border border-success/20">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-success rounded-full" />
                    <span className="font-semibold text-success-foreground">IoT Sensors</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">All 12 sensors online</p>
                </div>
                <div className="bg-success/10 p-4 rounded-lg border border-success/20">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-success rounded-full" />
                    <span className="font-semibold text-success-foreground">AI Model</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">DQN running optimally</p>
                </div>
                <div className="bg-success/10 p-4 rounded-lg border border-success/20">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-success rounded-full" />
                    <span className="font-semibold text-success-foreground">TrafficCone Signals</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">All signals responsive</p>
                </div>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold text-foreground mb-3">Recent System Events</h4>
                <div className="space-y-2 text-sm font-mono max-h-40 overflow-y-auto">
                  {trafficState.events.map(event => (
                    <div key={event.id} className="flex items-center space-x-2" data-testid={`event-${event.level.toLowerCase()}`}>
                      <span className="text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge 
                        variant={event.level === 'ERROR' ? 'destructive' : 
                                event.level === 'WARN' ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {event.level}
                      </Badge>
                      <span className="flex-1">{event.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
