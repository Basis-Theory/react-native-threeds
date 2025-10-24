MAKEFLAGS += --silent

verify:
	./scripts/verify.sh

build:
	./scripts/build.sh

release:
	yarn release

update-version:
	./scripts/updateversion.sh
