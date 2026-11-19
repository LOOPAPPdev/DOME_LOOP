# CI/CD pipeline

`.github/workflows/ci.yml` runs on pull requests and pushes to `MANUS`, with a manual `workflow_dispatch` option. The workflow has four gates.

The `backend` matrix installs the declared `vector` and `test` extras on Python 3.10, 3.11 and 3.12, then runs the deterministic unittest suite and bytecode compilation. The `frontend` job installs the pinned pnpm workspace, runs strict TypeScript checking, produces a Vite production build, and validates `manus-routes.json`. The `contracts` job validates the public system-case example against its JSON Schema. No excluded database, vector index, or derived source extract is required by these jobs.

When a push to `MANUS` passes all gates, the `package` job uploads `frontend/dist` as a short-lived GitHub Actions artifact. This is the safe CD handoff for later Cloudflare Pages or another approved publisher; it does not automatically publish the public branch or expose private data.
