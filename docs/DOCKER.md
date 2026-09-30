# 🐳 Docker Deployment

The project can be run using Docker. Make sure you have Docker installed on your system.

## **⚠️ Native Module Compilation**

This project uses native Node.js modules that require compilation during the build process. The Dockerfile is configured to install the necessary build dependencies automatically (python3, make, g++, sqlite-dev).

If you encounter errors during `docker build`:
- `gyp ERR! find Python` - Build dependencies not installed
- `node-gyp rebuild` failures - Missing build tools
- SQLite compilation errors - Missing sqlite-dev

These issues are automatically handled by the Dockerfile.

## Build and Run

1. Build the image and run the container:

```bash
docker build -t hyperfydemo . && docker run -d -p 3000:3000 \
  -v "$(pwd)/src:/app/src" \
  -v "$(pwd)/world:/app/world" \
  -v "$(pwd)/.env:/app/.env" \
  -e DOMAIN=demo.hyperfy.host \
  -e PORT=3000 \
  -e ASSETS_DIR=/world/assets \
  -e PUBLIC_WS_URL=https://demo.hyperfy.host/ws \
  -e PUBLIC_API_URL=https://demo.hyperfy.host/api \
  -e ASSETS_BASE_URL=https://demo.hyperfy.host/assets \
  hyperfydemo
```

This command:
- Builds the Docker image tagged as 'hyperfydemo'
- Mounts local src/, world/ directories and .env file into the container
- Exposes port 3000
- Sets up required environment variables
- Runs the container in detached mode (-d)

Note: Adjust the URLs and domain according to your specific setup.

## Native Dependencies Details

The following native Node.js modules are compiled during the build:

### Required Build Dependencies
The Dockerfile automatically installs these packages before `npm install`:
- `python3` - Python interpreter for node-gyp
- `make` - GNU Make build tool
- `g++` - GNU C++ compiler
- `sqlite-dev` - SQLite development headers

### Native Modules in This Project
1. **bufferutil** - WebSocket performance optimization
   - Required by: `ws` WebSocket package
   - Purpose: Faster buffer operations for WebSocket connections

2. **utf-8-validate** - WebSocket UTF-8 validation
   - Required by: `ws` WebSocket package
   - Purpose: UTF-8 validation for WebSocket frames

3. **better-sqlite3** - SQLite3 database bindings
   - Direct dependency
   - Purpose: High-performance SQLite database operations

### How It Works
1. Docker build starts with Alpine Linux base image
2. Build dependencies are installed (`apk add python3 make g++ sqlite-dev`)
3. `npm install` runs and compiles native modules using node-gyp
4. Compiled .node files are created in node_modules
5. Application is built and ready to run

### Troubleshooting
If build fails on a different system/architecture:
- Ensure the base image supports your architecture (amd64/arm64)
- Check if additional Alpine packages are needed for specific native modules
- Verify Docker has sufficient memory for compilation (minimum 2GB recommended)

## World backup & restore (admin UI)

Both worlds ship a **Backup** section in the core UI World pane (admin only;
needs the world's `ADMIN_CODE`, the same one used with `/admin <code>`):

- **Download World** — zips the live world folder (`db.sqlite` + `assets/` +
  `collections/`) and downloads it. The zip is built in `/app/world-backups`
  inside the container; **download it before any redeploy** — the container
  filesystem is wiped on redeploy, so the download *is* the backup of record.
- **Restore World** — uploads a world-backup zip, then exits the server. With
  `WORLD_RESTORE_AUTO=true` (set on the Coolify services) the container
  restarts automatically; `scripts/docker-entrypoint.sh` replaces the world
  folder before the server boots again.

API (admin code via `X-Admin-Code` header or `?adminCode=`):

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/world/backup/start` | Begin building a zip (async) |
| GET | `/api/world/backup/status` | `{status: idle\|running\|done\|failed, size, error}` |
| GET | `/api/world/backup/download` | Stream the finished zip (409 if not ready) |
| POST | `/api/world/restore` | Stage an uploaded zip (validated), then restart |

Design notes:

- `db.sqlite` is snapshotted with a consistent online copy (`VACUUM INTO`,
  falling back to `wal_checkpoint(TRUNCATE)` + file copy) and appended to the
  zip, so a backup never captures a half-written database mid-save.
- Restore is **stage-then-exit** on purpose: replacing the sqlite file under a
  running server corrupts it. The entrypoint applies the staged zip when
  nothing holds the file open. Corrupt zips are renamed aside
  (`restore-pending.failed.zip`) and boot continues — never a crash loop.
- Upload validation parses the zip central directory in-process (no `unzip`
  dependency in the server; `zip` is only needed to *create* backups), and
  rejects path-traversal entries.
- Requires `zip`/`unzip` in the image (the Dockerfile installs them) and the
  `ENTRYPOINT` script.
