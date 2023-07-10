#!/bin/sh
set -e
CMD="cd heissepreise && git checkout -- . && ./docker/control.sh stop && ./docker/control.sh start && ./docker/control.sh logs"
echo $CMD
ssh -t marioslab.io $CMD