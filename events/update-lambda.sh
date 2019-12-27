cd lambda

rm lambda.zip

# Make new zip file
zip -r -1 -q ./lambda.zip .

# Upload to AWS
aws lambda update-function-code --function-name moodle-buddy-event-tracker --zip-file fileb://lambda.zip

rm lambda.zip