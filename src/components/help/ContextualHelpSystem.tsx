import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface HelpContent {
  id: string;
  title: string;
  content: string;
  actions?: HelpAction[];
  nextStep?: string;
  category: 'basic' | 'advanced' | 'troubleshooting';
}

interface HelpAction {
  label: string;
  action: () => void;
  type: 'primary' | 'secondary';
}

interface TooltipProps {
  target: string;
  content: HelpContent;
  position: 'top' | 'bottom' | 'left' | 'right';
  trigger: 'hover' | 'click' | 'focus';
  delay?: number;
}

interface GuidedWorkflowStep {
  id: string;
  title: string;
  description: string;
  targetElement: string;
  validation?: () => boolean;
  onComplete?: () => void;
}

interface GuidedWorkflow {
  id: string;
  title: string;
  description: string;
  steps: GuidedWorkflowStep[];
  category: 'getting-started' | 'advanced-operations' | 'troubleshooting';
}

// Contextual Help System Component
export const ContextualHelpSystem: React.FC = () => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<GuidedWorkflow | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [helpContent, setHelpContent] = useState<Map<string, HelpContent>>(new Map());
  const [workflows, setWorkflows] = useState<GuidedWorkflow[]>([]);

  useEffect(() => {
    initializeHelpContent();
    initializeWorkflows();
  }, []);

  const initializeHelpContent = () => {
    const content = new Map<string, HelpContent>();

    // BIM Mode Toggle Help
    content.set('bim-mode-toggle', {
      id: 'bim-mode-toggle',
      title: 'BIM Mode Toggle',
      content: `
        <div class="help-content">
          <p>Switch between Basic and BIM modes for wall creation.</p>
          <ul>
            <li><strong>Basic Mode:</strong> Simple polygon-based walls</li>
            <li><strong>BIM Mode:</strong> Professional geometric operations</li>
          </ul>
          <div class="help-tip">
            <strong>Tip:</strong> BIM mode provides higher accuracy but requires more processing time.
          </div>
        </div>
      `,
      actions: [
        {
          label: 'Learn More',
          action: () => openGuide('getting-started-with-bim'),
          type: 'primary'
        }
      ],
      category: 'basic'
    });

    // Wall Properties Panel Help
    content.set('wall-properties-panel', {
      id: 'wall-properties-panel',
      title: 'Wall Properties',
      content: `
        <div class="help-content">
          <p>Configure wall properties and BIM-specific settings.</p>
          <h4>Basic Properties:</h4>
          <ul>
            <li><strong>Type:</strong> Layout, Zone, or Area wall</li>
            <li><strong>Thickness:</strong> Wall thickness in current units</li>
            <li><strong>Visible:</strong> Show/hide wall in viewport</li>
          </ul>
          <h4>BIM Properties (BIM Mode Only):</h4>
          <ul>
            <li><strong>Join Type:</strong> Miter, Bevel, or Round corners</li>
            <li><strong>Quality Metrics:</strong> Geometric accuracy indicators</li>
            <li><strong>Custom Tolerance:</strong> Override automatic tolerances</li>
          </ul>
        </div>
      `,
      category: 'basic'
    });

    // Quality Metrics Help
    content.set('quality-metrics', {
      id: 'quality-metrics',
      title: 'Quality Metrics',
      content: `
        <div class="help-content">
          <p>Understand geometric quality indicators:</p>
          <div class="quality-indicator">
            <span class="indicator green"></span>
            <strong>Excellent (95-100%):</strong> High precision, ready for manufacturing
          </div>
          <div class="quality-indicator">
            <span class="indicator yellow"></span>
            <strong>Good (85-95%):</strong> Acceptable quality, minor optimizations possible
          </div>
          <div class="quality-indicator">
            <span class="indicator orange"></span>
            <strong>Fair (70-85%):</strong> Usable but may need improvement
          </div>
          <div class="quality-indicator">
            <span class="indicator red"></span>
            <strong>Poor (&lt;70%):</strong> Requires attention, may have issues
          </div>
        </div>
      `,
      actions: [
        {
          label: 'Improve Quality',
          action: () => startWorkflow('improve-wall-quality'),
          type: 'primary'
        }
      ],
      category: 'advanced'
    });

    // Intersection Resolution Help
    content.set('intersection-resolution', {
      id: 'intersection-resolution',
      title: 'Wall Intersections',
      content: `
        <div class="help-content">
          <p>BIM mode automatically resolves wall intersections using advanced algorithms:</p>
          <h4>Intersection Types:</h4>
          <ul>
            <li><strong>T-Junction:</strong> One wall meets another perpendicularly</li>
            <li><strong>L-Junction:</strong> Two walls meet at a corner</li>
            <li><strong>Cross Junction:</strong> Multiple walls meet at one point</li>
          </ul>
          <h4>Resolution Methods:</h4>
          <ul>
            <li>Miter apex calculation for precise connections</li>
            <li>Boolean operations for seamless geometry</li>
            <li>Shape healing for clean results</li>
          </ul>
        </div>
      `,
      actions: [
        {
          label: 'Troubleshoot Intersections',
          action: () => startWorkflow('fix-intersection-issues'),
          type: 'secondary'
        }
      ],
      category: 'advanced'
    });

    // Tolerance Adjustment Help
    content.set('tolerance-adjustment', {
      id: 'tolerance-adjustment',
      title: 'Tolerance Settings',
      content: `
        <div class="help-content">
          <p>Tolerances control the precision of geometric operations:</p>
          <h4>Automatic Tolerances:</h4>
          <ul>
            <li>Based on wall thickness and document precision</li>
            <li>Adapt to local geometry conditions</li>
            <li>Optimize for quality and performance</li>
          </ul>
          <h4>Custom Tolerances:</h4>
          <ul>
            <li><strong>Tighter:</strong> Higher precision, slower processing</li>
            <li><strong>Looser:</strong> Faster processing, lower precision</li>
          </ul>
          <div class="help-warning">
            <strong>Warning:</strong> Very tight tolerances may cause numerical instability.
          </div>
        </div>
      `,
      category: 'advanced'
    });

    setHelpContent(content);
  };

  const initializeWorkflows = () => {
    const workflowList: GuidedWorkflow[] = [
      {
        id: 'getting-started-bim',
        title: 'Getting Started with BIM Walls',
        description: 'Learn the basics of creating walls in BIM mode',
        category: 'getting-started',
        steps: [
          {
            id: 'enable-bim-mode',
            title: 'Enable BIM Mode',
            description: 'Click the BIM Mode toggle to switch from Basic to BIM mode',
            targetElement: '[data-testid="bim-mode-toggle"]',
            validation: () => document.querySelector('[data-testid="bim-mode-toggle"]')?.classList.contains('active') || false
          },
          {
            id: 'select-wall-tool',
            title: 'Select Wall Tool',
            description: 'Click the Wall tool in the toolbar to start creating walls',
            targetElement: '[data-testid="wall-tool"]',
            validation: () => document.querySelector('[data-testid="wall-tool"]')?.classList.contains('active') || false
          },
          {
            id: 'set-wall-properties',
            title: 'Configure Wall Properties',
            description: 'Set the wall type and thickness in the properties panel',
            targetElement: '[data-testid="wall-properties-panel"]'
          },
          {
            id: 'create-first-wall',
            title: 'Create Your First Wall',
            description: 'Click in the viewport to place wall points, then double-click to finish',
            targetElement: '[data-testid="viewport"]'
          },
          {
            id: 'check-quality',
            title: 'Check Quality Metrics',
            description: 'Review the quality indicators to ensure your wall meets standards',
            targetElement: '[data-testid="quality-metrics"]'
          }
        ]
      },
      {
        id: 'create-t-junction',
        title: 'Creating T-Junction Intersections',
        description: 'Learn how to create precise T-junction wall intersections',
        category: 'advanced-operations',
        steps: [
          {
            id: 'create-main-wall',
            title: 'Create Main Wall',
            description: 'Create the primary wall that will be intersected',
            targetElement: '[data-testid="viewport"]'
          },
          {
            id: 'create-intersecting-wall',
            title: 'Create Intersecting Wall',
            description: 'Create a second wall that intersects the first wall',
            targetElement: '[data-testid="viewport"]'
          },
          {
            id: 'verify-intersection',
            title: 'Verify Intersection',
            description: 'Check that the walls properly intersect and form a clean T-junction',
            targetElement: '[data-testid="intersection-indicator"]'
          },
          {
            id: 'check-intersection-quality',
            title: 'Check Intersection Quality',
            description: 'Review quality metrics for the intersection',
            targetElement: '[data-testid="quality-metrics"]'
          }
        ]
      },
      {
        id: 'improve-wall-quality',
        title: 'Improving Wall Quality',
        description: 'Learn how to diagnose and fix wall quality issues',
        category: 'troubleshooting',
        steps: [
          {
            id: 'identify-issues',
            title: 'Identify Quality Issues',
            description: 'Open the Quality Dashboard to see detailed quality metrics',
            targetElement: '[data-testid="quality-dashboard"]'
          },
          {
            id: 'select-problem-wall',
            title: 'Select Problem Wall',
            description: 'Click on a wall with quality issues (shown in red or orange)',
            targetElement: '[data-testid="viewport"]'
          },
          {
            id: 'apply-healing',
            title: 'Apply Geometry Healing',
            description: 'Right-click and select "Heal Geometry" to fix issues automatically',
            targetElement: '[data-testid="context-menu"]'
          },
          {
            id: 'verify-improvement',
            title: 'Verify Improvement',
            description: 'Check that quality metrics have improved after healing',
            targetElement: '[data-testid="quality-metrics"]'
          }
        ]
      },
      {
        id: 'fix-intersection-issues',
        title: 'Fixing Intersection Problems',
        description: 'Troubleshoot common wall intersection issues',
        category: 'troubleshooting',
        steps: [
          {
            id: 'identify-intersection-problem',
            title: 'Identify the Problem',
            description: 'Look for gaps, overlaps, or poor quality at wall intersections',
            targetElement: '[data-testid="viewport"]'
          },
          {
            id: 'check-wall-alignment',
            title: 'Check Wall Alignment',
            description: 'Ensure walls actually intersect and are not just visually close',
            targetElement: '[data-testid="viewport"]'
          },
          {
            id: 'adjust-tolerance',
            title: 'Adjust Tolerance',
            description: 'Try adjusting tolerance settings in the Advanced Properties panel',
            targetElement: '[data-testid="tolerance-slider"]'
          },
          {
            id: 'resolve-intersection',
            title: 'Resolve Intersection',
            description: 'Use the "Resolve Intersection" tool to fix the connection',
            targetElement: '[data-testid="resolve-intersection-tool"]'
          }
        ]
      }
    ];

    setWorkflows(workflowList);
  };

  const openGuide = (guideId: string) => {
    // Open the appropriate user guide
    const guides = {
      'getting-started-with-bim': '/docs/user-guides/getting-started-with-bim.html',
      'advanced-bim-operations': '/docs/user-guides/advanced-bim-operations.html',
      'troubleshooting-guide': '/docs/user-guides/troubleshooting-guide.html',
      'best-practices-guide': '/docs/user-guides/best-practices-guide.html'
    };

    const url = guides[guideId as keyof typeof guides];
    if (url) {
      window.open(url, '_blank');
    }
  };

  const startWorkflow = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (workflow) {
      setActiveWorkflow(workflow);
      setCurrentStep(0);
    }
  };

  const nextStep = () => {
    if (activeWorkflow && currentStep < activeWorkflow.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeWorkflow = () => {
    setActiveWorkflow(null);
    setCurrentStep(0);
  };

  return (
    <>
      {/* Tooltip System */}
      <TooltipManager
        helpContent={helpContent}
        activeTooltip={activeTooltip}
        setActiveTooltip={setActiveTooltip}
      />

      {/* Guided Workflow Overlay */}
      {activeWorkflow && (
        <GuidedWorkflowOverlay
          workflow={activeWorkflow}
          currentStep={currentStep}
          onNext={nextStep}
          onPrevious={previousStep}
          onComplete={completeWorkflow}
          onCancel={() => setActiveWorkflow(null)}
        />
      )}

      {/* Help Menu */}
      <HelpMenu
        workflows={workflows}
        onStartWorkflow={startWorkflow}
        onOpenGuide={openGuide}
      />
    </>
  );
};

// Tooltip Manager Component
const TooltipManager: React.FC<{
  helpContent: Map<string, HelpContent>;
  activeTooltip: string | null;
  setActiveTooltip: (id: string | null) => void;
}> = ({ helpContent, activeTooltip, setActiveTooltip }) => {
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const helpId = target.getAttribute('data-help-id');
      
      if (helpId && helpContent.has(helpId)) {
        const rect = target.getBoundingClientRect();
        setTooltipPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
        setActiveTooltip(helpId);
      }
    };

    const handleMouseOut = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const helpId = target.getAttribute('data-help-id');
      
      if (helpId) {
        // Delay hiding to allow interaction with tooltip
        setTimeout(() => {
          if (activeTooltip === helpId) {
            setActiveTooltip(null);
          }
        }, 200);
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, [helpContent, activeTooltip, setActiveTooltip]);

  if (!activeTooltip || !helpContent.has(activeTooltip)) {
    return null;
  }

  const content = helpContent.get(activeTooltip)!;

  return createPortal(
    <div
      ref={tooltipRef}
      className="contextual-tooltip"
      style={{
        position: 'fixed',
        left: tooltipPosition.x,
        top: tooltipPosition.y,
        transform: 'translateX(-50%) translateY(-100%)',
        zIndex: 10000
      }}
      onMouseEnter={() => setActiveTooltip(activeTooltip)}
      onMouseLeave={() => setActiveTooltip(null)}
    >
      <div className="tooltip-content">
        <h3>{content.title}</h3>
        <div dangerouslySetInnerHTML={{ __html: content.content }} />
        {content.actions && (
          <div className="tooltip-actions">
            {content.actions.map((action, index) => (
              <button
                key={index}
                className={`tooltip-action ${action.type}`}
                onClick={action.action}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// Guided Workflow Overlay Component
const GuidedWorkflowOverlay: React.FC<{
  workflow: GuidedWorkflow;
  currentStep: number;
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
  onCancel: () => void;
}> = ({ workflow, currentStep, onNext, onPrevious, onComplete, onCancel }) => {
  const currentStepData = workflow.steps[currentStep];
  const isLastStep = currentStep === workflow.steps.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    // Highlight the target element
    const targetElement = document.querySelector(currentStepData.targetElement);
    if (targetElement) {
      targetElement.classList.add('guided-highlight');
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return () => {
      if (targetElement) {
        targetElement.classList.remove('guided-highlight');
      }
    };
  }, [currentStepData.targetElement]);

  const handleNext = () => {
    if (currentStepData.validation && !currentStepData.validation()) {
      // Show validation message
      return;
    }

    if (currentStepData.onComplete) {
      currentStepData.onComplete();
    }

    if (isLastStep) {
      onComplete();
    } else {
      onNext();
    }
  };

  return (
    <div className="guided-workflow-overlay">
      <div className="workflow-panel">
        <div className="workflow-header">
          <h2>{workflow.title}</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        
        <div className="workflow-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${((currentStep + 1) / workflow.steps.length) * 100}%` }}
            />
          </div>
          <span className="progress-text">
            Step {currentStep + 1} of {workflow.steps.length}
          </span>
        </div>

        <div className="workflow-content">
          <h3>{currentStepData.title}</h3>
          <p>{currentStepData.description}</p>
        </div>

        <div className="workflow-actions">
          <button 
            className="workflow-button secondary"
            onClick={onPrevious}
            disabled={isFirstStep}
          >
            Previous
          </button>
          <button 
            className="workflow-button primary"
            onClick={handleNext}
          >
            {isLastStep ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Help Menu Component
const HelpMenu: React.FC<{
  workflows: GuidedWorkflow[];
  onStartWorkflow: (workflowId: string) => void;
  onOpenGuide: (guideId: string) => void;
}> = ({ workflows, onStartWorkflow, onOpenGuide }) => {
  const [isOpen, setIsOpen] = useState(false);

  const workflowsByCategory = workflows.reduce((acc, workflow) => {
    if (!acc[workflow.category]) {
      acc[workflow.category] = [];
    }
    acc[workflow.category].push(workflow);
    return acc;
  }, {} as Record<string, GuidedWorkflow[]>);

  return (
    <div className="help-menu">
      <button 
        className="help-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        data-help-id="help-menu"
      >
        ?
      </button>

      {isOpen && (
        <div className="help-menu-dropdown">
          <div className="help-section">
            <h3>Quick Start</h3>
            <button onClick={() => onStartWorkflow('getting-started-bim')}>
              Getting Started with BIM
            </button>
          </div>

          <div className="help-section">
            <h3>Guided Workflows</h3>
            {Object.entries(workflowsByCategory).map(([category, categoryWorkflows]) => (
              <div key={category} className="workflow-category">
                <h4>{category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                {categoryWorkflows.map(workflow => (
                  <button
                    key={workflow.id}
                    onClick={() => onStartWorkflow(workflow.id)}
                    className="workflow-item"
                  >
                    {workflow.title}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="help-section">
            <h3>Documentation</h3>
            <button onClick={() => onOpenGuide('getting-started-with-bim')}>
              Getting Started Guide
            </button>
            <button onClick={() => onOpenGuide('advanced-bim-operations')}>
              Advanced Operations
            </button>
            <button onClick={() => onOpenGuide('troubleshooting-guide')}>
              Troubleshooting Guide
            </button>
            <button onClick={() => onOpenGuide('best-practices-guide')}>
              Best Practices
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextualHelpSystem;