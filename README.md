This is the repo for the ucn visualisation code

The code is responsible for gathering data from squid logs,tcpdumps and the moves app (location data)  and writing it to a relational (sqlite3) database

There are three scripts that collect data

collect_moves.py
collect_squid.py
collect_dns.py

moves will collect all location data from devices that have registered with the moves app.  This is kicked off when a user visits /moves.  The moves api details (secret keys etc) must be put in the config.py file.

collect_squid will read the latest entries from the squid log file and write them to the URLS table.  It is assumes a particular format, as set in the squid config file:

  logformat custom [%tl] %ts.%03tu %6tr %>a %Ss/%03Hs %<st %rm %ru %un HTTP/%rv %Sh/%<A %mt "%{Referer}>h" "%{User-Agent}>h"

collect_dns will read the latest dns queries and write them to the DNS table.  The latest DNS queries are pulled out from tcpdump pcap files (tcpdump is started automatically when openvpn starts).  To accomplish this, root privilege script must be run periodically, the following needs to be put in the crontab (crontab -e) for the root user:

  * * * * * /usr/sbin/tcpdump -ttnnr /var/log/openvpn/pcaps/tun1.pcap | awk '/A\?/ {print $1,$3,$8; fflush()}' > /var/tmp/dns.log && chown proxy:proxy /var/tmp/dns.log

Each of the collect scripts need an entry in your crontab (non root) as follows:

  * * * * * cd [repo dir] && venv/bin/python collect_dns.py
  * * * * * cd [repo dir] && venv/bin/python collect_squid.py
  0,30 * * * * cd [repo dir] && venv/bin/python collect_moves.py  

These scripts will write debug info to /var/tmp/collect.log
