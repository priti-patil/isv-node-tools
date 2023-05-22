#!/bin/bash

echo "STARTING SETUP"

echo "Starting ELK installation..."
docker-compose -f "docker-compose.yaml" up -d
echo "ELK installation complete"

echo "Installing Kibana Enhanced Table plugin"
docker exec -it kibana /usr/share/kibana/bin/kibana-plugin install https://github.com/fbaligand/kibana-enhanced-table/releases/download/v1.13.3/enhanced-table-1.13.3_7.17.2.zip

echo "Restarting the kibana container"
docker restart kibana

echo "SETUP COMPLETE"