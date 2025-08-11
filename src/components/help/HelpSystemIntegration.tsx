import React, { useEffect } from 'react';
import { ContextualHelpSystem } from './ContextualHelpSystem';

/**
 * Integration component that adds help attributes to existing UI elements
 * This component automatically enhances the existing interface with contextual help
 */
export const HelpSystemIntegration: React.FC = () => {
  useEffect(() => {
    // Add help attributes to existing UI elements
    addHelpAttributes();
    
    // Set up mutation observer to handle dynamically added elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              addHelpAttributesToElement(node as Element);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const addHelpAttributes = () => {
    // BIM Mode Toggle
    const bimToggle = document.querySelector('[data-testid="bim-mode-toggle"]');
    if (bimToggle && !bimToggle.getAttribute('data-help-id')) {
      bimToggle.setAttribute('data-help-id', 'bim-mode-toggle');
    }

    // Wall Tool
    const wallTool = document.querySelector('[data-testid="wall-tool"]');
    if (wallTool && !wallTool.getAttribute('data-help-id')) {
      wallTool.setAttribute('data-help-id', 'wall-tool');
    }

    // Wall Properties Panel
    const propertiesPanel = document.querySelector('[data-testid="wall-properties-panel"]');
    if (propertiesPanel && !propertiesPanel.getAttribute('data-help-id')) {
      propertiesPanel.setAttribute('data-help-id', 'wall-properties-panel');
    }

    // Quality Metrics
    const qualityMetrics = document.querySelector('[data-testid="quality-metrics"]');
    if (qualityMetrics && !qualityMetrics.getAttribute('data-help-id')) {
      qualityMetrics.setAttribute('data-help-id', 'quality-metrics');
    }

    // Tolerance Slider
    const toleranceSlider = document.querySelector('[data-testid="tolerance-slider"]');
    if (toleranceSlider && !toleranceSlider.getAttribute('data-help-id')) {
      toleranceSlider.setAttribute('data-help-id', 'tolerance-adjustment');
    }

    // Add help attributes to other common elements
    addHelpAttributesToCommonElements();
  };

  const addHelpAttributesToElement = (element: Element) => {
    // Check if element already has help attribute
    if (element.getAttribute('data-help-id')) {
      return;
    }

    // Add help attributes based on element characteristics
    const testId = element.getAttribute('data-testid');
    const className = element.className;
    const tagName = element.tagName.toLowerCase();

    // Map test IDs to help IDs
    const testIdToHelpId: Record<string, string> = {
      'bim-mode-toggle': 'bim-mode-toggle',
      'wall-tool': 'wall-tool',
      'wall-properties-panel': 'wall-properties-panel',
      'quality-metrics': 'quality-metrics',
      'quality-dashboard': 'quality-metrics',
      'tolerance-slider': 'tolerance-adjustment',
      'intersection-indicator': 'intersection-resolution',
      'heal-geometry-button': 'geometry-healing',
      'validate-geometry-button': 'geometry-validation',
      'simplify-geometry-button': 'geometry-simplification'
    };

    if (testId && testIdToHelpId[testId]) {
      element.setAttribute('data-help-id', testIdToHelpId[testId]);
      return;
    }

    // Map class names to help IDs
    if (className.includes('bim-mode-toggle')) {
      element.setAttribute('data-help-id', 'bim-mode-toggle');
    } else if (className.includes('wall-properties')) {
      element.setAttribute('data-help-id', 'wall-properties-panel');
    } else if (className.includes('quality-metric')) {
      element.setAttribute('data-help-id', 'quality-metrics');
    } else if (className.includes('tolerance-control')) {
      element.setAttribute('data-help-id', 'tolerance-adjustment');
    } else if (className.includes('intersection-control')) {
      element.setAttribute('data-help-id', 'intersection-resolution');
    }

    // Recursively process child elements
    Array.from(element.children).forEach(child => {
      addHelpAttributesToElement(child);
    });
  };

  const addHelpAttributesToCommonElements = () => {
    // Add help to buttons with specific text content
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      if (button.getAttribute('data-help-id')) return;

      const text = button.textContent?.toLowerCase() || '';
      
      if (text.includes('heal') && text.includes('geometry')) {
        button.setAttribute('data-help-id', 'geometry-healing');
      } else if (text.includes('validate') && text.includes('geometry')) {
        button.setAttribute('data-help-id', 'geometry-validation');
      } else if (text.includes('simplify') && text.includes('geometry')) {
        button.setAttribute('data-help-id', 'geometry-simplification');
      } else if (text.includes('resolve') && text.includes('intersection')) {
        button.setAttribute('data-help-id', 'intersection-resolution');
      } else if (text.includes('bim') && text.includes('mode')) {
        button.setAttribute('data-help-id', 'bim-mode-toggle');
      }
    });

    // Add help to input elements
    const inputs = document.querySelectorAll('input[type="range"]');
    inputs.forEach(input => {
      if (input.getAttribute('data-help-id')) return;

      const label = input.closest('label')?.textContent?.toLowerCase() || '';
      const placeholder = input.getAttribute('placeholder')?.toLowerCase() || '';
      
      if (label.includes('tolerance') || placeholder.includes('tolerance')) {
        input.setAttribute('data-help-id', 'tolerance-adjustment');
      } else if (label.includes('thickness') || placeholder.includes('thickness')) {
        input.setAttribute('data-help-id', 'wall-thickness');
      }
    });

    // Add help to select elements
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
      if (select.getAttribute('data-help-id')) return;

      const label = select.closest('label')?.textContent?.toLowerCase() || '';
      
      if (label.includes('join') && label.includes('type')) {
        select.setAttribute('data-help-id', 'join-type-selection');
      } else if (label.includes('wall') && label.includes('type')) {
        select.setAttribute('data-help-id', 'wall-type-selection');
      }
    });

    // Add help to panels and containers
    const panels = document.querySelectorAll('[class*="panel"], [class*="dashboard"], [class*="properties"]');
    panels.forEach(panel => {
      if (panel.getAttribute('data-help-id')) return;

      const className = panel.className.toLowerCase();
      
      if (className.includes('quality')) {
        panel.setAttribute('data-help-id', 'quality-metrics');
      } else if (className.includes('properties') && className.includes('wall')) {
        panel.setAttribute('data-help-id', 'wall-properties-panel');
      } else if (className.includes('tolerance')) {
        panel.setAttribute('data-help-id', 'tolerance-adjustment');
      }
    });
  };

  return <ContextualHelpSystem />;
};

