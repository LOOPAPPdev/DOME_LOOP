# Cloudflare Pages and private R2

This repository is prepared for a static Cloudflare Pages deployment with a private R2 bucket available to Pages Functions.

## Fixed resource names

- Pages project: `loop-dynamics-console`
- R2 bucket: `loop-dynamics-private`
- Pages output: `frontend/dist`
- R2 binding: `PRIVATE_FILES`
- Private runtime secret: `PRIVATE_FILE_ACCESS_TOKEN`

The names are intentionally explicit so the Wrangler configuration and GitHub workflow remain reproducible. The R2 bucket must stay private; do not enable a public bucket URL for evidence or uploaded files.

## One-time Cloudflare provisioning

The Cloudflare MCP/API provisioned the Pages project `loop-dynamics-console` with production branch `MANUS`, the repository build settings, and the private R2 bucket `loop-dynamics-private`. The `PRIVATE_FILES` binding is active in both preview and production.

The API-created bucket has location `ENAM`, storage class `Standard`, and default jurisdiction. The project build configuration is:

```text
corepack enable && pnpm install --frozen-lockfile && pnpm --dir frontend build
output: frontend/dist
```

If the bucket must be recreated in another account, use:

```bash
pnpm dlx wrangler@4.165.0 r2 bucket create loop-dynamics-private
```

The Pages project and bucket already exist. Do not run the creation commands again in this account.

If either resource already exists, list it first and do not recreate it:

```bash
pnpm dlx wrangler@4.165.0 pages project list
pnpm dlx wrangler@4.165.0 r2 bucket list
```

The checked-in [`wrangler.toml`](../wrangler.toml) is the source of truth for the Pages output directory and the R2 binding. Cloudflare documents `pages_build_output_dir` and `r2_buckets` for Pages Functions configuration [1], and the Pages binding is consumed through `context.env.PRIVATE_FILES` [2].

## Private file access

`functions/api/private-files/[[key]].ts` is a fail-closed Pages Function. It requires `Authorization: Bearer <PRIVATE_FILE_ACCESS_TOKEN>`, rejects traversal/control-character keys, reads only through the `PRIVATE_FILES` binding, and returns `Cache-Control: private, no-store`. Set the token as a Pages secret; never put it in frontend code, Vite environment variables, Git, or a public GitHub variable:

```bash
printf '%s' "$PRIVATE_FILE_ACCESS_TOKEN" | \
  pnpm dlx wrangler@4.165.0 pages secret put PRIVATE_FILE_ACCESS_TOKEN \
  --project-name loop-dynamics-console
```

The current React application does not call this endpoint. A future authenticated backend should authorize the user and obtain a short-lived access mechanism rather than distributing the static token to browsers.

## GitHub Actions

`.github/workflows/deploy-cloudflare.yml` builds the committed frontend with the pinned pnpm version and deploys `frontend/dist` on pushes to `MANUS`. It runs only when these repository Actions secrets exist:

- `CLOUDFLARE_API_TOKEN`: scoped to the intended account and Pages deployment permissions.
- `CLOUDFLARE_ACCOUNT_ID`: the target Cloudflare account identifier.

Add them in the repository Settings under **Secrets and variables → Actions**. The workflow deliberately does not create or delete Cloudflare resources. When the secrets are absent, it emits a setup reminder and does not fail the normal CI pipeline.

The manual workflow test completed successfully for build and typecheck, but its `Deploy Cloudflare Pages` step was skipped because the two GitHub secrets were not available to Actions. This is different from a successful production publication.

## Security boundary

The Pages bundle is public. It may contain only browser-safe configuration and static assets. R2 credentials, API tokens, private source documents, SQLite databases, indexes, and signed URLs must remain outside `frontend/dist`. Private objects are served only by the Pages Function after server-side authorization.

### References

[1]: https://developers.cloudflare.com/pages/functions/wrangler-configuration/ "Cloudflare Pages Functions Wrangler configuration"
[2]: https://developers.cloudflare.com/pages/functions/bindings/ "Cloudflare Pages Functions bindings"
[3]: https://developers.cloudflare.com/workers/wrangler/commands/pages/ "Cloudflare Wrangler Pages commands"
[4]: https://developers.cloudflare.com/pages/tutorials/use-r2-as-static-asset-storage-for-pages/ "Cloudflare Pages with R2 storage"
