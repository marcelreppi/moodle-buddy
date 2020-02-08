cd ..

aws s3 rm s3://moodle-buddy-uninstall-page --recursive
aws s3 cp uninstall s3://moodle-buddy-uninstall-page --recursive