/**
 * Hook for components to register custom help content
 */
export const useHelpContent = (elementId: string, helpId: string) => {
  useEffect(() => {
    const element = document.getElementById(elementId);
    if (element) {
      element.setAttribute('data-help-id', helpId);
    }

    return () => {
      if (element) {
        element.removeAttribute('data-help-id');
      }
    };
  }, [elementId, helpId]);
};

/**
 * Component wrapper that automatically adds help support
 */
export const WithHelp: React.FC<{
  helpId: string;
  children: React.ReactNode;
  className?: string;
}> = ({ helpId, children, className = '' }) => {
  return (
    <div data-help-id={helpId} className={className}>
      {children}
    </div>
  );
};

/**
 * Enhanced button component with built-in help support
 */
export const HelpButton: React.FC<{
  helpId: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}> = ({ helpId, onClick, children, className = '', disabled = false }) => {
  return (
    <button
      data-help-id={helpId}
      onClick={onClick}
      className={className}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

/**
 * Enhanced input component with built-in help support
 */
export const HelpInput: React.FC<{
  helpId: string;
  type?: string;
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
}> = ({ 
  helpId, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  className = '',
  min,
  max,
  step
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === 'number' || type === 'range' 
      ? parseFloat(e.target.value) 
      : e.target.value;
    onChange(newValue);
  };

  return (
    <input
      data-help-id={helpId}
      type={type}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      min={min}
      max={max}
      step={step}
    />
  );
};

/**
 * Enhanced select component with built-in help support
 */
export const HelpSelect: React.FC<{
  helpId: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}> = ({ helpId, value, onChange, options, className = '' }) => {
  return (
    <select
      data-help-id={helpId}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default HelpSystemIntegration;