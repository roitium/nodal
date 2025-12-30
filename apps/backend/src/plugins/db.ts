import { db } from '@/db/db'
import Elysia from 'elysia'

export const dbPlugin = new Elysia({ name: 'db-plugin' }).decorate('db', db)
