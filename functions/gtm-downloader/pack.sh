#!/usr/bin/env bash
pack build \
  --builder gcr.io/buildpacks/builder:v1 \
  --env GOOGLE_RUNTIME=nodejs \
  --env GOOGLE_FUNCTION_SIGNATURE_TYPE=http \
  --env GOOGLE_FUNCTION_TARGET=getGTMContainerSettings \
  tyssejc/gtm_container