import { describe, it, expect } from 'vitest';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DOMAINS } from '../domains/navigation.js';
import { getDomainHandler } from '../domains/index.js';

async function collectAllDomainTools(): Promise<Tool[]> {
  const tools: Tool[] = [];
  for (const domain of DOMAINS) {
    const handler = await getDomainHandler(domain);
    tools.push(...handler.getTools());
  }
  return tools;
}

describe('tool annotations', () => {
  it('only inforcer_assessments_run is non-read-only', async () => {
    const tools = await collectAllDomainTools();
    const nonReadOnly = tools.filter(t => t.annotations?.readOnlyHint === false);
    expect(nonReadOnly.map(t => t.name)).toEqual(['inforcer_assessments_run']);
  });

  it('every domain tool except assessments_run is marked read-only', async () => {
    const tools = await collectAllDomainTools();
    for (const tool of tools) {
      if (tool.name === 'inforcer_assessments_run') continue;
      expect(tool.annotations?.readOnlyHint, `${tool.name} should be read-only`).toBe(true);
    }
  });

  it('inforcer_assessments_run is HIGH-IMPACT and non-destructive', async () => {
    const tools = await collectAllDomainTools();
    const run = tools.find(t => t.name === 'inforcer_assessments_run');
    expect(run).toBeDefined();
    expect(run?.description).toContain('⚠ HIGH-IMPACT');
    expect(run?.description).toContain('Confirm with the user before invoking.');
    expect(run?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('no read-only tool carries a warning prefix', async () => {
    const tools = await collectAllDomainTools();
    for (const tool of tools) {
      if (tool.annotations?.readOnlyHint === true) {
        expect(tool.description ?? '').not.toContain('⚠');
      }
    }
  });
});
