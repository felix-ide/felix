import type { TransitionEvaluationResult } from '../services/WorkflowTransitionService.js';

export class TransitionGateError extends Error {
  constructor(
    message: string,
    public readonly details: TransitionEvaluationResult
  ) {
    super(message);
    this.name = 'TransitionGateError';
  }
}
