import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import TrafficVisualization from "@/components/TrafficVisualization";
import AIDecisionPanel from "@/components/AIDecisionPanel";
import PerformanceCharts from "@/components/PerformanceCharts";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useTrafficData } from "@/hooks/useTrafficData";
import { useMockData } from "@/hooks/useMockData";
import { TrafficCone, Play, Pause, Download, Clock, Activity, Zap, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [showFallback, setShowFallback] = useState(false);
  const { trafficState: wsTrafficState, sendMessage: wsSendMessage, isConnected: wsIsConnected } = useWebSocket();
  const { data: trafficHistory } = useTrafficData();
  const { trafficState: mockTrafficState, isConnected: mockIsConnected, sendMessage: mockSendMessage } = useMockData();
  
  // Use WebSocket data if available, otherwise use mock data
  const trafficState = wsTrafficState || mockTrafficState;
  const isConnected = wsIsConnected || mockIsConnected;
  const sendMessage = wsSendMessage || mockSendMessage;

  // Debug logging
  console.log('Dashboard render:', { trafficState: !!trafficState, isConnected });

  // Show fallback after 10 seconds if no connection
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!trafficState) {
        setShowFallback(true);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [trafficState]);

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

  if (!trafficState && !showFallback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 bg-blue-500 rounded-lg mx-auto mb-4 w-fit">
            <TrafficCone className="h-16 w-16 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">TrafficViz</h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">Connecting to traffic system...</p>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
          <div className="mt-4 text-sm text-slate-500">
            WebSocket Status: {isConnected ? 'Connected' : 'Connecting...'}
          </div>
        </div>
      </div>
    );
  }

  // Fallback UI when WebSocket fails to connect
  if (!trafficState && showFallback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <TrafficCone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">TrafficViz</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">AI-Powered Traffic Management</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-slate-600 dark:text-slate-300">Offline</span>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="p-4 bg-orange-500 rounded-lg mx-auto mb-4 w-fit">
              <TrafficCone className="h-16 w-16 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Connection Issue</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">
              Unable to connect to the traffic simulation server.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Please check that the server is running and try refreshing the page.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Simplified Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm" data-testid="header-main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <TrafficCone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">TrafficViz</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">AI-Powered Traffic Management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span data-testid="current-time">{currentTime}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Average Wait Time</p>
                  <p className="text-2xl font-bold">{trafficState.metrics.averageWaitTime.toFixed(1)}s</p>
                </div>
                <Clock className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Throughput</p>
                  <p className="text-2xl font-bold">{trafficState.metrics.throughput} veh/h</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Total Queue</p>
                  <p className="text-2xl font-bold">{trafficState.metrics.totalQueueLength}</p>
                </div>
                <Activity className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Efficiency</p>
                  <p className="text-2xl font-bold">{trafficState.metrics.efficiency}%</p>
                </div>
                <Zap className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Traffic Visualization - Main Focus */}
          <div className="lg:col-span-2">
            <TrafficVisualization 
              signalState={trafficState.signalState}
              incomingPlatoons={trafficState.incomingPlatoons}
              metrics={trafficState.metrics}
            />
          </div>

          {/* Controls and AI Panel */}
          <div className="space-y-6">
            {/* Control Panel */}
            <Card className="bg-white dark:bg-slate-800 shadow-lg border-0" data-testid="control-panel">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
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
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>0.5x</span>
                    <span>1x</span>
                    <span>3x</span>
                  </div>
                </div>
                
                <Button 
                  onClick={trafficState.isSimulationRunning ? handleStopSimulation : handleStartSimulation}
                  className="w-full h-12 text-base font-medium"
                  variant={trafficState.isSimulationRunning ? "destructive" : "default"}
                  data-testid={trafficState.isSimulationRunning ? "button-stop" : "button-start"}
                >
                  {trafficState.isSimulationRunning ? (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      Stop Simulation
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Start Simulation
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleExportData}
                  variant="outline"
                  className="w-full"
                  data-testid="button-export"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </CardContent>
            </Card>

            {/* Simplified AI Decision Panel */}
            <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white flex items-center">
                  <Zap className="h-5 w-5 text-blue-500 mr-2" />
                  AI Decision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Current Phase</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {trafficState.signalState.currentPhase}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Time Remaining</span>
                      <span className="font-mono text-sm">{trafficState.signalState.phaseTimeRemaining}s</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">N-S Q-Value:</span>
                      <span className="font-mono">{trafficState.aiDecision.predictorQValues.northSouth.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">E-W Q-Value:</span>
                      <span className="font-mono font-semibold text-green-600">
                        {trafficState.aiDecision.predictorQValues.eastWest.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Guardian Status</span>
                      <div className="flex items-center space-x-1">
                        {Object.values(trafficState.aiDecision.guardianChecks).every(check => check) ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-600 font-medium">Safe</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-xs text-red-600 font-medium">Warning</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Performance Charts */}
        <div className="mt-8">
          <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceCharts 
                currentMetrics={trafficState.metrics}
                historicalData={trafficHistory || []}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
