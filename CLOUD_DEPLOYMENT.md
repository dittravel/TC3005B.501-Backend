# Dittravel Cloud Deployment (3 Debian Instances, Docker-only)

## Quick Reference

Daily update loop on any VM (after `git pull`):

```bash
# DB VM
cd ~/TC3005B.501-Backend  && git pull && bash switch-env.sh serverDockerDB

# Backend VM
cd ~/TC3005B.501-Backend  && git pull && bash switch-env.sh serverDocker

# Frontend VM
cd ~/TC3005B.501-Frontend && git pull && bash switch-env.sh serverDocker
```

Force a full container down/up (rare):

```bash
FORCE_DOWN=1 bash switch-env.sh <mode>
```

Apply backend DB migrations after deploy:

```bash
docker compose exec -T backend npx prisma migrate deploy
```

Validate from your laptop:

```bash
ssh puertos          # opens tunnels 4321 and 3000
# then browse https://localhost:4321 and https://localhost:3000
```

Common checks per VM:

```bash
docker compose ps
docker compose logs -f <service>     # mariadb | mongodb | backend | frontend
ss -ltnp | grep -E '3306|27017|3000|4321'
nc -zv 172.16.60.115 3306            # from backend VM
nc -zv <BACKEND_PRIVATE_IP> 3000     # from frontend VM
```

Full setup details below.

---

Three Debian VMs, all using Docker. Each instance runs one role.

| Role | Repo cloned | Mode |
|------|-------------|------|
| DB   | TC3005B.501-Backend | `serverDockerDB` (MariaDB + MongoDB containers) |
| Backend | TC3005B.501-Backend | `serverDocker` (backend container) |
| Frontend | TC3005B.501-Frontend | `serverDocker` (frontend container) |

Needed known IPs:

- DB:       `172.16.60.115`
- Backend:  `<BACKEND_PRIVATE_IP>`
- Frontend: `<FRONTEND_PRIVATE_IP>`

## 1. One-Time Local Setup

### SSH config (`~/.ssh/config`)

```sshconfig
Host jumpserver
  HostName 10.49.12.24
  User dittravel
  IdentityFile ~/.ssh/dittravel
  Port 49666

Host dittdb
  HostName 172.16.60.115
  User dittravel
  IdentityFile ~/.ssh/dittravel
  ProxyJump jumpserver

Host dittback
  HostName <BACKEND_PRIVATE_IP>
  User dittravel
  IdentityFile ~/.ssh/dittravel
  ProxyJump jumpserver

Host dittfront
  HostName <FRONTEND_PRIVATE_IP>
  User dittravel
  IdentityFile ~/.ssh/dittravel
  ProxyJump jumpserver

Host puertos
  HostName <FRONTEND_PRIVATE_IP>
  User dittravel
  IdentityFile ~/.ssh/dittravel
  ProxyJump jumpserver
  LocalForward 4321 localhost:4321
  LocalForward 3000 <BACKEND_PRIVATE_IP>:3000
```

### Key permissions

Linux/macOS:

```bash
chmod 600 ~/.ssh/dittravel
chmod 644 ~/.ssh/dittravel.pub
chmod 700 ~/.ssh
chmod 600 ~/.ssh/config
```

Windows PowerShell:

