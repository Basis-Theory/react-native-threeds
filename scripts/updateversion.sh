#!/bin/bash
set -e

current_directory="$PWD"

cd $(dirname $0)/..

echo "Bumping to version ${NEW_VERSION}"

jq --arg v "$NEW_VERSION" '.version = $v' package.json > package.json.tmp && mv package.json.tmp package.json

cd "$current_directory"
