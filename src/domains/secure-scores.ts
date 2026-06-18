import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';

const TENANT_ARG_DESC =
  'Tenant identifier — accepts a numeric Client Tenant ID, a tenant DNS name, ' +
  'an Azure AD tenant GUID, or a friendly name. Resolved to the numeric Client ' +
  'Tenant ID before the request.';

function getTools(): Tool[] {
  return [
    {
      name: 'inforcer_secure_scores_get',
      description:
        `Get the Microsoft Secure Score data for a tenant. ${TENANT_ARG_DESC} Read-only.`,
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          tenant: { type: 'string', description: TENANT_ARG_DESC },
        },
        required: ['tenant'],
      },
    },
  ];
}

async function handleCall(toolName: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const client = getClient();

  switch (toolName) {
    case 'inforcer_secure_scores_get': {
      const tenant = args.tenant as string;
      logger.info('API call: secureScores.getByTenant', { tenant });
      const result = await client.secureScores.getByTenant(tenant);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true };
  }
}

export const secureScoresHandler: DomainHandler = { getTools, handleCall };
