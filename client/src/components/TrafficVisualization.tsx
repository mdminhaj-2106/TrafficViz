import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type TrafficSignalState, type IncomingPlatoon, type TrafficMetrics } from "@shared/schema";
import * as THREE from "three";

interface TrafficVisualizationProps {
  signalState: TrafficSignalState;
  incomingPlatoons: IncomingPlatoon[];
  metrics: TrafficMetrics;
}

export default function TrafficVisualization({ 
  signalState, 
  incomingPlatoons, 
  metrics 
}: TrafficVisualizationProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    vehicles: THREE.Group;
    trafficLights: { [key: string]: THREE.Mesh };
    animationId?: number;
  }>();

  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize THREE.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    const camera = new THREE.PerspectiveCamera(75, 800 / 400, 0.1, 1000);
    camera.position.set(0, 50, 50);
    camera.lookAt(0, 0, 0);
    
    // Try WebGL first, fallback to Canvas renderer if WebGL fails
    let renderer;
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (context) {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      } else {
        throw new Error('WebGL not supported');
      }
    } catch (error) {
      console.warn('WebGL not supported, falling back to Canvas renderer:', error);
      renderer = new THREE.WebGLRenderer({ 
        antialias: false,
        alpha: true,
        preserveDrawingBuffer: true
      });
      // Disable shadows for Canvas renderer
      renderer.shadowMap.enabled = false;
    }
    
    renderer.setSize(800, 400);
    renderer.setClearColor(0x1a1a1a);
    
    mountRef.current.appendChild(renderer.domElement);

    // Create intersection
    const intersectionGeometry = new THREE.PlaneGeometry(40, 40);
    const intersectionMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const intersection = new THREE.Mesh(intersectionGeometry, intersectionMaterial);
    intersection.rotation.x = -Math.PI / 2;
    intersection.receiveShadow = true;
    scene.add(intersection);

    // Create roads
    const roadGeometry = new THREE.PlaneGeometry(60, 8);
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    
    // North-South road
    const nsRoad = new THREE.Mesh(roadGeometry, roadMaterial);
    nsRoad.rotation.x = -Math.PI / 2;
    nsRoad.rotation.z = Math.PI / 2;
    nsRoad.receiveShadow = true;
    scene.add(nsRoad);
    
    // East-West road
    const ewRoad = new THREE.Mesh(roadGeometry, roadMaterial);
    ewRoad.rotation.x = -Math.PI / 2;
    ewRoad.receiveShadow = true;
    scene.add(ewRoad);

    // Create traffic lights
    const trafficLights: { [key: string]: THREE.Mesh } = {};
    const lightPositions = {
      north: new THREE.Vector3(0, 8, -25),
      east: new THREE.Vector3(25, 8, 0),
      south: new THREE.Vector3(0, 8, 25),
      west: new THREE.Vector3(-25, 8, 0),
    };

    Object.entries(lightPositions).forEach(([direction, position]) => {
      const lightPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 8),
        new THREE.MeshLambertMaterial({ color: 0x888888 })
      );
      lightPole.position.copy(position);
      lightPole.position.y = 4;
      lightPole.castShadow = true;
      scene.add(lightPole);

      const lightBox = new THREE.Mesh(
        new THREE.BoxGeometry(2, 6, 0.5),
        new THREE.MeshLambertMaterial({ color: 0x222222 })
      );
      lightBox.position.copy(position);
      lightBox.castShadow = true;
      scene.add(lightBox);

      // Red light
      const redLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.6),
        new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0x440000 })
      );
      redLight.position.copy(position);
      redLight.position.y += 1.5;
      scene.add(redLight);

      // Yellow light
      const yellowLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.6),
        new THREE.MeshLambertMaterial({ color: 0xffff00, emissive: 0x444400 })
      );
      yellowLight.position.copy(position);
      scene.add(yellowLight);

      // Green light
      const greenLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.6),
        new THREE.MeshLambertMaterial({ color: 0x00ff00, emissive: 0x004400 })
      );
      greenLight.position.copy(position);
      greenLight.position.y -= 1.5;
      scene.add(greenLight);

      trafficLights[direction] = lightBox;
      trafficLights[`${direction}_red`] = redLight;
      trafficLights[`${direction}_yellow`] = yellowLight;
      trafficLights[`${direction}_green`] = greenLight;
    });

    // Create vehicles group
    const vehicles = new THREE.Group();
    scene.add(vehicles);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    sceneRef.current = { scene, camera, renderer, vehicles, trafficLights };

    return () => {
      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update traffic lights based on signal state
  useEffect(() => {
    if (!sceneRef.current) return;

    const { trafficLights } = sceneRef.current;
    
    // Reset all lights to dim
    Object.keys(trafficLights).forEach(key => {
      if (key.includes('_')) {
        const light = trafficLights[key] as THREE.Mesh;
        const material = light.material as THREE.MeshLambertMaterial;
        if (key.includes('red')) material.emissive.setHex(0x220000);
        else if (key.includes('yellow')) material.emissive.setHex(0x222200);
        else if (key.includes('green')) material.emissive.setHex(0x002200);
      }
    });

    // Illuminate current phase
    if (signalState.currentPhase === 'NS') {
      const northGreen = trafficLights.north_green as THREE.Mesh;
      const southGreen = trafficLights.south_green as THREE.Mesh;
      const eastRed = trafficLights.east_red as THREE.Mesh;
      const westRed = trafficLights.west_red as THREE.Mesh;
      
      (northGreen.material as THREE.MeshLambertMaterial).emissive.setHex(0x004400);
      (southGreen.material as THREE.MeshLambertMaterial).emissive.setHex(0x004400);
      (eastRed.material as THREE.MeshLambertMaterial).emissive.setHex(0x440000);
      (westRed.material as THREE.MeshLambertMaterial).emissive.setHex(0x440000);
    } else {
      const northRed = trafficLights.north_red as THREE.Mesh;
      const southRed = trafficLights.south_red as THREE.Mesh;
      const eastGreen = trafficLights.east_green as THREE.Mesh;
      const westGreen = trafficLights.west_green as THREE.Mesh;
      
      (northRed.material as THREE.MeshLambertMaterial).emissive.setHex(0x440000);
      (southRed.material as THREE.MeshLambertMaterial).emissive.setHex(0x440000);
      (eastGreen.material as THREE.MeshLambertMaterial).emissive.setHex(0x004400);
      (westGreen.material as THREE.MeshLambertMaterial).emissive.setHex(0x004400);
    }
  }, [signalState]);

  // Update vehicles based on incoming platoons
  useEffect(() => {
    if (!sceneRef.current) return;

    const { scene, vehicles } = sceneRef.current;
    
    // Clear existing vehicles
    vehicles.clear();

    // Create vehicles for each platoon
    incomingPlatoons.forEach((platoon, platoonIndex) => {
      const vehicleCount = Math.min(platoon.vehicleCount, 20); // Limit for performance
      
      for (let i = 0; i < vehicleCount; i++) {
        const vehicle = new THREE.Group();
        
        // Vehicle body
        const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
          color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5) 
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        vehicle.add(body);

        // Position vehicle based on direction and ETA
        const distance = platoon.eta * 2 + i * 5; // Spacing between vehicles
        let position: THREE.Vector3;
        
        switch (platoon.direction) {
          case 'north':
            position = new THREE.Vector3(2, 1, -distance);
            break;
          case 'east':
            position = new THREE.Vector3(distance, 1, -2);
            vehicle.rotation.y = -Math.PI / 2;
            break;
          case 'south':
            position = new THREE.Vector3(-2, 1, distance);
            vehicle.rotation.y = Math.PI;
            break;
          case 'west':
            position = new THREE.Vector3(-distance, 1, 2);
            vehicle.rotation.y = Math.PI / 2;
            break;
        }
        
        vehicle.position.copy(position);
        vehicles.add(vehicle);
      }
    });
  }, [incomingPlatoons]);

  // Animation loop
  useEffect(() => {
    if (!sceneRef.current) return;

    const animate = () => {
      if (sceneRef.current) {
        const { scene, camera, renderer } = sceneRef.current;
        
        // Rotate camera slowly for better view
        camera.position.x = Math.cos(Date.now() * 0.0005) * 60;
        camera.position.z = Math.sin(Date.now() * 0.0005) * 60;
        camera.lookAt(0, 0, 0);
        
        renderer.render(scene, camera);
        sceneRef.current.animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
    };
  }, []);

  const getTrafficLightColor = (direction: string, state: TrafficSignalState) => {
    if (state.currentPhase === 'NS') {
      if (direction === 'North' || direction === 'South') return 'green';
      return 'red';
    } else {
      if (direction === 'East' || direction === 'West') return 'green';
      return 'red';
    }
  };

  const TrafficLight = ({ color }: { color: 'red' | 'yellow' | 'green' | 'off' }) => (
    <span 
      className={`inline-block w-5 h-5 rounded-full border-2 border-gray-600 mx-1 ${
        color === 'red' ? 'bg-red-500 shadow-red-500/50 shadow-lg' :
        color === 'yellow' ? 'bg-yellow-500 shadow-yellow-500/50 shadow-lg' :
        color === 'green' ? 'bg-green-500 shadow-green-500/50 shadow-lg' :
        'bg-gray-700'
      }`}
    />
  );

  return (
    <Card data-testid="traffic-visualization">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Live Traffic Intersection</CardTitle>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Current Phase:</span>
              <Badge variant="outline" data-testid="current-phase">
                {signalState.currentPhase === 'NS' ? 'North-South' : 'East-West'}
              </Badge>
            </div>
            <div className="flex items-center space-x-1">
              <TrafficLight color="off" />
              <TrafficLight color={signalState.currentPhase === 'EW' ? 'green' : 'off'} />
              <TrafficLight color="off" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div 
            ref={mountRef} 
            className="w-full h-96 bg-gray-900 rounded-lg overflow-hidden"
            data-testid="threejs-scene"
          />
          
          {/* Traffic Signal Status Overlay */}
          <div className="absolute top-4 left-4 bg-black/75 text-white p-3 rounded-lg" data-testid="signal-status">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {(['North', 'East', 'South', 'West'] as const).map((direction) => (
                <div key={direction} className="text-center">
                  <div className="mb-1">{direction}</div>
                  <div className="flex justify-center">
                    <TrafficLight color={getTrafficLightColor(direction, signalState) === 'red' ? 'red' : 'off'} />
                    <TrafficLight color="off" />
                    <TrafficLight color={getTrafficLightColor(direction, signalState) === 'green' ? 'green' : 'off'} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Vehicle Count Overlay */}
          <div className="absolute top-4 right-4 bg-black/75 text-white p-3 rounded-lg" data-testid="vehicle-counts">
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>North Queue:</span>
                <span className="font-mono" data-testid="queue-north">{metrics.northQueue} vehicles</span>
              </div>
              <div className="flex justify-between">
                <span>East Queue:</span>
                <span className="font-mono" data-testid="queue-east">{metrics.eastQueue} vehicles</span>
              </div>
              <div className="flex justify-between">
                <span>South Queue:</span>
                <span className="font-mono" data-testid="queue-south">{metrics.southQueue} vehicles</span>
              </div>
              <div className="flex justify-between">
                <span>West Queue:</span>
                <span className="font-mono" data-testid="queue-west">{metrics.westQueue} vehicles</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
