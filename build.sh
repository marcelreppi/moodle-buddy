rm moodle-buddy.zip
rm moodle-buddy-code.zip

npm run build

# Make extension zip
cd build
zip -r ../moodle-buddy .
cd ..

# Make zip of all the code for updating the extension
zip -r ./moodle-buddy-code extension webpack.config.js package.json README.md
