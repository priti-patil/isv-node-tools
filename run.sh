#!/bin/bash

docker start isv-node-tool
if [ "$?" -gt 0 ]
then
    echo "Container is not present, building new image..."
    docker build -t isv-node-tool:v1 .
    echo "Running the container"
    docker run --name=isv-node-tool --network="host" --restart=on-failure:5 isv-node-tool:v1 
fi