import Elysia from 'elysia'
import { v7 as uuidv7 } from 'uuid'

export const traceIdPlugin = new Elysia().decorate('traceId', uuidv7())
