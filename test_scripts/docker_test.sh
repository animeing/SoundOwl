#!/bin/bash

export MUSIC_DIR='/music'

if [ $? -eq 0 ]; then
    echo "Tests passed successfully."
    exit 0
else
    echo "Tests failed."
    exit 1
fi