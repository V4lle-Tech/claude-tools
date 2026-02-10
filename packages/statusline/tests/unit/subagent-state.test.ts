import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { readState, writeState, addAgent, removeAgent, STATE_FILE_PATH } from '../../src/utils/subagent-state';
import type { SubagentEntry, SubagentState } from '../../src/utils/subagent-state';
import { unlink } from 'fs/promises';

describe('subagent-state', () => {
  beforeEach(async () => {
    // Clean up state file before each test
    try {
      await unlink(STATE_FILE_PATH);
    } catch {
      // File may not exist
    }
  });

  afterEach(async () => {
    try {
      await unlink(STATE_FILE_PATH);
    } catch {
      // File may not exist
    }
  });

  describe('readState', () => {
    it('returns empty state when file does not exist', async () => {
      const state = await readState();
      expect(state.active).toEqual([]);
      expect(state.last_updated).toBe(0);
    });

    it('reads a valid state file', async () => {
      const mockState: SubagentState = {
        active: [
          {
            agent_id: 'a1',
            agent_type: 'Explore',
            model: 'Haiku',
            started_at: 1000,
            session_id: 'sess1',
          },
        ],
        last_updated: 1000,
      };
      await Bun.write(STATE_FILE_PATH, JSON.stringify(mockState));

      const state = await readState();
      expect(state.active).toHaveLength(1);
      expect(state.active[0].agent_id).toBe('a1');
    });

    it('returns empty state for corrupt file', async () => {
      await Bun.write(STATE_FILE_PATH, 'not json');
      const state = await readState();
      expect(state.active).toEqual([]);
    });
  });

  describe('writeState', () => {
    it('writes state atomically and sets last_updated', async () => {
      const state: SubagentState = {
        active: [],
        last_updated: 0,
      };

      await writeState(state);

      const written = await Bun.file(STATE_FILE_PATH).json();
      expect(written.last_updated).toBeGreaterThan(0);
      expect(written.active).toEqual([]);
    });
  });

  describe('addAgent', () => {
    it('adds an agent to empty state', async () => {
      const entry: SubagentEntry = {
        agent_id: 'a1',
        agent_type: 'Explore',
        model: 'Haiku',
        started_at: Date.now(),
        session_id: 'sess1',
      };

      await addAgent(entry);

      const state = await readState();
      expect(state.active).toHaveLength(1);
      expect(state.active[0].agent_id).toBe('a1');
    });

    it('deduplicates agents by ID', async () => {
      const entry: SubagentEntry = {
        agent_id: 'a1',
        agent_type: 'Explore',
        model: 'Haiku',
        started_at: Date.now(),
        session_id: 'sess1',
      };

      await addAgent(entry);
      await addAgent({ ...entry, model: 'Sonnet' });

      const state = await readState();
      expect(state.active).toHaveLength(1);
      expect(state.active[0].model).toBe('Sonnet');
    });

    it('adds multiple distinct agents', async () => {
      await addAgent({
        agent_id: 'a1',
        agent_type: 'Explore',
        model: 'Haiku',
        started_at: Date.now(),
        session_id: 'sess1',
      });
      await addAgent({
        agent_id: 'a2',
        agent_type: 'Plan',
        model: 'Sonnet',
        started_at: Date.now(),
        session_id: 'sess1',
      });

      const state = await readState();
      expect(state.active).toHaveLength(2);
    });
  });

  describe('removeAgent', () => {
    it('removes an agent by ID', async () => {
      await addAgent({
        agent_id: 'a1',
        agent_type: 'Explore',
        model: 'Haiku',
        started_at: Date.now(),
        session_id: 'sess1',
      });
      await addAgent({
        agent_id: 'a2',
        agent_type: 'Plan',
        model: 'Sonnet',
        started_at: Date.now(),
        session_id: 'sess1',
      });

      await removeAgent('a1');

      const state = await readState();
      expect(state.active).toHaveLength(1);
      expect(state.active[0].agent_id).toBe('a2');
    });

    it('handles removing non-existent agent gracefully', async () => {
      await addAgent({
        agent_id: 'a1',
        agent_type: 'Explore',
        model: 'Haiku',
        started_at: Date.now(),
        session_id: 'sess1',
      });

      await removeAgent('nonexistent');

      const state = await readState();
      expect(state.active).toHaveLength(1);
    });
  });
});
