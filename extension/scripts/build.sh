cd ..

rm *.zip

echo Running build for TARGET=$TARGET

npm run build:$TARGET

echo -e "\n"

# Make extension zip
cd build

# Get version
echo "Reading version from manifest.json..."
EXT_VERSION=$(cat manifest.json | grep \"version\" | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[[:space:]]')
echo "Detected version $EXT_VERSION"
echo -e "\n"

zip -r "../moodle-buddy.zip" .
cd ..

# Copy all necessary files to tmp directory
mkdir tmp
mkdir tmp/extension
cp -r ../screenshots ../README.md tmp
cp -r src webpack.config.js package.json package-lock.json tsconfig.json tailwind.config.js postcss.config.js tmp/extension
cd tmp

# Make zip of all the code for updating the extension
zip -r "../moodle-buddy-code.zip" .
cd ..
rm -rf tmp
