import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: {
      target: 'http://localhost:8000/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      schemas: './src/api/generated/models',
      client: 'fetch',
      override: {
        mutator: {
          path: './src/api/fetcher.ts',
          name: 'customFetch',
        },
      },
    },
  },
})

