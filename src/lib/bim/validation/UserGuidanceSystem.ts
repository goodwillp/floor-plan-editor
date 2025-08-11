import { GeometricError, GeometricErrorType, ErrorSeverity } from './GeometricError';
import { RecoveryRecommendation } from './AutomaticRecoverySystem';
import { ValidationReport, UserGuidanceDocument } from './ValidationReportingSystem';

export interface InteractiveGuidance {
  sessionId: string;
  currentStep: number;
  totalSteps: number;
  guidanceDocument: UserGuidanceDocument;
  userProgress: UserProgress;
  contextualHelp: ContextualHelp;
  feedbackCollection: FeedbackCollection;
}

export interface UserProgress {
  completedSteps: Set<number>;
  skippedSteps: Set<number>;
  failedSteps: Set<number>;
  currentStepStartTime: Date;
  totalTimeSpent: number;
  userNotes: Map<number, string>;
  difficultyRatings: Map<number, number>;
}

export interface ContextualHelp {
  currentContext: GuidanceContext;
  availableHelp: HelpResource[];
  quickTips: string[];
  relatedDocumentation: DocumentationLink[];
  videoTutorials: VideoTutorial[];
}

export interface FeedbackCollection {
  stepFeedback: Map<number, StepFeedback>;
  overallFeedback: OverallFeedback | null;
  improvementSuggestions: string[];
  usabilityIssues: UsabilityIssue[];
}

export interface ManualFixWorkflow {
  workflowId: string;
  errorType: GeometricErrorType;
  steps: WorkflowStep[];
  currentStepIndex: number;
  validationChecks: ValidationCheck[];
  rollbackPoints: RollbackPoint[];
  completionCriteria: CompletionCriteria;
}

export interface WorkflowStep {
  stepId: string;
  title: string;
  description: string;
  instructions: DetailedInstruction[];
  prerequisites: Prerequisite[];
  tools: RequiredTool[];
  expectedOutcome: ExpectedOutcome;
  validationMethod: ValidationMethod;
  troubleshooting: TroubleshootingGuide;
  estimatedTime: number;
}

export interface DetailedInstruction {
  instructionId: string;
  type: InstructionType;
  content: string;
  visualAids: VisualAid[];
  interactiveElements: InteractiveElement[];
  warningsAndCautions: string[];
}

export enum InstructionType {
  TEXT = 'text',
  CODE = 'code',
  DIAGRAM = 'diagram',
  SCREENSHOT = 'screenshot',
  VIDEO = 'video',
  INTERACTIVE = 'interactive'
}

export interface VisualAid {
  type: 'image' | 'diagram' | 'animation' | 'interactive_demo';
  url: string;
  caption: string;
  alternativeText: string;
}

export interface InteractiveElement {
  type: 'button' | 'input' | 'slider' | 'checkbox' | 'dropdown';
  id: string;
  label: string;
  action: string;
  validation?: string;
}

/**
 * User guidance system that provides step-by-step instructions
 * for manual geometry fixes when automatic recovery fails
 */
export class UserGuidanceSystem {
  private activeGuidanceSessions: Map<string, InteractiveGuidance> = new Map();
  private workflowTemplates: Map<GeometricErrorType, ManualFixWorkflow> = new Map();
  private userPreferences: Map<string, UserPreferences> = new Map();
  private feedbackDatabase: FeedbackDatabase = new FeedbackDatabase();

  constructor() {
    this.initializeWorkflowTemplates();
  }

  /**
   * Start interactive guidance session for manual fixes
   */
  startGuidanceSession(
    errors: GeometricError[],
    recoveryRecommendations: RecoveryRecommendation[],
    userId?: string
  ): InteractiveGuidance {
    const sessionId = this.generateSessionId();
    const guidanceDocument = this.generateGuidanceDocument(errors, recoveryRecommendations);
    
    const session: InteractiveGuidance = {
      sessionId,
      currentStep: 1,
      totalSteps: guidanceDocument.guidanceSteps.length,
      guidanceDocument,
      userProgress: this.initializeUserProgress(),
      contextualHelp: this.generateContextualHelp(errors[0]?.type),
      feedbackCollection: this.initializeFeedbackCollection()
    };

    this.activeGuidanceSessions.set(sessionId, session);
    return session;
  }

