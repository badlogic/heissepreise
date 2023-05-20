#!/bin/bash
set -e
scp marioslab.io:/home/badlogic/heissepreise/docker/data/logs/access.log .
goaccess access.log -o report.html --log-format=COMBINED
open report.html