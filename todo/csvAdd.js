'use strict';
const AWS = require('aws-sdk');
const csv = require('fast-csv');

const docClient = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

function addTask(task, name, dueDate) {
  return new Promise((reject, resolve) => {
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
    console.log('AWS docClient PARAMS', params);

    docClient.put(params, (error, data) => {
      // Handle AWS error
      if (error) {
        // console.log(error);
        // const response = {
        //   statusCode: 501,
        //   body: JSON.stringify({
        //     message: `Server error while trying to add task.`,
        //     Item: params.Item,
        //     error: error,
        //   }),
        // };
        reject(error);
      }

      // Success
      // const response = {
      //   statusCode: 200,
      //   body: JSON.stringify({
      //     message: `Task added.`,
      //     Item: params.Item,
      //   }),
      // };
      // return callback(null, response);
      resolve(params.Item);
    });
  });
}

module.exports.add = (event, context, callback) => {
  console.log('=========== event', event);

  event.Records.forEach((record) => {
    const bucketName = record.s3.bucket.name;
    const filename = record.s3.object.key;
    const params = {
      Bucket: bucketName,
      Key: filename
    };

    console.log('=== params', params);
    const csvStream = s3.getObject(params).createReadStream();

    csv
    .fromStream(csvStream, {headers : true})
    .on("data", function(data){
      // addTask()
        console.log(data);
    })
    .on("end", function(){
        console.log("done");
    });
    // TODO get and process file
  });

  // Success
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'TODO'
    }),
  };

  return callback(null, response);
};


