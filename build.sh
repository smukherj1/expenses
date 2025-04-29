#!/usr/bin/bash

set -eu

docker build . -f images/txns.dockerfile -t txns:latest