git add /u01/ahweb/*
git reset /u01/ahweb/backend/node_modules/*
git commit -m "dev code sync"
git push
pm2 stop assethubbackend
pm2 start /u01/ahweb/backend/bin/assethubbackend --watch
echo "node backend restarted . . ."
sudo systemctl restart httpd
echo "Apache Service restarted . . ."
pm2 log 0
