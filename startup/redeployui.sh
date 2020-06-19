cd ..
sudo zip -r backup/build.zip html/*
sudo rm -Rf build html/*
unzip build.zip
echo "zip inflated . . ."
sudo mv -f build/* html/
sudo  rm -Rf build
echo "build content moved . . ."
rm build.bkp.zip
echo "bkp zip deleted"
mv build.zip build.bkp.zip
echo "back up zip created"
sudo cp -f ssoheader.php html/
echo "SSOheader file placed . . ."
#sudo systemctl restart httpd
#echo "Apache Service restarted . . ."
