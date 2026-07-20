rm -r test-files
mkdir test-files
aws s3 cp s3://moodle-buddy-scan-dumps/ test-files/ --recursive --exclude "*" --include "scan_course*"
