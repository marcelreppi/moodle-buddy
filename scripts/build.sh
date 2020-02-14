cd ..

rm moodle-buddy.zip
rm moodle-buddy-code.zip

npm run build

# Make extension zip
cd build
zip -r ../moodle-buddy .
cd ..

# Copy all necessary files to tmp directory
mkdir tmp
# cp .env.example tmp/.env
cp .env tmp/.env
cp -r extension screenshots webpack.config.js package.json package-lock.json tmp
cd tmp
# Make zip of all the code for updating the extension
zip -r ../moodle-buddy-code .
cd ..
rm -rf tmp
