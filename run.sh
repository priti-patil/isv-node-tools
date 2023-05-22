#!/bin/bash

docker start isv-node-tool
if [ "$?" -gt 0 ]
then
    echo "Container is not present, building new image..."
    docker build -t isv-node-tool:v1 .
    echo "Running the container"
    docker run -d --name=isv-node-tool --network="host" --restart=always isv-node-tool:v1 
fi