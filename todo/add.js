'use strict';
const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();

module.exports.add = (event, context, callback) => {
  const data = JSON.parse(event.body);
  const { task, name, dueDate } = data;

  // Add todo in
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
      console.log(error);
      const response = {
        statusCode: 501,
        body: JSON.stringify({
          message: `Server error while trying to add task.`,
          Item: params.Item,
          error: error,
        }),
      };
      return callback(null, response);
    }

    // Success
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        message: `Task added.`,
        Item: params.Item,
      }),
    };
    return callback(null, response);
  });
};
