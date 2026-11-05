/**
 * NEXLINK capability registry.
 * Inspired by Veyon's modular feature model; implementation status is explicit.
 */
export type CapabilityStatus = 'implemented' | 'partial' | 'planned';
export type CapabilityCategory = 'remote_access' | 'monitoring' | 'collaboration' | 'administration' | 'intelligence' | 'deployment';

export interface Capability {
  key: string;
  name: string;
  description: string;
  category: CapabilityCategory;
  status: CapabilityStatus;
  veyonReference: string;
  nexlinkAdvantage: string;
  actions: string[];
}

export const capabilityCatalog: Capability[] = [
  { key: 'remote_desktop', name: 'Remote Desktop', description: 'View and control an enrolled computer through an authenticated remote session.', category: 'remote_access', status: 'partial', veyonReference: 'Remote access and VNC server plugins', nexlinkAdvantage: 'Session-aware access, reconnect strategy and adaptive streaming roadmap.', actions: ['start_remote_session', 'end_remote_session'] },
  { key: 'device_monitoring', name: 'Live Device Monitoring', description: 'Track device availability and reported system health metrics.', category: 'monitoring', status: 'partial', veyonReference: 'Master computer overview and monitoring models', nexlinkAdvantage: 'Fleet-wide history, health signals and AI-assisted explanations.', actions: ['refresh_device_metrics'] },
  { key: 'screen_broadcast', name: 'Screen Broadcasting', description: 'Demonstrate an authorised operator screen to a selected group of devices.', category: 'collaboration', status: 'planned', veyonReference: 'Demo plugin', nexlinkAdvantage: 'Multi-site groups, audience consent and session analytics.', actions: ['start_screen_broadcast', 'stop_screen_broadcast'] },
  { key: 'screenshots', name: 'Remote Screenshots', description: 'Request a timestamped screenshot from an enrolled endpoint.', category: 'monitoring', status: 'planned', veyonReference: 'Screenshot plugin', nexlinkAdvantage: 'Evidence retention policies and audit-linked capture.', actions: ['capture_screenshot'] },
  { key: 'messaging', name: 'Device Messaging', description: 'Send an operator message or announcement to one device or a group.', category: 'collaboration', status: 'planned', veyonReference: 'Text message plugin', nexlinkAdvantage: 'Acknowledgements, delivery status and organisation-wide targeting.', actions: ['send_message'] },
  { key: 'file_distribution', name: 'File Distribution', description: 'Distribute approved files to one or more managed devices.', category: 'deployment', status: 'planned', veyonReference: 'File transfer plugin', nexlinkAdvantage: 'Resumable transfers, integrity verification and deployment rings.', actions: ['distribute_file', 'collect_file'] },
  { key: 'screen_lock', name: 'Screen Lock', description: 'Lock an enrolled endpoint screen under an authorised policy.', category: 'administration', status: 'planned', veyonReference: 'Screen lock plugin', nexlinkAdvantage: 'Time-limited lock policies and user-visible reason messages.', actions: ['lock_screen', 'unlock_screen'] },
  { key: 'power_control', name: 'Power Management', description: 'Request shutdown, restart or wake operations where the platform supports them.', category: 'administration', status: 'planned', veyonReference: 'Power control plugin', nexlinkAdvantage: 'Maintenance windows, staged rollouts and recovery tracking.', actions: ['restart_device', 'shutdown_device', 'wake_device'] },
  { key: 'application_management', name: 'Application Management', description: 'Request launch of an approved, allow-listed application or website.', category: 'administration', status: 'planned', veyonReference: 'Desktop services and application launch functionality', nexlinkAdvantage: 'Signed application catalog and policy-bound launch profiles.', actions: ['launch_approved_app', 'open_approved_url'] },
  { key: 'session_management', name: 'User Session Management', description: 'Inspect and manage supported interactive user sessions.', category: 'administration', status: 'planned', veyonReference: 'User session control plugin', nexlinkAdvantage: 'Session-level permissions and user notifications.', actions: ['inspect_user_sessions', 'request_sign_out'] },
  { key: 'directory_integration', name: 'Directory Integration', description: 'Map directory users, groups and computer locations into NEXLINK.', category: 'deployment', status: 'planned', veyonReference: 'LDAP and built-in directory plugins', nexlinkAdvantage: 'Multiple identity providers and organisation-aware device groups.', actions: ['sync_directory'] },
  { key: 'ai_diagnostics', name: 'AI Diagnostics', description: 'Explain reported health signals and propose permission-aware remediation plans.', category: 'intelligence', status: 'planned', veyonReference: 'NEXLINK extension beyond Veyon feature model', nexlinkAdvantage: 'Planner, policy checks, approval and auditable execution.', actions: ['analyze_device_health'] },
];

export const actionPolicy: Record<string, { capability: string; risk: 'low' | 'medium' | 'high' | 'critical'; roles: string[]; requiresSecondApprover: boolean }> = {
  start_remote_session: { capability: 'remote_desktop', risk: 'medium', roles: ['owner', 'admin', 'member'], requiresSecondApprover: false },
  end_remote_session: { capability: 'remote_desktop', risk: 'low', roles: ['owner', 'admin', 'member'], requiresSecondApprover: false },
  refresh_device_metrics: { capability: 'device_monitoring', risk: 'low', roles: ['owner', 'admin', 'member', 'viewer'], requiresSecondApprover: false },
  start_screen_broadcast: { capability: 'screen_broadcast', risk: 'medium', roles: ['owner', 'admin'], requiresSecondApprover: false },
  stop_screen_broadcast: { capability: 'screen_broadcast', risk: 'low', roles: ['owner', 'admin'], requiresSecondApprover: false },
  capture_screenshot: { capability: 'screenshots', risk: 'medium', roles: ['owner', 'admin'], requiresSecondApprover: false },
  send_message: { capability: 'messaging', risk: 'low', roles: ['owner', 'admin', 'member'], requiresSecondApprover: false },
  distribute_file: { capability: 'file_distribution', risk: 'medium', roles: ['owner', 'admin'], requiresSecondApprover: false },
  collect_file: { capability: 'file_distribution', risk: 'high', roles: ['owner', 'admin'], requiresSecondApprover: true },
  lock_screen: { capability: 'screen_lock', risk: 'high', roles: ['owner', 'admin'], requiresSecondApprover: true },
  unlock_screen: { capability: 'screen_lock', risk: 'medium', roles: ['owner', 'admin'], requiresSecondApprover: false },
  restart_device: { capability: 'power_control', risk: 'high', roles: ['owner', 'admin'], requiresSecondApprover: true },
  shutdown_device: { capability: 'power_control', risk: 'critical', roles: ['owner'], requiresSecondApprover: true },
  wake_device: { capability: 'power_control', risk: 'medium', roles: ['owner', 'admin'], requiresSecondApprover: false },
  launch_approved_app: { capability: 'application_management', risk: 'medium', roles: ['owner', 'admin'], requiresSecondApprover: false },
  open_approved_url: { capability: 'application_management', risk: 'medium', roles: ['owner', 'admin'], requiresSecondApprover: false },
  inspect_user_sessions: { capability: 'session_management', risk: 'low', roles: ['owner', 'admin'], requiresSecondApprover: false },
  request_sign_out: { capability: 'session_management', risk: 'high', roles: ['owner'], requiresSecondApprover: true },
  sync_directory: { capability: 'directory_integration', risk: 'high', roles: ['owner'], requiresSecondApprover: true },
  analyze_device_health: { capability: 'ai_diagnostics', risk: 'low', roles: ['owner', 'admin', 'member', 'viewer'], requiresSecondApprover: false },
};
