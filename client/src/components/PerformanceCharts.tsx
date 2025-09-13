import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type TrafficMetrics } from "@shared/schema";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PerformanceChartsProps {
  currentMetrics: TrafficMetrics;
  historicalData: TrafficMetrics[];
}

export default function PerformanceCharts({ currentMetrics, historicalData }: PerformanceChartsProps) {
  // Baseline metrics (before AI implementation)
  const baselineMetrics = {
    averageWaitTime: 42.1,
    totalQueueLength: 58,
    throughput: 89,
    efficiency: 72.3,
  };

  // Performance comparison data
  const performanceComparisonData = {
    labels: ['Wait Time (s)', 'Queue Length', 'Throughput (veh/h)', 'Efficiency (%)'],
    datasets: [
      {
        label: 'Before AI',
        data: [
          baselineMetrics.averageWaitTime,
          baselineMetrics.totalQueueLength,
          baselineMetrics.throughput,
          baselineMetrics.efficiency,
        ],
        backgroundColor: 'rgba(244, 67, 54, 0.5)',
        borderColor: 'rgba(244, 67, 54, 1)',
        borderWidth: 1,
      },
      {
        label: 'After AI',
        data: [
          currentMetrics.averageWaitTime,
          currentMetrics.totalQueueLength,
          currentMetrics.throughput,
          currentMetrics.efficiency,
        ],
        backgroundColor: 'rgba(76, 175, 80, 0.5)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Wait time trends data (last 24 hours simulation)
  const waitTimeTrendsData = {
    labels: historicalData.length > 0 
      ? historicalData.slice(-24).map((_, index) => `${index}:00`)
      : ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    datasets: [
      {
        label: 'Average Wait Time (seconds)',
        data: historicalData.length > 0
          ? historicalData.slice(-24).map(m => m.averageWaitTime)
          : [18.5, 12.3, 28.7, 35.2, 24.3, 31.8, 22.1],
        borderColor: 'rgba(25, 118, 210, 1)',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  // Throughput comparison over time
  const throughputData = {
    labels: historicalData.length > 0 
      ? historicalData.slice(-12).map((_, index) => `${index * 2}:00`)
      : ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
    datasets: [
      {
        label: 'Throughput (vehicles/hour)',
        data: historicalData.length > 0
          ? historicalData.slice(-12).map(m => m.throughput)
          : [95, 87, 78, 110, 125, 142, 155, 148, 163, 139, 127, 118],
        borderColor: 'rgba(156, 39, 176, 1)',
        backgroundColor: 'rgba(156, 39, 176, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Performance Comparison Chart */}
      <Card data-testid="performance-comparison-chart">
        <CardHeader>
          <CardTitle>Performance Comparison</CardTitle>
          <p className="text-sm text-muted-foreground">Before vs After AI Implementation</p>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4">
            <Bar data={performanceComparisonData} options={barChartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Wait Time Trends */}
      <Card data-testid="wait-time-trends-chart">
        <CardHeader>
          <CardTitle>Wait Time Trends</CardTitle>
          <p className="text-sm text-muted-foreground">Real-time monitoring over 24 hours</p>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg p-4">
            <Line data={waitTimeTrendsData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Throughput Analysis */}
      <Card data-testid="throughput-analysis-chart">
        <CardHeader>
          <CardTitle>Throughput Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">Vehicle flow optimization results</p>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-4">
            <Line data={throughputData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Efficiency Metrics */}
      <Card data-testid="efficiency-metrics">
        <CardHeader>
          <CardTitle>System Efficiency</CardTitle>
          <p className="text-sm text-muted-foreground">Overall performance indicators</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg border border-success/20">
              <div>
                <h4 className="font-semibold text-success-foreground">Wait Time Reduction</h4>
                <p className="text-sm text-muted-foreground">
                  From {baselineMetrics.averageWaitTime}s to {currentMetrics.averageWaitTime}s
                </p>
              </div>
              <div className="text-2xl font-bold text-success">
                -{Math.round(((baselineMetrics.averageWaitTime - currentMetrics.averageWaitTime) / baselineMetrics.averageWaitTime) * 100)}%
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div>
                <h4 className="font-semibold text-primary-foreground">Throughput Increase</h4>
                <p className="text-sm text-muted-foreground">
                  From {baselineMetrics.throughput} to {currentMetrics.throughput} veh/h
                </p>
              </div>
              <div className="text-2xl font-bold text-primary">
                +{Math.round(((currentMetrics.throughput - baselineMetrics.throughput) / baselineMetrics.throughput) * 100)}%
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-warning/10 rounded-lg border border-warning/20">
              <div>
                <h4 className="font-semibold text-warning-foreground">Queue Reduction</h4>
                <p className="text-sm text-muted-foreground">
                  From {baselineMetrics.totalQueueLength} to {currentMetrics.totalQueueLength} vehicles
                </p>
              </div>
              <div className="text-2xl font-bold text-warning">
                -{Math.round(((baselineMetrics.totalQueueLength - currentMetrics.totalQueueLength) / baselineMetrics.totalQueueLength) * 100)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
