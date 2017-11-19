'use strict';

const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();
const params = {
  TableName: process.env.DYNAMO_TABLE_NAME,
};

module.exports.list = (event, context, callback) => {
  docClient.scan(params, (error, result) => {
    // error
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: 501,
        body: JSON.stringify({
          message: `Server error while trying to fetch list of tasks.`,
          error: error,
        }),
      });
      return;
    }

    // success
    const response = {
      statusCode: 200,
      body: JSON.stringify(result.Items),
    };
    callback(null, response);
  });
};
