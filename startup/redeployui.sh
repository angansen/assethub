cd ..
sudo rm build_bkp_old.zip
echo "taking backup of old build . . ."
sudo zip -r build_bkp_old.zip html/*
sudo rm -Rf build html/*
sudo unzip build.zip
echo "zip inflated . . ."
sudo mv -f build/* html/
sudo  rm -Rf build
echo "build content moved . . ."
sudo rm build_bkp_latest.zip
echo "bkp zip deleted . . ."
sudo mv build.zip build_bkp_latest.zip
echo "moving new build to backup zip. . ."
sudo sudo cp -f ssoheader.php html/
echo "SSOheader file placed . . ."
sudo chmod 655 /u01/ahweb/html/images/
sudo systemctl restart httpd
echo "Apache Service restarted . . ."
