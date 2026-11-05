import { describe, expect, it } from 'vitest';
import { evaluateActionPolicy } from './policy.js';

describe('NEXLINK feature action policy', () => {
  it('fails closed for unknown actions', () => {
    expect(evaluateActionPolicy('run_arbitrary_shell', 'owner').allowed).toBe(false);
  });

  it('allows viewers to request read-only metrics refresh', () => {
    const decision = evaluateActionPolicy('refresh_device_metrics', 'viewer');
    expect(decision.allowed).toBe(true);
    expect(decision.risk).toBe('low');
  });

  it('requires a second approver for high-impact restart', () => {
    const decision = evaluateActionPolicy('restart_device', 'admin');
    expect(decision.allowed).toBe(true);
    expect(decision.requiresSecondApprover).toBe(true);
  });

  it('does not allow members to shut down devices', () => {
    expect(evaluateActionPolicy('shutdown_device', 'member').allowed).toBe(false);
  });
});
