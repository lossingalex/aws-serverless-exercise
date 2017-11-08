'use strict';

const AWS = require('aws-sdk');
const csv = require('fast-csv');
const uuidv4 = require('uuid/v4');

const docClient = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

function addTask(task, name, dueDate) {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: process.env.DYNAMO_TABLE_NAME,
      Item: {
        id: uuidv4(),
        task,
        name,
        dueDate,
        checked: false,
        createdAt: new Date().getTime()
      },
    };

    docClient.put(params, (error, data) => {
      // Handle AWS error
      if (error) {
        reject(error);
      }
      // Success
      resolve(params.Item);
    });
  });
}

module.exports.add = (event, context, callback) => {
  event.Records.forEach((record) => {
    const bucketName = record.s3.bucket.name;
    const filename = record.s3.object.key;
    const params = {
      Bucket: bucketName,
      Key: filename
    };
    const csvStream = s3.getObject(params).createReadStream();

    csv
    .fromStream(csvStream, {headers : true})
    .on("data", function(data){
      const { task, name, dueDate } = data;
      addTask(task, name, dueDate)
      .then((result) => {
        console.log('Task added', result);
      })
      .catch((e) => {
        console.log('Something happened. To hanlde:', data, e);
      })
    });
    // TODO get and process file
  });

  // Success
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Done'
    }),
  };

  return callback(null, response);
};


