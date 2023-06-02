#!/bin/bash

set -e

printHelp () {
	echo "Usage: control.sh <command>"
	echo "Available commands:"
	echo
	echo "   start        Pulls changes, builds docker image(s), and starts"
	echo "                the services (Nginx, Node.js)."
	echo "   startdev     Pulls changes, builds docker image(s), and starts"
	echo "                the services (Nginx, Node.js)."
	echo
	echo "   reloadnginx  Reloads the nginx configuration"
	echo
	echo "   stop         Stops the services."
	echo
	echo "   logs         Tail -f services' logs."
	echo
	echo "   shell        Opens a shell into the Node.js container."
	echo
	echo "   shellnginx   Opens a shell into the Nginx container."
	echo
	echo "   dbbackup     Takes a SQL dumb of the database and stores it in backup.sql"
}

dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
pushd $dir > /dev/null

case "$1" in
start)
	git pull
	./fixup.sh
	docker-compose -p heisse-preise -f docker-compose.base.yml -f docker-compose.prod.yml build
	docker-compose -p heisse-preise -f docker-compose.base.yml -f docker-compose.prod.yml up -d
	;;
startdev)
	docker-compose -p heisse-preise -f docker-compose.base.yml -f docker-compose.dev.yml build
	docker-compose -p heisse-preise -f docker-compose.base.yml -f docker-compose.dev.yml up
	;;
reloadnginx)
	docker exec -it hp_nginx nginx -t
	docker exec -it hp_nginx nginx -s reload
	;;
stop)
	docker-compose -p heisse-preise -f docker-compose.base.yml down -t 1
	;;
shell)
	docker exec -it hp_site bash
	;;
shellnginx)
	docker exec -it hp_nginx bash
	;;
logs)
	docker-compose -p heisse-preise -f docker-compose.base.yml logs -f
	;;
*)
	echo "Invalid command $1"
	printHelp
	;;
esac

popd > /dev/null