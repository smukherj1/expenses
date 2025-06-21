#!/usr/bin/bash

set -eu

TOOL="docker"

${TOOL} build . -f images/txns.dockerfile -t txns:latest
${TOOL} compose up -d
