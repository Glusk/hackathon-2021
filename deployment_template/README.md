# Deployment template

This sub-folder contains the configuration files which are required to deploy
this emulator to a Docker Swarm environment.

# Host system setup

The test is meant to be run on 1 *manager* node and 20 *worker* nodes. Therefore,
we require the following host systems:

- 1x 4 core CPU manager host with 32GB of memory
- 20x 1 core CPU worker hosts with 4GB of memory

## Shared setup

Every host system needs to be equipped with Docker. Here's a snippet on how
to do so from https://dockerswarm.rocks:

```bash
# ssh into your instance
# ...

# Install the latest updates
apt-get update
apt-get upgrade -y

# Download Docker
curl -fsSL get.docker.com -o get-docker.sh
# Install Docker using the stable channel (instead of the default "edge")
CHANNEL=stable sh get-docker.sh
# Remove Docker install script
rm get-docker.sh
```

## Manager-specific setup

The manager node runs HAProxy. In order for it to accept 1 million connections,
the number of open files limit has to be increased to roughly around 2 million.
To do so, run:

```bash
# 1. change to root
sudo su -
# 2. increase the open files limit
sysctl -w fs.nr_open=2010000
# 3. save changes and exit
sysctl -p
exit
# 4. now you are back in the user shell; you need to re-log
# from this shell as well for the changes to take effect
exit
```

Note that this configuration change doesn't persist upon re-boot.

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

## View deployment statistics report

Go to: `<PUBLIC_IP_OF_YOUR_MANAGER_NODE>:8404/stats`
