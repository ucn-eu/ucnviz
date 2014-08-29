#!/bin/bash
echo "importing urls"
python import.py urls netdata.db /Users/tlodge/Desktop/access.log
echo "importing homes"
python import.py homes netdata.db static/data/homedata/homes.txt
echo "importing zones"
python import.py zones netdata.db static/data/zonedata/
echo "importing processes"
python import.py iphone_processes netdata.db static/data/netdata/
echo "importing iphone net data"
python import.py iphone_data netdata.db static/data/netdata/
echo "importing tags"
python import.py tags netdata.db
