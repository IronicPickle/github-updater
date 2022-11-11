#!/bin/bash

BASEDIR=$(dirname 0$)
cd $BASEDIR
deno run --allow-read --allow-net --allow-run src/index.ts
