sh /u01/ahweb/gitsync.sh
pm2 stop assethubbackend
pm2 start /u01/ahweb/backend/bin/assethubbackend --watch
echo "node backend restarted . . ."
sudo systemctl restart httpd
echo "Apache Service restarted . . ."
pm2 log 0
