#!/bin/sh

# run tcpdump on the given interface ($dev set by openvpn)
echo "starting tcpdump on $dev"

IFACE=$dev
CAPLEN=300  # capture first x bytes
MAXSIZE=1000 # rotate files bigger than x Mbytes
TCPDUMP=/usr/sbin/tcpdump
LOGDIR=/var/log/openvpn/pcaps
PCAPFILE=$LOGDIR/$IFACE.pcap
#added by txl 12/11/14
DNSFILE=$LOGDIR/dnsresolv.log
COMPSCRIPT=/etc/openvpn/compress.sh

if [ ! -d $LOGDIR ]; then
  mkdir $LOGDIR
  chown proxy:adm $LOGDIR
  chmod ug+rwx $LOGDIR
fi

PIDFILE=/var/run/tcpdump_$IFACE.pid
if [ -f $PIDFILE ]; then
  if [ -d "/proc/`cat $PIDFILE`" ]; then
	kill `cat $PIDFILE`
  fi
  rm -f $PIDFILE
fi

$TCPDUMP -n -i $IFACE -s $CAPLEN -C $MAXSIZE -W 1 -z $COMPSCRIPT -w $PCAPFILE &
$TCPDUMP -n -i $IFACE -s 0 -l 'udp port 53' | awk '/A\?/ {print $1,$3,$8; fflush()}' | tee -a DNSFILE & 

echo $! > $PIDFILE
cat $PIDFILE

# TODO: could setup the squid forwarding on demand here


