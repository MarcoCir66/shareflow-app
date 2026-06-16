import { ConfiguratorContext } from '../../context/ConfiguratorContext.jsx'

const noop = () => {}

export function PreviewProvider({ state, children }) {
  return (
    <ConfiguratorContext.Provider value={{ state, dispatch: noop }}>
      {children}
    </ConfiguratorContext.Provider>
  )
}
