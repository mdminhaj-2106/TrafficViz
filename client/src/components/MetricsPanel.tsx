import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { type TrafficMetrics, type IncomingPlatoon } from "@shared/schema";
import { Clock, Car, TrendingUp, Gauge, ArrowDown, ArrowLeft, ArrowUp, ArrowRight } from "lucide-react";

interface MetricsPanelProps {
  metrics: TrafficMetrics;
  pressureAnalysis: {
    northSouth: number;
    eastWest: number;
  };
  incomingPlatoons: IncomingPlatoon[];
}

export default function MetricsPanel({ metrics, pressureAnalysis, incomingPlatoons }: MetricsPanelProps) {
  const MetricCard = ({ 
    title, 
    value, 
    unit, 
    icon: Icon, 
    improvement, 
    testId 
  }: { 
    title: string; 
    value: number; 
    unit: string; 
    icon: any; 
    improvement: number;
    testId: string;
  }) => (
    <div className="bg-accent/30 p-4 rounded-lg border border-accent/40 hover:bg-accent/40 transition-colors" data-testid={testId}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}{unit}</div>
      <div className={`text-xs flex items-center mt-1 ${improvement > 0 ? 'text-success' : 'text-destructive'}`}>
        <TrendingUp className={`h-3 w-3 mr-1 ${improvement < 0 ? 'rotate-180' : ''}`} />
        <span>{improvement > 0 ? '+' : ''}{improvement}% from baseline</span>
      </div>
    </div>
  );

  const DirectionIcon = ({ direction }: { direction: string }) => {
    switch (direction) {
      case 'north': return <ArrowDown className="h-4 w-4" />;
      case 'east': return <ArrowLeft className="h-4 w-4" />;
      case 'south': return <ArrowUp className="h-4 w-4" />;
      case 'west': return <ArrowRight className="h-4 w-4" />;
      default: return <Car className="h-4 w-4" />;
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'north': return 'text-blue-500';
      case 'east': return 'text-red-500';
      case 'south': return 'text-green-500';
      case 'west': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Metrics */}
      <Card data-testid="metrics-panel">
        <CardHeader>
          <CardTitle>Real-time Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetricCard
            title="Average Wait Time"
            value={metrics.averageWaitTime}
            unit="s"
            icon={Clock}
            improvement={-18}
            testId="metric-wait-time"
          />
          <MetricCard
            title="Total Queue Length"
            value={metrics.totalQueueLength}
            unit=""
            icon={Car}
            improvement={-24}
            testId="metric-queue-length"
          />
          <MetricCard
            title="Throughput"
            value={metrics.throughput}
            unit=" veh/h"
            icon={TrendingUp}
            improvement={31}
            testId="metric-throughput"
          />
          <MetricCard
            title="System Efficiency"
            value={metrics.efficiency}
            unit="%"
            icon={Gauge}
            improvement={15}
            testId="metric-efficiency"
          />
        </CardContent>
      </Card>

      {/* Traffic Pressure Indicators */}
      <Card data-testid="pressure-analysis">
        <CardHeader>
          <CardTitle>Pressure Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">North-South</span>
            <div className="flex items-center space-x-2">
              <Progress 
                value={Math.min(100, (pressureAnalysis.northSouth / 4) * 100)} 
                className="w-24" 
              />
              <span className="text-sm font-mono" data-testid="pressure-ns">
                {pressureAnalysis.northSouth}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">East-West</span>
            <div className="flex items-center space-x-2">
              <Progress 
                value={Math.min(100, (pressureAnalysis.eastWest / 4) * 100)} 
                className="w-24" 
              />
              <span className="text-sm font-mono" data-testid="pressure-ew">
                {pressureAnalysis.eastWest}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ETA Predictions */}
      <Card data-testid="incoming-platoons">
        <CardHeader>
          <CardTitle>Incoming Platoons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {incomingPlatoons.map((platoon, index) => (
            <div 
              key={index} 
              className={`flex items-center justify-between p-2 rounded ${
                platoon.vehicleCount > 25 ? 'bg-destructive/10 border border-destructive/20' : 
                platoon.vehicleCount > 15 ? 'bg-warning/10 border border-warning/20' :
                'bg-accent/20'
              }`}
              data-testid={`platoon-${platoon.direction}`}
            >
              <div className="flex items-center space-x-2">
                <div className={getDirectionColor(platoon.direction)}>
                  <DirectionIcon direction={platoon.direction} />
                </div>
                <span className="text-sm capitalize">From {platoon.direction}</span>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${
                  platoon.vehicleCount > 25 ? 'text-destructive' :
                  platoon.vehicleCount > 15 ? 'text-warning' : ''
                }`}>
                  {platoon.vehicleCount} vehicles
                </div>
                <div className="text-xs text-muted-foreground">
                  ETA: {platoon.eta}s
                </div>
              </div>
            </div>
          ))}
          
          {incomingPlatoons.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No incoming platoons detected</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
