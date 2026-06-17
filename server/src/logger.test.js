import { test } from 'node:test'
import assert from 'node:assert/strict'
import logger from './logger.js'

test('logger exposes info and error methods and does not throw when called', () => {
  assert.equal(typeof logger.info, 'function')
  assert.equal(typeof logger.error, 'function')
  assert.doesNotThrow(() => logger.info({ scope: 'test' }, 'smoke test message'))
})
