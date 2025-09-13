import { useQuery } from "@tanstack/react-query";
import { type TrafficSystemState, type TrafficMetrics, type SystemEvent } from "@shared/schema";

export function useTrafficData() {
  return useQuery<TrafficMetrics[]>({
    queryKey: ['/api/traffic/history/24'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useCurrentTrafficState() {
  return useQuery<TrafficSystemState>({
    queryKey: ['/api/traffic/state'],
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}

export function useSystemEvents(limit: number = 50) {
  return useQuery<SystemEvent[]>({
    queryKey: ['/api/system/events', limit.toString()],
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

export function useTrafficHistory(hours: number) {
  return useQuery<TrafficMetrics[]>({
    queryKey: ['/api/traffic/history', hours.toString()],
    enabled: hours > 0,
    refetchInterval: 60000, // Refetch every minute
  });
}
