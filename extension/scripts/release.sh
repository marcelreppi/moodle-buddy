cd ..

# Get version
echo "Reading version from manifest.json..."
EXT_VERSION=$(cat build/manifest.json | grep \"version\" | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[[:space:]]')
echo "Detected version $EXT_VERSION"
echo -e "\n"

# Check if extension was built
if [ ! -f "moodle-buddy.zip" ]; then
  echo "moodle-buddy.zip does not exist."
  exit
fi

mkdir tmp
cp moodle-buddy.zip "tmp/moodle-buddy-v$EXT_VERSION.zip"

gh release create "v$EXT_VERSION" --notes-file "release-notes/v$EXT_VERSION.md" --title "Version $EXT_VERSION" "tmp/moodle-buddy-v$EXT_VERSION.zip"

rm -rf tmp
