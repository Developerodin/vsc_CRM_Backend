# CRM API Performance & Infra Guide

## What we fixed in code

- Dashboard analytics use Mongo `$group` aggregations (no full-collection hydrate + `save()` loops)
- `GET /v1/dashboard/summary` fans in dashboard data in one round-trip (2 min cache)
- Pagination defaults to **50**, hard-capped at **100**
- Timeline / task / file search resolve IDs in Mongo **before** paginate
- Frequency-status-stats aggregates with `$facet` / `$group` (no `$push` of every doc)
- Cron moved to dedicated PM2 `worker` process in production

## Recommended production shape

| Role | Spec | Notes |
|------|------|-------|
| API EC2 | **t3.large** (2 vCPU / 8 GB) default; **t3.medium** only for light traffic | Avoid t2/t3.micro |
| Worker | Same host via PM2 `worker`, or small second instance | Timeline + task-status crons |
| MongoDB Atlas | **M10+**, region **`ap-south-1`** (same as S3/API) | Indexes already on Timeline/Task; add text indexes later for search |
| Redis | ElastiCache `cache.t3.micro` **before** scaling PM2 `instances > 1` | Current cache is process-local `Map` |
| Nginx | Reverse proxy, gzip, keep-alive, upload body limits | Do not expose Node bare |
| S3 uploads | Stream to S3 (avoid multer memory buffers for large files) | Ask before adding `multer-s3` |

## PM2

```bash
pm2 start ecosystem.config.json
# apps: "app" (ENABLE_CRON=false) + "worker" (ENABLE_CRON=true)
```

Do **not** set `instances: max` on `app` until Redis replaces in-memory cache.

## Measuring

- Slow requests (≥1s) log as `[slow] METHOD url Nms`
- Response header: `X-Response-Time`
- Watch Atlas metrics (scan vs IXSCAN) on dashboard/timeline collections after deploy

## Redis migration note

`src/utils/cache.js` is an in-process Map. When introducing Redis:

1. Keep the same `get` / `set` / `generateKey` API
2. Point dashboard summary + role cache at Redis
3. Then scale PM2 cluster safely
