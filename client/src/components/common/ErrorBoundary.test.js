import { test, expect } from 'vitest'
import ErrorBoundary from './ErrorBoundary.jsx'

test('getDerivedStateFromError flags the error', () => {
  expect(ErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true })
})

test('render returns children when there is no error', () => {
  const instance = new ErrorBoundary({ children: 'child-content' })
  expect(instance.render()).toBe('child-content')
})

test('render returns a role="alert" fallback when hasError is true', () => {
  const instance = new ErrorBoundary({ children: 'child-content' })
  instance.state = { hasError: true }
  const output = instance.render()
  expect(output.props.role).toBe('alert')
})
