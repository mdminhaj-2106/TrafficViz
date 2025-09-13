import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type AIDecisionData } from "@shared/schema";
import { Brain, Shield, CheckCircle, XCircle, Clock, Zap } from "lucide-react";

interface AIDecisionPanelProps {
  aiDecision: AIDecisionData;
}

export default function AIDecisionPanel({ aiDecision }: AIDecisionPanelProps) {
  const getStatusIcon = (passed: boolean) => 
    passed ? <CheckCircle className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />;

  const getStatusColor = (passed: boolean) => 
    passed ? 'text-success' : 'text-destructive';

  return (
    <Card data-testid="ai-decision-panel">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="h-5 w-5 text-primary mr-2" />
          AI Decision Process
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Predictor Status */}
          <div className="bg-accent/50 p-4 rounded-lg" data-testid="predictor-status">
            <h4 className="font-semibold text-accent-foreground mb-3 flex items-center">
              <Brain className="h-4 w-4 text-primary mr-2" />
              The Predictor (DQN)
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Q-Value (N-S):</span>
                <span className="font-mono" data-testid="q-value-ns">
                  {aiDecision.predictorQValues.northSouth}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Q-Value (E-W):</span>
                <span className={`font-mono ${
                  aiDecision.predictorQValues.eastWest > aiDecision.predictorQValues.northSouth 
                    ? 'text-success font-bold' : ''
                }`} data-testid="q-value-ew">
                  {aiDecision.predictorQValues.eastWest}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Recommended Action:</span>
                <Badge 
                  variant={aiDecision.recommendedAction === 'HOLD' ? 'secondary' : 'default'}
                  data-testid="recommended-action"
                >
                  {aiDecision.recommendedAction === 'NS' ? 'Serve N-S' :
                   aiDecision.recommendedAction === 'EW' ? 'Serve E-W' : 'Hold'}
                </Badge>
              </div>
              <div className="mt-3 bg-success/10 p-2 rounded border border-success/20">
                <div className="text-xs text-success-foreground">
                  <strong>Analysis:</strong> {
                    aiDecision.pressureAnalysis.eastWest > aiDecision.pressureAnalysis.northSouth
                      ? `E-W corridor shows ${Math.round((aiDecision.pressureAnalysis.eastWest / aiDecision.pressureAnalysis.northSouth) * 10) / 10}x higher pressure`
                      : `N-S corridor shows ${Math.round((aiDecision.pressureAnalysis.northSouth / aiDecision.pressureAnalysis.eastWest) * 10) / 10}x higher pressure`
                  }
                </div>
              </div>
            </div>
          </div>
          
          {/* Guardian Status */}
          <div className="bg-warning/10 p-4 rounded-lg border border-warning/20" data-testid="guardian-status">
            <h4 className="font-semibold text-warning-foreground mb-3 flex items-center">
              <Shield className="h-4 w-4 text-warning mr-2" />
              The Guardian (Safety)
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span>Min Green Time:</span>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(aiDecision.guardianChecks.minGreenTime)}
                  <span className={`font-mono ${getStatusColor(aiDecision.guardianChecks.minGreenTime)}`}>
                    {aiDecision.guardianChecks.minGreenTime ? 'Passed' : 'Failed'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Safe Transition:</span>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(aiDecision.guardianChecks.safeTransition)}
                  <span className={`font-mono ${getStatusColor(aiDecision.guardianChecks.safeTransition)}`}>
                    {aiDecision.guardianChecks.safeTransition ? 'Passed' : 'Failed'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>System Health:</span>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(aiDecision.guardianChecks.systemHealth)}
                  <span className={`font-mono ${getStatusColor(aiDecision.guardianChecks.systemHealth)}`}>
                    {aiDecision.guardianChecks.systemHealth ? 'Normal' : 'Alert'}
                  </span>
                </div>
              </div>
              <div className={`mt-3 p-2 rounded border ${
                Object.values(aiDecision.guardianChecks).every(Boolean)
                  ? 'bg-success/10 border-success/20'
                  : 'bg-destructive/10 border-destructive/20'
              }`}>
                <div className="text-xs">
                  <strong>Status:</strong> {
                    Object.values(aiDecision.guardianChecks).every(Boolean)
                      ? 'AI recommendation approved for execution'
                      : 'AI recommendation blocked by safety checks'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Timing Plan */}
        <div className="mt-4 bg-primary/5 p-4 rounded-lg border border-primary/20" data-testid="timing-plan">
          <h5 className="font-semibold text-primary mb-2 flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Current Timing Plan
          </h5>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-muted-foreground">Start Time</div>
              <div className="font-mono font-bold" data-testid="start-time">
                T+{aiDecision.timingPlan.startTime}s
              </div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Green Duration</div>
              <div className="font-mono font-bold" data-testid="duration">
                {aiDecision.timingPlan.duration}s
              </div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">End Time</div>
              <div className="font-mono font-bold" data-testid="end-time">
                T+{aiDecision.timingPlan.endTime}s
              </div>
            </div>
          </div>
        </div>

        {/* Pressure Analysis Visualization */}
        <div className="mt-4 bg-muted/20 p-4 rounded-lg" data-testid="pressure-visualization">
          <h5 className="font-semibold mb-3 flex items-center">
            <Zap className="h-4 w-4 text-primary mr-2" />
            Pressure Analysis
          </h5>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">North-South Pressure</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-accent/30 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (aiDecision.pressureAnalysis.northSouth / 4) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-mono w-12 text-right">
                  {aiDecision.pressureAnalysis.northSouth}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">East-West Pressure</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-accent/30 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (aiDecision.pressureAnalysis.eastWest / 4) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-mono w-12 text-right">
                  {aiDecision.pressureAnalysis.eastWest}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
