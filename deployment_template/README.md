# Deployment template

This sub-folder contains the configuration files to deploy this emulator to
a Docker Swarm environment.

## How to deploy

Copy this folder to a _manager_ node and edit `CS_HOST` environnement variable
in `docker-compose.yml` to match the public IP of your manager node.

Then run:

```bash
docker stack deploy --compose-file=docker-compose.yml hackathon-2021
```
