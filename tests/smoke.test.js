/**
 * SMOKE TEST — validates test infrastructure works.
 *
 * WHY: This project is in spec phase. This test proves the test
 * framework is wired up correctly so that real tests can be added
 * alongside the implementation code.
 *
 * NEXT: When src/ is built, add tests for:
 * - Agent logic/handlers (unit tests, mock Redis/BullMQ)
 * - Express API endpoints (use supertest)
 * - Queue processing (mock BullMQ worker)
 */
import { describe, it, expect } from 'vitest'

describe('Test infrastructure', () => {
  it('should be able to run tests', () => {
    expect(true).toBe(true)
  })
})
