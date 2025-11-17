#!/bin/sh
node ./dist/mainServer.js &
node ./dist/mainWorker.js &
wait