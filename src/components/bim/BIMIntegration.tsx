/**
 * BIM Integration Component
 * Provides access to BIM functionality in the main application
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';

interface BIMIntegrationProps {
  onStatusMessage?: (message: string) => void;
}

export const BIMIntegration: React.FC<BIMIntegrationProps> = ({
  onStatusMessage
}) => {
  // Feature state (simplified for now)
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Feature flag handlers (simplified)
  const handleFeatureToggle = useCallback((featureName: string, enabled: boolean) => {
    if (enabled) {
      setEnabledFeatures(prev => [...prev, featureName]);
      onStatusMessage?.(`Enabled BIM feature: ${featureName}`);
    } else {
      setEnabledFeatures(prev => prev.filter(f => f !== featureName));
      onStatusMessage?.(`Disabled BIM feature: ${featureName}`);
    }
  }, [onStatusMessage]);

  // Rollout handlers (simplified)
  const handleStartRollout = useCallback((featureName: string) => {
    onStatusMessage?.(`Started rollout for ${featureName} (Demo mode)`);
  }, [onStatusMessage]);

  // Migration handlers (simplified)
  const handleStartMigration = useCallback(async (componentId: string) => {
    onStatusMessage?.(`Starting migration for ${componentId}... (Demo mode)`);
  }, [onStatusMessage]);

  if (isInitializing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Initializing BIM System</CardTitle>
          <CardDescription>Setting up advanced wall functionality...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{width: '50%'}}></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const coreFeatures = [
    { name: 'adaptive-tolerance', description: 'Adaptive tolerance calculations based on wall thickness' },
    { name: 'bim-intersection-algorithms', description: 'Enhanced intersection algorithms with robust boolean operations' },
    { name: 'bim-wall-rendering', description: 'BIM-enhanced wall rendering with offset curves' },
    { name: 'bim-quality-metrics', description: 'Real-time geometric quality assessment' }
  ];

  const experimentalFeatures = [
    { name: 'bim-shape-healing', description: 'Automatic shape healing for geometric issues' },
    { name: 'bim-advanced-visualization', description: 'Advanced visualization modes (offset curves, quality heatmaps)' },
    { name: 'bim-performance-mode', description: 'Performance optimizations for BIM operations' }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            BIM Wall System
            <Badge variant="secondary">Beta</Badge>
          </CardTitle>
          <CardDescription>
            Advanced Building Information Modeling functionality for precise wall operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Core Features */}
          <div>
            <h4 className="font-medium mb-2">Core Features</h4>
            <div className="space-y-2">
              {coreFeatures.map(feature => {
                const isEnabled = enabledFeatures.includes(feature.name);
                
                return (
                  <div key={feature.name} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={feature.name} className="font-medium">
                          {feature.description}
                        </Label>
                        {isEnabled && (
                          <Badge variant="outline" className="text-xs">
                            Demo Mode
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={feature.name}
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleFeatureToggle(feature.name, checked)}
                      />
                      {isEnabled && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartRollout(feature.name)}
                        >
                          Start Rollout
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Advanced Controls */}
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Advanced Controls</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced
              </Button>
            </div>
            
            {showAdvanced && (
              <div className="mt-2 space-y-4">
                {/* Experimental Features */}
                <div>
                  <h5 className="text-sm font-medium mb-2">Experimental Features</h5>
                  <div className="space-y-2">
                    {experimentalFeatures.map(feature => {
                      const isEnabled = enabledFeatures.includes(feature.name);
                      
                      return (
                        <div key={feature.name} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <Label htmlFor={feature.name} className="text-sm">
                              {feature.description}
                            </Label>
                            <Badge variant="outline" className="ml-2 text-xs">
                              Experimental
                            </Badge>
                          </div>
                          <Switch
                            id={feature.name}
                            checked={isEnabled}
                            onCheckedChange={(checked) => handleFeatureToggle(feature.name, checked)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Migration Status */}
                <div>
                  <h5 className="text-sm font-medium mb-2">UI Migration Status</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Ready for migration:</span>
                      <Badge variant="secondary">3</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>High risk migrations:</span>
                      <Badge variant="destructive">2</Badge>
                    </div>
                    
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartMigration('basic-wall-properties-panel')}
                      >
                        Migrate Next Component
                      </Button>
                    </div>
                  </div>
                </div>

                {/* System Status */}
                <div>
                  <h5 className="text-sm font-medium mb-2">System Status</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>BIM System:</span>
                      <Badge variant="secondary">Demo Mode</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Features Enabled:</span>
                      <Badge variant="secondary">{enabledFeatures.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Rollouts:</span>
                      <Badge variant="secondary">0</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Compatibility:</span>
                      <Badge variant="secondary">Full</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                // Enable core BIM features
                handleFeatureToggle('adaptive-tolerance', true);
                handleFeatureToggle('bim-intersection-algorithms', true);
              }}
            >
              Enable Core BIM
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Start quality metrics
                handleFeatureToggle('bim-quality-metrics', true);
              }}
            >
              Enable Quality Metrics
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onStatusMessage?.('Generated BIM system report (Demo mode)');
                console.log('BIM System Report (Demo):', {
                  enabledFeatures,
                  status: 'Demo Mode',
                  timestamp: new Date().toISOString()
                });
              }}
            >
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};