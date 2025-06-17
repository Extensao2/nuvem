all: stop start

stop:
	docker compose down

start:
	docker compose up -d

clean: stop
	docker ps -a -q | xargs docker rm -f
	docker images -q | xargs docker rmi -f
