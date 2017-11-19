'use strict';

module.exports.hello = (event, context, callback) => {
  console.log('Log inside the handler');
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello World !',
      input: event,
    }),
  };

  callback(null, response);
};

module.exports.helloName = (event, context, callback) => {
  const name = event.pathParameters.name;
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: `Hello ${name}` ,
      input: event,
    }),
  };

  callback(null, response);
};

