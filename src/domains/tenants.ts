import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';

const TENANT_ARG_DESC =
  'Tenant identifier — accepts a numeric Client Tenant ID, a tenant DNS name, ' +
  'an Azure AD tenant GUID, or a friendly name. Resolved to the numeric Client ' +
  'Tenant ID before the request. Ambiguous names throw a clear error.';

function getTools(): Tool[] {
  return [
    {
      name: 'inforcer_tenants_list',
      description: 'List all managed tenants. Read-only.',
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'inforcer_tenants_get',
      description: `Get a single tenant. ${TENANT_ARG_DESC} Read-only.`,
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          tenant: { type: 'string', description: TENANT_ARG_DESC },
        },
        required: ['tenant'],
      },
    },
    {
      name: 'inforcer_tenants_resolve',
      description:
        'Resolve a tenant name, DNS name, or Azure AD GUID to its numeric Inforcer ' +
        'Client Tenant ID (which is NOT the Azure AD tenant GUID). Read-only.',
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
    case 'inforcer_tenants_list': {
      logger.info('API call: tenants.list');
      const result = await client.tenants.list();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'inforcer_tenants_get': {
      const tenant = args.tenant as string;
      logger.info('API call: tenants.get', { tenant });
      const result = await client.tenants.get(tenant);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'inforcer_tenants_resolve': {
      const tenant = args.tenant as string;
      logger.info('API call: resolveTenantId', { tenant });
      const clientTenantId = await client.resolveTenantId(tenant);
      return {
        content: [{ type: 'text', text: JSON.stringify({ input: tenant, clientTenantId }, null, 2) }],
      };
    }
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true };
  }
}

export const tenantsHandler: DomainHandler = { getTools, handleCall };
