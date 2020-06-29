cd ..
echo "taking backup of old build . . ."
sudo zip -r build_bkp_old.zip html/*
sudo rm -Rf build html/*
unzip build.zip
echo "zip inflated . . ."
sudo mv -f build/* html/
sudo  rm -Rf build
echo "build content moved . . ."
rm build.bkp.zip
echo "bkp zip deleted . . ."
mv build.zip build_bkp_latest.zip
echo "moving new build to backup zip. . ."
sudo cp -f ssoheader.php html/
echo "SSOheader file placed . . ."

