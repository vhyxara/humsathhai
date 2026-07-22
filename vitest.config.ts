import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import react from '@vitejs/plugin-react'
import { config } from 'dotenv'

// Loads ONLY the isolated test database's connection string -- a separate
// Neon branch under the same project, never the dev .env -- from its own
// distinctly-named variable so it can never be confused with or fall back
// to DATABASE_URL. process.env.DATABASE_URL is set from it here, in this
// process only, so lib/shared/prisma.ts's singleton (which reads
// DATABASE_URL) connects to the test branch for the whole test run.
const testEnv = config({ path: '.env.test' })

if (!testEnv.parsed?.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set in .env.test')
}

process.env.DATABASE_URL = testEnv.parsed.TEST_DATABASE_URL

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // DB-backed tests need the real Node environment (Prisma/pg adapter);
    // component render tests opt into jsdom per-file via a
    // `// @vitest-environment jsdom` directive instead of switching this
    // globally.
    environment: 'node',
  },
})
