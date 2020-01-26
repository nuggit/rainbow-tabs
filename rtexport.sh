#!/bin/bash

cd ..

rm rainbow-tabs.zip
mkdir rtzip
mkdir rtzip/color-thief
mkdir rtzip/color-thief/src

cp rainbow-tabs/Rainbow*.png rtzip
cp rainbow-tabs/background.js rtzip
cp rainbow-tabs/manifest.json rtzip
cp rainbow-tabs/color-thief/src/color-thief.js rtzip/color-thief/src

zip -r rainbow-tabs.zip rtzip
rm -r rtzip

echo "Go to https://chrome.google.com/webstore/developer/dashboard and click Edit on Rainbow Tabs"
