import { describe, expect, it } from 'vitest'
import { PATCH } from './route'

// Calls the real route export directly, with NO session cookie attached at
// all. If Zod validation didn't run first, this would reach getSession() ->
// cookies(), which throws outside a Next.js request scope in this test
// environment -- so a clean 400 here is proof the shape check runs, and
// short-circuits, before the auth/session logic the restructure brief
// established.
describe('PATCH /api/supply-status -- Zod validation runs before auth', () => {
  it('rejects an invalid status enum value with 400 before any session check', async () => {
    const request = new Request('http://localhost/api/supply-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'some-id', status: 'not-a-real-status' }),
    })

    const response = await PATCH(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid request')
  })

  it('rejects a body missing id with 400 before any session check', async () => {
    const request = new Request('http://localhost/api/supply-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'low' }),
    })

    const response = await PATCH(request)

    expect(response.status).toBe(400)
  })
})