```powershell
icacls $env:USERPROFILE\.ssh\dittravel /inheritance:r /grant:r "$env:USERNAME`:F"
```

## 2. Common Base Install (run ONCE per fresh VM)

Run on all three VMs:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release git openssh-client netcat-openbsd

sudo install -m 0755 -d /etc/apt/keyrings
DISTRO_ID=$(. /etc/os-release && echo "$ID")
DISTRO_CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")

curl -fsSL "https://download.docker.com/linux/${DISTRO_ID}/gpg" | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DISTRO_ID} ${DISTRO_CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Log out and back in once, then verify:

```bash
git --version
docker --version
docker compose version
```

> Node.js / pnpm are NOT required on any instance. The switch scripts are plain bash; everything else runs in containers.

## 3. Per-Instance Setup (one-time)

### 3.1 DB Instance (`dittdb`, 172.16.60.115)

```bash
git clone <BACKEND_REPO_URL> ~/TC3005B.501-Backend
cd ~/TC3005B.501-Backend
cp .env.example .env
```

Edit `.env` and set at minimum:

- `DB_NAME=CocoScheme`
- `DB_USER=travel_user`
- `DB_PASSWORD=<strong_password>`
- `DB_ROOT_PASSWORD=<strong_root_password>`

Then:

```bash
bash switch-env.sh serverDockerDB
docker compose ps
ss -ltnp | grep -E '3306|27017'
```

### 3.2 Backend Instance (`dittback`)

```bash
git clone <BACKEND_REPO_URL> ~/TC3005B.501-Backend
cd ~/TC3005B.501-Backend
cp .env.example .env
```

Edit `.env` and set:

- `SERVER_DOCKER_DB_IP=172.16.60.115`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD` (must match DB instance)
- `JWT_SECRET`, `AES_SECRET_KEY`, `AES_IV`, `MAIL_USER`, `MAIL_PASSWORD`

Verify DB reachability:

```bash
nc -zv 172.16.60.115 3306
nc -zv 172.16.60.115 27017
```

Then:

```bash
bash switch-env.sh serverDocker
docker compose exec -T backend npx prisma migrate deploy
docker compose ps
```

Optional seed (wipes data):

```bash
docker compose exec -T backend npm run prisma:seed
# or
docker compose exec -T backend npm run prisma:seed:dummy
```

### 3.3 Frontend Instance (`dittfront`)

```bash
git clone <FRONTEND_REPO_URL> ~/TC3005B.501-Frontend
cd ~/TC3005B.501-Frontend
cp .env.example .env
```

Edit `.env` and set:

- `SERVER_DOCKER_BACKEND_IP=<BACKEND_PRIVATE_IP>`

Then:

```bash
bash switch-env.sh serverDocker
docker compose ps
```

## 4. Daily Workflow

After you push changes from your laptop:

```bash
# On the relevant VM
cd ~/TC3005B.501-Backend     # or ~/TC3005B.501-Frontend on the frontend VM
git pull
bash switch-env.sh <mode>    # serverDockerDB | serverDocker | serverDocker
```

Modes per VM:

- DB VM:       `serverDockerDB`
- Backend VM:  `serverDocker`
- Frontend VM: `serverDocker`

Default behavior avoids a full `docker compose down`. Force a full stop/start only when needed:

```bash
FORCE_DOWN=1 bash switch-env.sh <mode>
```

## 5. Validation From Your Laptop

```bash
ssh puertos
```

Open in browser:

- `https://localhost:4321`
- `https://localhost:3000`

## 6. Required Network Rules (OpenStack Security Groups)

- DB VM: allow TCP `3306` and `27017` from backend VM
- Backend VM: allow TCP `3000` from frontend VM
- Frontend VM: allow TCP `4321` from your jump/tunnel path

## 7. Change Management

- DB IP changes: update `SERVER_DOCKER_DB_IP` in backend `.env`, then `bash switch-env.sh serverDocker`.
- Backend IP changes: update `SERVER_DOCKER_BACKEND_IP` in frontend `.env`, then `bash switch-env.sh serverDocker`.
- DB credentials change: update `.env` on both DB and backend VMs, then re-run their respective switchers.

## 8. Troubleshooting

Backend can’t reach DB:

- Recheck `SERVER_DOCKER_DB_IP` in backend `.env`.
- Recheck DB VM security group allows backend VM.
- On DB VM: `docker compose ps` and `ss -ltnp | grep -E '3306|27017'`.

Frontend can’t reach backend:

- Recheck `SERVER_DOCKER_BACKEND_IP` in frontend `.env`.
- Recheck backend VM security group allows frontend VM.
- On backend VM: `docker compose ps` and `docker compose logs -f backend`.

Prisma error `Unknown authentication plugin 'sha256_password'`:

- DB user uses an incompatible auth plugin. Use a MariaDB user with `mysql_native_password`.
