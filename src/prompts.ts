// MCP Prompt Handlers for Inforcer MCP Server
// Exposes pre-baked governance prompt templates via ListPrompts and GetPrompt handlers

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

export function registerPromptHandlers(server: Server): void {
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: 'alignment-review',
        description: 'Review tenant alignment scores and surface the largest drift',
        arguments: [],
      },
      {
        name: 'tenant-drift-detail',
        description: 'Drill into policy/baseline drift for a specific tenant',
        arguments: [
          {
            name: 'tenant',
            description:
              'Tenant identifier — numeric Client Tenant ID, tenant DNS name, Azure AD GUID, or friendly name',
            required: true,
          },
        ],
      },
      {
        name: 'identity-posture-check',
        description: 'Review Entra ID users, groups, and privileged roles for a tenant',
        arguments: [
          {
            name: 'tenant',
            description:
              'Tenant identifier — numeric Client Tenant ID, tenant DNS name, Azure AD GUID, or friendly name',
            required: true,
          },
        ],
      },
    ],
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'alignment-review':
        return {
          description: 'Review alignment scores across all tenants',
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: [
                  'Review Inforcer alignment scores across all managed tenants and surface the most-misaligned.',
                  '',
                  'Use the available Inforcer tools to:',
                  '1. List alignment scores (inforcer_alignment_scores),',
                  '2. Rank tenants by alignment score (worst first),',
                  '3. For the bottom tenants, pull alignment details (inforcer_alignment_details) to see specific drift,',
                  '4. Summarise the common drift themes across tenants (e.g. which baseline policies drift most often).',
                  '',
                  'Present a fleet alignment dashboard: a ranked table of tenants with scores,',
                  'then a prioritized remediation list for the worst offenders.',
                  '',
                  'NOTE: Inforcer access here is READ-ONLY. Do not attempt to remediate;',
                  'recommend actions for an operator to take in the Inforcer portal.',
                ].join('\n'),
              },
            },
          ],
        };

      case 'tenant-drift-detail':
        return {
          description: 'Drill into drift for a specific tenant',
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: [
                  `Investigate baseline/policy drift for Inforcer tenant '${args?.tenant ?? '<tenant>'}'.`,
                  '',
                  'Use the available Inforcer tools to:',
                  '1. Resolve the tenant (inforcer_tenants_resolve) and confirm its Client Tenant ID,',
                  '2. Pull alignment details (inforcer_alignment_details) for that tenant,',
                  '3. List the tenant policies (inforcer_policies_list),',
                  '4. Optionally pull the Microsoft Secure Score (inforcer_secure_scores_get) for additional context,',
                  '5. Identify which baseline policies are out of alignment and the likely impact.',
                  '',
                  'Present: tenant summary, a drift table (policy, expected vs actual, severity),',
                  'and a recommended remediation order.',
                  '',
                  'NOTE: Inforcer access here is READ-ONLY (except triggering an assessment run).',
                ].join('\n'),
              },
            },
          ],
        };

      case 'identity-posture-check':
        return {
          description: 'Review identity posture for a tenant',
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: [
                  `Review the Entra ID identity posture for Inforcer tenant '${args?.tenant ?? '<tenant>'}'.`,
                  '',
                  'Use the available Inforcer tools to:',
                  '1. Resolve the tenant (inforcer_tenants_resolve),',
                  '2. List directory roles (inforcer_roles_list) and flag privileged roles,',
                  '3. List groups (inforcer_groups_list) and inspect security-relevant groups (inforcer_groups_get),',
                  '4. List users (inforcer_users_list) and spot-check high-privilege accounts (inforcer_users_get),',
                  '5. Cross-reference recent activity via the audit log (inforcer_audit_search).',
                  '',
                  'Present an identity posture report: privileged role assignments, notable groups,',
                  'and any users/activity that warrant a closer look.',
                  '',
                  'NOTE: Inforcer access here is READ-ONLY.',
                ].join('\n'),
              },
            },
          ],
        };

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });
}
