import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';

function getTools(): Tool[] {
  return [
    {
      name: 'inforcer_baselines_list',
      description:
        'List baseline groups and their members. Optionally filter by the baseline ' +
        '(owner) tenant ID. Read-only.',
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          baseline_tenant_id: {
            type: 'number',
            description: 'Filter baseline groups by baseline (owner) Client Tenant ID',
          },
        },
      },
    },
  ];
}

async function handleCall(toolName: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const client = getClient();

  switch (toolName) {
    case 'inforcer_baselines_list': {
      const baselineTenantId = args.baseline_tenant_id as number | undefined;
      logger.info('API call: baselines.list', { baselineTenantId });
      const result = await client.baselines.list(
        baselineTenantId !== undefined ? { baselineTenantId } : {}
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true };
  }
}

export const baselinesHandler: DomainHandler = { getTools, handleCall };
