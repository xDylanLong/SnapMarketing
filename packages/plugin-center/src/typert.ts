import { TYPERT_REMOTE } from './remote.ts'

/** Host Typert manifest consumed by dsh-typert-loader. */
export const TYPERT = {
  package: '@snapmarketing/dsh-plugin-center',
  face: 'host',
  schemas: [],
  invocations: TYPERT_REMOTE.descriptors,
  model: { services: [], events: [], objects: [] },
} as const

export default TYPERT
