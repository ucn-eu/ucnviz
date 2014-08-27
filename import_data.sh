#!/bin/bash
echo "importing urls"
python import.py urls netdata.db data/access.log
echo "importing homes"
python import.py homes netdata.db data/homedata/homes.txt
echo "importing zones"
python import.py zones netdata.db data/zonedata/
echo "importing processes"
python import.py iphone_processes netdata.db data/netdata/
echo "importing iphone net data"
python import.py iphone_data netdata.db data/netdata/
echo "importing tags"
python import.py tags netdata.db
