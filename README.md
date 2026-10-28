# Local Service Bus Viewer

Local Azure Service Bus emulator and a web viewer for inspecting and sending messages. The included sample configuration uses demonstration-only entity names; customize your local configuration as needed.

## Prerequisites

- Docker Desktop with Docker Compose
- Node.js and npm only if running the backend or frontend outside Docker

## First-time setup

Create the local emulator configuration from the sample:

```powershell
Copy-Item .\config.example.json .\config.json
```

Edit `config.json` to define the namespace, queues, topics, and subscriptions for your local environment. This file is excluded from Git; use `config.example.json` for shareable changes to the sample.

## Start the stack

Run from this directory:

```powershell
docker compose up --build -d
```

Open <http://localhost:5173>. The backend runs on port 3000 inside the Compose network. The emulator exposes AMQP on `localhost:5672` and its health/management endpoint on `localhost:5300`.

Check service status and logs:

```powershell
docker compose ps
docker compose logs -f emulator backend frontend
```

Stop the stack:

```powershell
docker compose down
```

## Viewer API

- `GET /api/entities` reads the configured namespaces and discovers queues, topics, and subscriptions.
- `POST /api/messages/peek` inspects messages without consuming them; accepts between 1 and 100 messages.
- `POST /api/messages/send` publishes a JSON message to the selected queue or topic.
- Socket.IO streams refreshed messages for the selected entity every three seconds.

The backend reads the mounted configuration at request time. The viewer refreshes the entity list periodically, so configuration changes are reflected without hardcoding entity names in the application.

## Run without Docker

Start the emulator separately, then run the backend and frontend in separate PowerShell terminals.

Backend:

```powershell
Set-Location .\backend
$env:SERVICEBUS_CONFIG_PATH = ..\config.json
$env:SERVICEBUS_CONNECTION_STRING = 'Endpoint=sb://localhost/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=SAS_KEY_VALUE;UseDevelopmentEmulator=true'
npm run start:dev
```

Frontend:

```powershell
Set-Location .\frontend
npm run dev
```

The Vite development proxy targets the Docker Compose service name `backend`. For standalone execution, change its target to `localhost:3000`.
