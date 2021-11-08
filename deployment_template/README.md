# Deployment template

This sub-folder contains the configuration files which are required to deploy
this emulator to a Docker Swarm environment.

# Host system setup

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

## Host system requirements

The manager node should be a 4 core CPU.

Worker nodes can run on 1GHz single core CPUs.

## View deployment statistics report

Go to: `<PUBLIC_IP_OF_YOUR_MANAGER_NODE>:8404/stats`
