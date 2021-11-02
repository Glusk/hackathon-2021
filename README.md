# [OCPP 1.6](https://www.openchargealliance.org/protocols/ocpp-16/) Central System and Charge Point Emulator

[![Node.js CI](https://github.com/Glusk/hackaton-2021/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/Glusk/hackaton-2021/actions/workflows/node.js.yml)

## Install

1. Download [Node.js](https://nodejs.org/en/download/).

2. Go to root folder of repo (where `package.json` file is present) and run:
   ```bash
   npm ci
   ```

## Running the server

Open shell in root folder and run:

```bash
npm run server
```

## Running a client

Open shell in root folder and run:

```bash
npm run client
```

## Docker image

Attached `Dockerfile` is used to generate the container image of
this project. The latest image is hosted on DockerHub
([glusk/hackathon-2021](https://hub.docker.com/repository/docker/glusk/hackathon-2021)).

The image is meant to be used in a Docker Compose script file.

## Docker Swarm orchestration

The Docker image of this project can be used to setup the deployment of client
and server tasks. A sample `docker-compose.yml` could look like this:

```yml
version: '3.9'

services:
  node-server:
    image: glusk/hackathon-2021:latest
    ports:
      - 8080:8080
    command: npm run server
    deploy:
      endpoint_mode: dnsrr
  node-client:
    image: glusk/hackathon-2021:latest
    environment:
      - CS_HOST=172.19.0.8
      - CS_PROTOCOL=wss
    command: npm run client
    deploy:
      mode: replicated
      replicas: 6
```

## Some general info on inner flow

### Server

1. Server accepts client connections and upgrades them to websocket connections.
2. It responds to various OCPP messages.
3. Occasionally, it sends a PING to determine which clients are still alive.

### Client

1. When a client connects to the server via a websocket, it sends a boot notification.
2. After a response is received, it reads the heartbeat interval from it.
3. It sends heartbeat message according to the interval.

## Environment variables

### Environment variables that client script uses

1. **CS_PROTOCOL** defaults to **ws**. possible values are: ws, wss (for SSL)
2. **CS_HOST** defaults to **localhost**. host to connect to
3. **CS_PORT** defaults to **8080**. port to connect to
4. **CONCURRENCY_LEVEL** defaults to 1. Number of clients to create
5. **LOG_PAYLOAD** verbose logging of data exchange between client and server
6. **LOG_LIFECYCLE** = log lifecycle events (connect, reconnect, ping/pong)

### Environment variables that server script uses

1. **WEB_SRV_HOST** interface to bind to (could be only one)
2. **WEB_SRV_PORT** port on bind interface
3. **HEARTBEAT_INT_MS** interval in which we check client if its still connected
4. **LOG_PAYLOAD** verbose logging of data exchange between client and server
5. **LOG_LIFECYCLE** = log lifecycle events (connect, reconnect, ping/pong)
