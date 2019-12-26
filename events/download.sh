currentDate=`date +"%d-%m-%Y_%H-%M-%S"`
filename=events_$currentDate.csv

# Download from S3
aws s3 cp s3://moodle-buddy-event-bucket/events.csv $filename

# Copy file to raw directory
mkdir -p raw
cp $filename raw/$filename

# Copy file to excel directory
mkdir -p excel
cp $filename excel/data.csv

rm $filename