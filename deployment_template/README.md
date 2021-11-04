# Deployment template

This sub-folder contains the configuration files which are required to deploy
this emulator to a Docker Swarm environment.

## How to deploy

First, [create a new swarm](https://docs.docker.com/engine/swarm/swarm-tutorial/create-swarm/)
and [add nodes to it](https://docs.docker.com/engine/swarm/swarm-tutorial/add-nodes/).
All your nodes should be on the same private network.

Next, copy this folder's contents to a _manager_ node and edit `CS_HOST`
environment variable in `docker-compose.yml` to match the public IP of your
manager node.

Then run the following command on your manager node:

```bash
docker stack deploy --compose-file=docker-compose.yml hackathon-2021
```

## Host system requirements

The manager node should be a 4 core CPU.

Worker nodes can run on 1GHz single core CPUs.
