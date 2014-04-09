#!/bin/bash
echo "importing urls"
python import.py urls netdata.db data/access.log
echo "importing zones"
python import.py zones netdata.db data/zonedata/
echo "importing processes"
python import.py iphone_processes netdata.db data/netdata/
