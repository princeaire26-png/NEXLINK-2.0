import { actionPolicy } from './catalog.js';

export interface PolicyDecision {
  allowed: boolean;
  risk?: 'low' | 'medium' | 'high' | 'critical';
  requiresSecondApprover?: boolean;
  reason?: string;
}

/** Fail-closed action policy. Unknown actions are never accepted. */
export function evaluateActionPolicy(action: string, role: string): PolicyDecision {
  const rule = actionPolicy[action];
  if (!rule) return { allowed: false, reason: 'ACTION_NOT_ALLOWLISTED' };
  if (!rule.roles.includes(role)) return { allowed: false, risk: rule.risk, reason: 'ROLE_NOT_AUTHORIZED' };
  return { allowed: true, risk: rule.risk, requiresSecondApprover: rule.requiresSecondApprover };
}
