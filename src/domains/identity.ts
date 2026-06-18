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
      name: 'inforcer_users_list',
      description:
        `List Entra ID user summaries for a tenant (paginated). ${TENANT_ARG_DESC} Read-only.`,
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          tenant: { type: 'string', description: TENANT_ARG_DESC },
          search: { type: 'string', description: 'Filter users by search term' },
          continuation_token: { type: 'string', description: 'Pagination cursor from a prior page' },
        },
        required: ['tenant'],
      },
    },
    {
      name: 'inforcer_users_get',
      description: `Get full detail for a single user. ${TENANT_ARG_DESC} Read-only.`,
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          tenant: { type: 'string', description: TENANT_ARG_DESC },
          user_id: { type: 'string', description: 'The user ID (Entra object ID)' },
        },
        required: ['tenant', 'user_id'],
      },
    },
    {
      name: 'inforcer_groups_list',
      description:
        `List Entra ID group summaries for a tenant (paginated). ${TENANT_ARG_DESC} Read-only.`,
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          tenant: { type: 'string', description: TENANT_ARG_DESC },
          search: { type: 'string', description: 'Filter groups by search term' },
          continuation_token: { type: 'string', description: 'Pagination cursor from a prior page' },
        },
        required: ['tenant'],
      },
    },
    {
      name: 'inforcer_groups_get',
      description:
        `Get full detail for a single group, including members. ${TENANT_ARG_DESC} Read-only.`,
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          tenant: { type: 'string', description: TENANT_ARG_DESC },
          group_id: { type: 'string', description: 'The group ID (Entra object ID)' },
        },
        required: ['tenant', 'group_id'],
      },
    },
    {
      name: 'inforcer_roles_list',
      description:
        `List Entra ID directory role definitions for a tenant. ${TENANT_ARG_DESC} Read-only.`,
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
    case 'inforcer_users_list': {
      const tenant = args.tenant as string;
      const options = {
        search: args.search as string | undefined,
        continuationToken: args.continuation_token as string | undefined,
      };
      logger.info('API call: users.listByTenant', { tenant });
      const result = await client.users.listByTenant(tenant, options);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'inforcer_users_get': {
      const tenant = args.tenant as string;
      const userId = args.user_id as string;
      logger.info('API call: users.get', { tenant, userId });
      const result = await client.users.get(tenant, userId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'inforcer_groups_list': {
      const tenant = args.tenant as string;
      const options = {
        search: args.search as string | undefined,
        continuationToken: args.continuation_token as string | undefined,
      };
      logger.info('API call: groups.listByTenant', { tenant });
      const result = await client.groups.listByTenant(tenant, options);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'inforcer_groups_get': {
      const tenant = args.tenant as string;
      const groupId = args.group_id as string;
      logger.info('API call: groups.get', { tenant, groupId });
      const result = await client.groups.get(tenant, groupId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'inforcer_roles_list': {
      const tenant = args.tenant as string;
      logger.info('API call: roles.listByTenant', { tenant });
      const result = await client.roles.listByTenant(tenant);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true };
  }
}

export const identityHandler: DomainHandler = { getTools, handleCall };
