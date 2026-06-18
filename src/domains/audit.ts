import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';

function getTools(): Tool[] {
  return [
    {
      name: 'inforcer_audit_event_types',
      description: 'List the audit event types available for filtering the activity log. Read-only.',
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'inforcer_audit_search',
      description:
        'Search the Inforcer activity (audit) log. All filters are optional; returns a ' +
        'page of events plus a continuation token for paging. Read-only.',
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        type: 'object' as const,
        properties: {
          event_types: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter to these audit event types (see inforcer_audit_event_types)',
          },
          date_from: { type: 'string', description: 'ISO-8601 start of the date range' },
          date_to: { type: 'string', description: 'ISO-8601 end of the date range' },
          page_size: { type: 'number', description: 'Max events per page' },
          continuation_token: { type: 'string', description: 'Pagination cursor from a prior page' },
        },
      },
    },
  ];
}

async function handleCall(toolName: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const client = getClient();

  switch (toolName) {
    case 'inforcer_audit_event_types': {
      logger.info('API call: auditEvents.listEventTypes');
      const result = await client.auditEvents.listEventTypes();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    case 'inforcer_audit_search': {
      const options = {
        eventTypes: args.event_types as string[] | undefined,
        dateFrom: args.date_from as string | undefined,
        dateTo: args.date_to as string | undefined,
        pageSize: args.page_size as number | undefined,
        continuationToken: args.continuation_token as string | undefined,
      };
      logger.info('API call: auditEvents.search', { eventTypes: options.eventTypes });
      const result = await client.auditEvents.search(options);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true };
  }
}

export const auditHandler: DomainHandler = { getTools, handleCall };
