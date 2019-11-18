# STOP apache frontend server
sudo systemctl stop httpd
echo "apache service stopped . . ."

#stop Backend node server
pm2 stop assethubbackend
echo "Node backend is stopped . . ."
