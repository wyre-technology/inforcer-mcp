import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getNavigationTools, DOMAINS } from './domains/navigation.js';
import { getDomainHandler } from './domains/index.js';
import { getCredentials } from './utils/client.js';
import { logger } from './utils/logger.js';
import type { DomainName } from './utils/types.js';
import { registerPromptHandlers } from './prompts.js';

export function createServer(): Server {
  const server = new Server(
    { name: 'inforcer-mcp', version: '1.0.0' },
    {
      capabilities: {
        tools: {},
        logging: {},
        prompts: {},
      },
    }
  );

  // Register prompt handlers
  registerPromptHandlers(server);

  // Return ALL tools upfront — navigation is a stateless help/discovery tool
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const allTools = [...getNavigationTools()];
    for (const domain of DOMAINS) {
      const handler = await getDomainHandler(domain);
      allTools.push(...handler.getTools());
    }
    return { tools: allTools };
  });

  // Route tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;

    // Navigation: navigate (stateless discovery aid)
    if (name === 'inforcer_navigate') {
      const domain = (args?.domain as string) as DomainName;
      if (!DOMAINS.includes(domain)) {
        return {
          content: [{ type: 'text' as const, text: `Invalid domain: ${domain}. Valid: ${DOMAINS.join(', ')}` }],
          isError: true,
        };
      }

      const handler = await getDomainHandler(domain);
      const tools = handler.getTools().map(t => `${t.name}: ${t.description}`);

      return {
        content: [{
          type: 'text' as const,
          text: `Domain: ${domain}\n\nAvailable tools:\n${tools.join('\n')}`,
        }],
      };
    }

    // Navigation: status — uses baselines.list() as a connectivity check,
    // mirroring the community module's validation call.
    if (name === 'inforcer_status') {
      const creds = getCredentials();
      if (!creds) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              connected: false,
              domains: DOMAINS,
              status: 'No credentials configured. Set INFORCER_REGION and INFORCER_API_KEY.',
            }, null, 2),
          }],
        };
      }

      try {
        const { getClient } = await import('./utils/client.js');
        const client = getClient();
        const baselines = await client.baselines.list();
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              connected: true,
              region: creds.region,
              baselineGroups: baselines.length,
              domains: DOMAINS,
              status: 'Connected. All tools available.',
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              connected: false,
              region: creds.region,
              domains: DOMAINS,
              status: `Connectivity check failed: ${(error as Error).message}`,
            }, null, 2),
          }],
          isError: true,
        };
      }
    }

    // Domain tool calls — try every domain handler
    for (const domain of DOMAINS) {
      const handler = await getDomainHandler(domain);
      const toolNames = handler.getTools().map(t => t.name);
      if (toolNames.includes(name)) {
        try {
          // Attach the server instance so handlers can elicit (e.g. confirm a
          // high-impact assessment run). Additive — handlers that don't need it
          // simply ignore it.
          const handlerExtra = { ...(extra as object), server };
          return await handler.handleCall(name, (args || {}) as Record<string, unknown>, handlerExtra);
        } catch (error) {
          logger.error('Tool call failed', { tool: name, error: (error as Error).message });
          return {
            content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
            isError: true,
          };
        }
      }
    }

    return {
      content: [{ type: 'text' as const, text: `Unknown tool: ${name}. Use inforcer_navigate to discover available tools.` }],
      isError: true,
    };
  });

  return server;
}
