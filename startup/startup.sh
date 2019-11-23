echo Do you wish to sync with git repository? Press 'y' or 'n'
read issync
if [ $issync == "y" ]; then
        echo "syncing with repository"
	sh /u01/ahweb/gitsync.sh
fi

pm2 stop assethubbackend
pm2 start /u01/ahweb/backend/bin/assethubbackend --watch
echo "node backend restarted . . ."
sudo systemctl restart httpd
echo "Apache Service restarted . . ."
pm2 log 0
