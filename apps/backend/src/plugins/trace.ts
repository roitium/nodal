import Elysia from 'elysia'
import { uuidv7 } from 'uuidv7'

export const traceIdPlugin = new Elysia().decorate('traceId', uuidv7())
