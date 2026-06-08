import { createContext, useReducer } from 'react'
import { configuratorReducer, initialState } from './configuratorReducer.js'

export const ConfiguratorContext = createContext(null)

export function ConfiguratorProvider({ children }) {
  const [state, dispatch] = useReducer(configuratorReducer, initialState)
  return (
    <ConfiguratorContext.Provider value={{ state, dispatch }}>
      {children}
    </ConfiguratorContext.Provider>
  )
}
