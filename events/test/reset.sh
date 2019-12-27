echo "event;date;time;browser;browserId" > events.csv

aws s3 rm s3://moodle-buddy-event-bucket-test/events.csv
aws s3 cp ./events.csv s3://moodle-buddy-event-bucket-test/events.csv

rm events.csv