  /**
   * Get next step in guidance workflow
   */
  getNextStep(sessionId: string): WorkflowStep | null {
    const session = this.activeGuidanceSessions.get(sessionId);
    if (!session) return null;

    const currentStepIndex = session.currentStep - 1;
    if (currentStepIndex >= session.guidanceDocument.guidanceSteps.length) {
      return null; // Session complete
    }

    const guidanceStep = session.guidanceDocument.guidanceSteps[currentStepIndex];
    return this.convertGuidanceStepToWorkflowStep(guidanceStep);
  }

  /**
   * Mark step as completed and advance to next
   */
  completeStep(
    sessionId: string,
    stepId: string,
    feedback?: StepFeedback
  ): StepCompletionResult {
    const session = this.activeGuidanceSessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
        nextStep: null
      };
    }

    // Mark step as completed
    session.userProgress.completedSteps.add(session.currentStep);
    
    // Record feedback if provided
    if (feedback) {
      session.feedbackCollection.stepFeedback.set(session.currentStep, feedback);
    }

    // Calculate time spent on step
    const timeSpent = Date.now() - session.userProgress.currentStepStartTime.getTime();
    session.userProgress.totalTimeSpent += timeSpent;

    // Advance to next step
    session.currentStep++;
    session.userProgress.currentStepStartTime = new Date();

    // Update contextual help for new step
    if (session.currentStep <= session.totalSteps) {
      const nextStepType = this.getStepErrorType(session, session.currentStep);
      session.contextualHelp = this.generateContextualHelp(nextStepType);
    }

    const nextStep = this.getNextStep(sessionId);
    
    return {
      success: true,
      error: null,
      nextStep,
      progress: {
        currentStep: session.currentStep,
        totalSteps: session.totalSteps,
        completionPercentage: (session.userProgress.completedSteps.size / session.totalSteps) * 100
      }
    };
  }

  /**
   * Skip current step with reason
   */
  skipStep(
    sessionId: string,
    stepId: string,
    reason: string
  ): StepCompletionResult {
    const session = this.activeGuidanceSessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
        nextStep: null
      };
    }

    session.userProgress.skippedSteps.add(session.currentStep);
    session.userProgress.userNotes.set(session.currentStep, `Skipped: ${reason}`);

    // Advance to next step
    session.currentStep++;
    session.userProgress.currentStepStartTime = new Date();

    const nextStep = this.getNextStep(sessionId);
    
    return {
      success: true,
      error: null,
      nextStep,
      progress: {
        currentStep: session.currentStep,
        totalSteps: session.totalSteps,
        completionPercentage: (session.userProgress.completedSteps.size / session.totalSteps) * 100
      }
    };
  }

  /**
   * Get contextual help for current step
   */
  getContextualHelp(
    sessionId: string,
    helpType: HelpType
  ): HelpResource[] {
    const session = this.activeGuidanceSessions.get(sessionId);
    if (!session) return [];

    const currentStepType = this.getStepErrorType(session, session.currentStep);
    return this.generateHelpResources(currentStepType, helpType);
  }

  /**
   * Provide step-by-step troubleshooting guidance
   */
  getTroubleshootingGuidance(
    sessionId: string,
    issue: string
  ): TroubleshootingGuidance {
    const session = this.activeGuidanceSessions.get(sessionId);
    if (!session) {
      return {
        steps: [],
        diagnosticQuestions: [],
        commonSolutions: [],
        escalationPath: []
      };
    }

    const currentStepType = this.getStepErrorType(session, session.currentStep);
    return this.generateTroubleshootingSteps(currentStepType, issue);
  }

  /**
   * Validate user's fix attempt
   */
  validateUserFix(
    sessionId: string,
    stepId: string,
    userInput: any
  ): ValidationResult {
    const session = this.activeGuidanceSessions.get(sessionId);
    if (!session) {
      return {
        isValid: false,
        errors: ['Session not found'],
        warnings: [],
        suggestions: []
      };
    }

    const currentStep = this.getNextStep(sessionId);
    if (!currentStep) {
      return {
        isValid: false,
        errors: ['No current step found'],
        warnings: [],
        suggestions: []
      };
    }

    return this.performStepValidation(currentStep, userInput);
  }

  /**
   * Generate personalized recommendations based on user history
   */
  getPersonalizedRecommendations(
    userId: string,
    errorType: GeometricErrorType
  ): PersonalizedRecommendation[] {
    const userPrefs = this.userPreferences.get(userId);
    const userHistory = this.feedbackDatabase.getUserHistory(userId);
    
    return this.generatePersonalizedRecommendations(errorType, userPrefs, userHistory);
  }

  /**
   * Collect user feedback on guidance effectiveness
   */
  collectFeedback(
    sessionId: string,
    feedback: OverallFeedback
  ): void {
    const session = this.activeGuidanceSessions.get(sessionId);
    if (!session) return;

    session.feedbackCollection.overallFeedback = feedback;
    this.feedbackDatabase.storeFeedback(sessionId, feedback);
    
    // Analyze feedback for improvements
    this.analyzeFeedbackForImprovements(feedback);
  }

  /**
   * Generate comprehensive user manual
   */
  generateUserManual(
    errorTypes: GeometricErrorType[]
  ): UserManual {
    const sections: ManualSection[] = [];

    for (const errorType of errorTypes) {
      const workflow = this.workflowTemplates.get(errorType);
      if (workflow) {
        sections.push(this.generateManualSection(errorType, workflow));
      }
    }

    return {
      title: 'BIM Geometric Validation - User Manual',
      version: '1.0',
      lastUpdated: new Date(),
      sections,
      appendices: this.generateManualAppendices(),
      index: this.generateManualIndex(sections)
    };
  }

  private initializeWorkflowTemplates(): void {
    // Degenerate geometry workflow
    this.workflowTemplates.set(GeometricErrorType.DEGENERATE_GEOMETRY, {
      workflowId: 'degenerate_geometry_fix',
      errorType: GeometricErrorType.DEGENERATE_GEOMETRY,
      steps: [
        {
          stepId: 'identify_degenerate_elements',
          title: 'Identify Degenerate Elements',
          description: 'Locate and identify geometric elements that are degenerate',
          instructions: [
            {
              instructionId: 'visual_inspection',
              type: InstructionType.TEXT,
              content: 'Examine the geometry for elements with insufficient points or zero area',
              visualAids: [],
              interactiveElements: [],
              warningsAndCautions: ['Pay attention to curves with less than 2 points']
            }
          ],
          prerequisites: [],
          tools: [{ name: 'Geometry Inspector', version: '1.0', required: true }],
          expectedOutcome: {
            description: 'All degenerate elements are identified and marked',
            validationCriteria: ['At least one degenerate element found', 'Elements are properly marked']
          },
          validationMethod: {
            type: 'automatic',
            criteria: 'Check for marked degenerate elements'
          },
          troubleshooting: {
            commonIssues: ['Cannot find degenerate elements'],
            solutions: ['Use automatic detection tools', 'Check geometry properties panel']
          },
          estimatedTime: 5
        },
        {
          stepId: 'fix_degenerate_elements',
          title: 'Fix Degenerate Elements',
          description: 'Repair or replace degenerate geometric elements',
          instructions: [
            {
              instructionId: 'repair_method',
              type: InstructionType.TEXT,
              content: 'Choose appropriate repair method based on element type',
              visualAids: [],
              interactiveElements: [],
              warningsAndCautions: ['Backup original geometry before making changes']
            }
          ],
          prerequisites: [{ description: 'Degenerate elements identified', required: true }],
          tools: [{ name: 'Geometry Repair Tool', version: '1.0', required: true }],
          expectedOutcome: {
            description: 'All degenerate elements are repaired or replaced',
            validationCriteria: ['No degenerate elements remain', 'Geometry is valid']
          },
          validationMethod: {
            type: 'automatic',
            criteria: 'Run geometry validation'
          },
          troubleshooting: {
            commonIssues: ['Repair fails', 'New issues introduced'],
            solutions: ['Try alternative repair methods', 'Revert and try manual fix']
          },
          estimatedTime: 10
        }
      ],
      currentStepIndex: 0,
      validationChecks: [],
      rollbackPoints: [],
      completionCriteria: {
        description: 'All degenerate geometry is fixed',
        validationMethod: 'automatic_validation',
        successCriteria: ['No degenerate elements detected', 'Geometry passes validation']
      }
    });

    // Self-intersection workflow
    this.workflowTemplates.set(GeometricErrorType.SELF_INTERSECTION, {
      workflowId: 'self_intersection_fix',
      errorType: GeometricErrorType.SELF_INTERSECTION,
      steps: [
        {
          stepId: 'locate_intersections',
          title: 'Locate Self-Intersections',
          description: 'Find all points where the curve intersects with itself',
          instructions: [
            {
              instructionId: 'intersection_detection',
              type: InstructionType.TEXT,
              content: 'Use intersection detection tools to find self-intersecting segments',
              visualAids: [],
              interactiveElements: [],
              warningsAndCautions: ['Some intersections may be very small and hard to see']
            }
          ],
          prerequisites: [],
          tools: [{ name: 'Intersection Detector', version: '1.0', required: true }],
          expectedOutcome: {
            description: 'All self-intersection points are identified',
            validationCriteria: ['Intersection points are marked', 'Intersecting segments are highlighted']
          },
          validationMethod: {
            type: 'automatic',
            criteria: 'Check for marked intersection points'
          },
          troubleshooting: {
            commonIssues: ['No intersections found when they exist'],
            solutions: ['Adjust detection tolerance', 'Check curve precision']
          },
          estimatedTime: 3
        },
        {
          stepId: 'resolve_intersections',
          title: 'Resolve Self-Intersections',
          description: 'Remove or fix self-intersecting segments',
          instructions: [
            {
              instructionId: 'resolution_method',
              type: InstructionType.TEXT,
              content: 'Choose resolution method: simplify curve, split at intersections, or manual edit',
              visualAids: [],
              interactiveElements: [],
              warningsAndCautions: ['Resolution may change curve shape significantly']
            }
          ],
          prerequisites: [{ description: 'Self-intersections located', required: true }],
          tools: [{ name: 'Curve Editor', version: '1.0', required: true }],
          expectedOutcome: {
            description: 'Curve no longer has self-intersections',
            validationCriteria: ['No self-intersections detected', 'Curve maintains reasonable shape']
          },
          validationMethod: {
            type: 'automatic',
            criteria: 'Run self-intersection check'
          },
          troubleshooting: {
            commonIssues: ['Resolution creates new issues', 'Curve shape too distorted'],
            solutions: ['Try different resolution method', 'Manual point editing']
          },
          estimatedTime: 8
        }
      ],
      currentStepIndex: 0,
      validationChecks: [],
      rollbackPoints: [],
      completionCriteria: {
        description: 'Curve has no self-intersections',
        validationMethod: 'automatic_validation',
        successCriteria: ['Self-intersection check passes', 'Curve shape is acceptable']
      }
    });

    // Add more workflow templates for other error types...
  }

  private generateGuidanceDocument(
    errors: GeometricError[],
    recommendations: RecoveryRecommendation[]
  ): UserGuidanceDocument {
    const guidanceSteps = this.generateGuidanceSteps(errors, recommendations);
    
    return {
      documentId: this.generateSessionId(),
      timestamp: new Date(),
      title: 'Manual Geometry Fix Guide',
      introduction: this.generateIntroduction(errors),
      guidanceSteps,
      troubleshootingGuide: this.generateTroubleshootingSection(errors),
      bestPractices: this.generateBestPracticesSection(),
      supportResources: this.generateSupportResources(),
      glossary: this.generateGlossary()
    };
  }

  private generateGuidanceSteps(
    errors: GeometricError[],
    recommendations: RecoveryRecommendation[]
  ): any[] {
    const steps: any[] = [];
    let stepNumber = 1;

    // Group errors by type
    const errorGroups = new Map<GeometricErrorType, GeometricError[]>();
    for (const error of errors) {
      if (!errorGroups.has(error.type)) {
        errorGroups.set(error.type, []);
      }
      errorGroups.get(error.type)!.push(error);
    }

    // Generate steps for each error type
    for (const [errorType, errorList] of errorGroups) {
      const workflow = this.workflowTemplates.get(errorType);
      if (workflow) {
        for (const workflowStep of workflow.steps) {
          steps.push({
            stepNumber: stepNumber++,
            title: workflowStep.title,
            description: workflowStep.description,
            severity: this.getHighestSeverity(errorList),
            estimatedTime: workflowStep.estimatedTime,
            prerequisites: workflowStep.prerequisites.map(p => p.description),
            instructions: workflowStep.instructions.map(i => i.content),
            expectedOutcome: workflowStep.expectedOutcome.description,
            troubleshooting: workflowStep.troubleshooting.solutions,
            relatedSteps: []
          });
        }
      }
    }

    return steps;
  }

  private initializeUserProgress(): UserProgress {
    return {
      completedSteps: new Set(),
      skippedSteps: new Set(),
      failedSteps: new Set(),
      currentStepStartTime: new Date(),
      totalTimeSpent: 0,
      userNotes: new Map(),
      difficultyRatings: new Map()
    };
  }

  private generateContextualHelp(errorType?: GeometricErrorType): ContextualHelp {
    return {
      currentContext: {
        errorType: errorType || GeometricErrorType.DEGENERATE_GEOMETRY,
        stepType: 'identification',
        userLevel: 'intermediate'
      },
      availableHelp: this.generateHelpResources(errorType, HelpType.QUICK_REFERENCE),
      quickTips: this.generateQuickTips(errorType),
      relatedDocumentation: this.generateDocumentationLinks(errorType),
      videoTutorials: this.generateVideoTutorials(errorType)
    };
  }

  private initializeFeedbackCollection(): FeedbackCollection {
    return {
      stepFeedback: new Map(),
      overallFeedback: null,
      improvementSuggestions: [],
      usabilityIssues: []
    };
  }

  private convertGuidanceStepToWorkflowStep(guidanceStep: any): WorkflowStep {
    return {
      stepId: `step_${guidanceStep.stepNumber}`,
      title: guidanceStep.title,
      description: guidanceStep.description,
      instructions: guidanceStep.instructions.map((instruction: string) => ({
        instructionId: `instruction_${Math.random().toString(36).substr(2, 9)}`,
        type: InstructionType.TEXT,
        content: instruction,
        visualAids: [],
        interactiveElements: [],
        warningsAndCautions: []
      })),
      prerequisites: guidanceStep.prerequisites.map((prereq: string) => ({
        description: prereq,
        required: true
      })),
      tools: [],
      expectedOutcome: {
        description: guidanceStep.expectedOutcome,
        validationCriteria: []
      },
      validationMethod: {
        type: 'manual',
        criteria: 'User confirmation'
      },
      troubleshooting: {
        commonIssues: [],
        solutions: guidanceStep.troubleshooting || []
      },
      estimatedTime: guidanceStep.estimatedTime
    };
  }

  private getStepErrorType(session: InteractiveGuidance, stepNumber: number): GeometricErrorType {
    // This would map step numbers to error types based on the guidance document
    return GeometricErrorType.DEGENERATE_GEOMETRY; // Simplified for now
  }

  private generateHelpResources(errorType?: GeometricErrorType, helpType?: HelpType): HelpResource[] {
    const resources: HelpResource[] = [];

    if (errorType === GeometricErrorType.DEGENERATE_GEOMETRY) {
      resources.push({
        id: 'degenerate_help_1',
        title: 'Understanding Degenerate Geometry',
        type: 'article',
        content: 'Degenerate geometry refers to geometric elements that lack proper structure...',
        difficulty: 'beginner',
        estimatedReadTime: 3,
        tags: ['geometry', 'basics', 'troubleshooting']
      });
    }

    return resources;
  }

  private generateTroubleshootingSteps(errorType: GeometricErrorType, issue: string): TroubleshootingGuidance {
    return {
      steps: [
        'Identify the specific issue',
        'Check prerequisites',
        'Try alternative approach',
        'Seek additional help'
      ],
      diagnosticQuestions: [
        'What exactly is not working?',
        'Have you completed all prerequisites?',
        'Are you using the correct tools?'
      ],
      commonSolutions: [
        'Restart the step',
        'Check tool settings',
        'Verify input data'
      ],
      escalationPath: [
        'Check documentation',
        'Contact support',
        'Submit bug report'
      ]
    };
  }

  private performStepValidation(step: WorkflowStep, userInput: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Perform validation based on step requirements
    if (step.validationMethod.type === 'automatic') {
      // Implement automatic validation logic
    } else {
      // Manual validation - assume user confirmation is sufficient
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  private generatePersonalizedRecommendations(
    errorType: GeometricErrorType,
    userPrefs?: UserPreferences,
    userHistory?: UserHistory
  ): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    // Generate recommendations based on user preferences and history
    if (userPrefs?.preferredLearningStyle === 'visual') {
      recommendations.push({
        type: 'learning_style',
        title: 'Visual Learning Resources',
        description: 'Based on your preference for visual learning, we recommend starting with diagrams and videos',
        priority: 'high',
        resources: []
      });
    }

    return recommendations;
  }

  private analyzeFeedbackForImprovements(feedback: OverallFeedback): void {
    // Analyze feedback to identify areas for improvement
    if (feedback.overallRating < 3) {
      // Low rating - investigate issues
    }
    
    if (feedback.difficultyRating > 4) {
      // Too difficult - consider simplifying
    }
  }

  private generateManualSection(errorType: GeometricErrorType, workflow: ManualFixWorkflow): ManualSection {
    return {
      id: `section_${errorType}`,
      title: this.getErrorTypeTitle(errorType),
      content: this.generateSectionContent(workflow),
      subsections: workflow.steps.map(step => ({
        id: step.stepId,
        title: step.title,
        content: step.description
      })),
      examples: [],
      references: []
    };
  }

  private generateManualAppendices(): ManualAppendix[] {
    return [
      {
        id: 'glossary',
        title: 'Glossary',
        content: 'Definitions of technical terms used in this manual'
      },
      {
        id: 'troubleshooting',
        title: 'Troubleshooting Guide',
        content: 'Common issues and their solutions'
      }
    ];
  }

  private generateManualIndex(sections: ManualSection[]): ManualIndex {
    return {
      entries: sections.map(section => ({
        term: section.title,
        pageNumber: 0, // Would be calculated in real implementation
        subsections: section.subsections.map(sub => sub.title)
      }))
    };
  }

  // Helper methods
  private generateSessionId(): string {
    return `guidance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getHighestSeverity(errors: GeometricError[]): ErrorSeverity {
    const severityOrder = [ErrorSeverity.CRITICAL, ErrorSeverity.ERROR, ErrorSeverity.WARNING];
    
    for (const severity of severityOrder) {
      if (errors.some(e => e.severity === severity)) {
        return severity;
      }
    }
    
    return ErrorSeverity.WARNING;
  }

  private getErrorTypeTitle(errorType: GeometricErrorType): string {
    const titles: Record<GeometricErrorType, string> = {
      [GeometricErrorType.DEGENERATE_GEOMETRY]: 'Fixing Degenerate Geometry',
      [GeometricErrorType.SELF_INTERSECTION]: 'Resolving Self-Intersections',
      [GeometricErrorType.NUMERICAL_INSTABILITY]: 'Addressing Numerical Issues',
      [GeometricErrorType.TOPOLOGY_ERROR]: 'Repairing Topology Errors',
      [GeometricErrorType.DUPLICATE_VERTICES]: 'Removing Duplicate Vertices',
      [GeometricErrorType.BOOLEAN_FAILURE]: 'Fixing Boolean Operation Failures',
      [GeometricErrorType.OFFSET_FAILURE]: 'Resolving Offset Operation Issues',
      [GeometricErrorType.TOLERANCE_EXCEEDED]: 'Adjusting Tolerance Settings',
      [GeometricErrorType.COMPLEXITY_EXCEEDED]: 'Reducing Geometric Complexity',
      [GeometricErrorType.INVALID_PARAMETER]: 'Correcting Invalid Parameters',
      [GeometricErrorType.VALIDATION_FAILURE]: 'Addressing Validation Failures'
    };
    return titles[errorType] || 'Unknown Issue';
  }

  private generateIntroduction(errors: GeometricError[]): string {
    return `This guide will help you manually fix ${errors.length} geometric validation issues. Each step includes detailed instructions, expected outcomes, and troubleshooting tips.`;
  }

  private generateTroubleshootingSection(errors: GeometricError[]): any {
    return {
      commonIssues: ['Tool not responding', 'Unexpected results', 'Cannot complete step'],
      diagnosticSteps: ['Check prerequisites', 'Verify tool settings', 'Review input data'],
      solutions: ['Restart step', 'Try alternative method', 'Contact support']
    };
  }

  private generateBestPracticesSection(): any {
    return {
      preventionStrategies: ['Regular validation', 'Proper tool usage', 'Data backup'],
      qualityGuidelines: ['Follow standards', 'Use appropriate tolerances', 'Validate frequently'],
      performanceTips: ['Optimize geometry', 'Use efficient algorithms', 'Monitor resources']
    };
  }

  private generateSupportResources(): any[] {
    return [
      {
        title: 'User Manual',
        type: 'documentation',
        url: '/docs/user-manual',
        description: 'Complete user manual for the BIM system'
      },
      {
        title: 'Video Tutorials',
        type: 'tutorial',
        url: '/tutorials/videos',
        description: 'Step-by-step video tutorials'
      }
    ];
  }

  private generateGlossary(): any[] {
    return [
      {
        term: 'Degenerate Geometry',
        definition: 'Geometric elements that lack proper structure or have invalid properties',
        relatedTerms: ['Geometry', 'Validation', 'Topology']
      }
    ];
  }

  private generateQuickTips(errorType?: GeometricErrorType): string[] {
    return [
      'Always backup your data before making changes',
      'Use the validation tools frequently',
      'Check prerequisites before starting each step'
    ];
  }

  private generateDocumentationLinks(errorType?: GeometricErrorType): DocumentationLink[] {
    return [
      {
        title: 'Geometry Validation Guide',
        url: '/docs/validation',
        description: 'Comprehensive guide to geometry validation'
      }
    ];
  }

  private generateVideoTutorials(errorType?: GeometricErrorType): VideoTutorial[] {
    return [
      {
        title: 'Fixing Common Geometry Issues',
        url: '/videos/geometry-fixes',
        duration: 300,
        difficulty: 'intermediate'
      }
    ];
  }

  private generateSectionContent(workflow: ManualFixWorkflow): string {
    return `This section covers how to fix ${workflow.errorType} issues using a ${workflow.steps.length}-step process.`;
  }
}

// Additional interfaces for the user guidance system
export interface GuidanceContext {
  errorType: GeometricErrorType;
  stepType: string;
  userLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface HelpResource {
  id: string;
  title: string;
  type: 'article' | 'video' | 'tutorial' | 'reference';
  content: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
  tags: string[];
}

export interface DocumentationLink {
  title: string;
  url: string;
  description: string;
}

export interface VideoTutorial {
  title: string;
  url: string;
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface StepFeedback {
  stepNumber: number;
  rating: number;
  difficulty: number;
  timeSpent: number;
  comments: string;
  suggestions: string[];
}

export interface OverallFeedback {
  overallRating: number;
  difficultyRating: number;
  clarityRating: number;
  completenessRating: number;
  wouldRecommend: boolean;
  comments: string;
  improvementSuggestions: string[];
}

export interface UsabilityIssue {
  stepNumber: number;
  issueType: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Prerequisite {
  description: string;
  required: boolean;
}

export interface RequiredTool {
  name: string;
  version: string;
  required: boolean;
}

export interface ExpectedOutcome {
  description: string;
  validationCriteria: string[];
}

export interface ValidationMethod {
  type: 'automatic' | 'manual' | 'hybrid';
  criteria: string;
}

export interface TroubleshootingGuide {
  commonIssues: string[];
  solutions: string[];
}

export interface ValidationCheck {
  checkId: string;
  description: string;
  validationFunction: (data: any) => boolean;
}

export interface RollbackPoint {
  pointId: string;
  stepNumber: number;
  dataSnapshot: any;
  timestamp: Date;
}

export interface CompletionCriteria {
  description: string;
  validationMethod: string;
  successCriteria: string[];
}

export interface StepCompletionResult {
  success: boolean;
  error: string | null;
  nextStep: WorkflowStep | null;
  progress?: {
    currentStep: number;
    totalSteps: number;
    completionPercentage: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface TroubleshootingGuidance {
  steps: string[];
  diagnosticQuestions: string[];
  commonSolutions: string[];
  escalationPath: string[];
}

export interface PersonalizedRecommendation {
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  resources: HelpResource[];
}

export interface UserPreferences {
  preferredLearningStyle: 'visual' | 'textual' | 'interactive';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredStepDuration: number;
  enabledHelpTypes: HelpType[];
}

export interface UserHistory {
  completedWorkflows: string[];
  averageStepTime: number;
  commonDifficulties: string[];
  preferredSolutions: string[];
}

export interface UserManual {
  title: string;
  version: string;
  lastUpdated: Date;
  sections: ManualSection[];
  appendices: ManualAppendix[];
  index: ManualIndex;
}

export interface ManualSection {
  id: string;
  title: string;
  content: string;
  subsections: ManualSubsection[];
  examples: ManualExample[];
  references: ManualReference[];
}

export interface ManualSubsection {
  id: string;
  title: string;
  content: string;
}

export interface ManualExample {
  id: string;
  title: string;
  description: string;
  code?: string;
  images?: string[];
}

export interface ManualReference {
  id: string;
  title: string;
  url: string;
  type: 'internal' | 'external';
}

export interface ManualAppendix {
  id: string;
  title: string;
  content: string;
}

export interface ManualIndex {
  entries: ManualIndexEntry[];
}

export interface ManualIndexEntry {
  term: string;
  pageNumber: number;
  subsections: string[];
}

export enum HelpType {
  QUICK_REFERENCE = 'quick_reference',
  DETAILED_GUIDE = 'detailed_guide',
  VIDEO_TUTORIAL = 'video_tutorial',
  TROUBLESHOOTING = 'troubleshooting',
  BEST_PRACTICES = 'best_practices'
}

class FeedbackDatabase {
  private feedback: Map<string, OverallFeedback> = new Map();
  private userHistory: Map<string, UserHistory> = new Map();

  storeFeedback(sessionId: string, feedback: OverallFeedback): void {
    this.feedback.set(sessionId, feedback);
  }

  getUserHistory(userId: string): UserHistory | undefined {
    return this.userHistory.get(userId);
  }
}