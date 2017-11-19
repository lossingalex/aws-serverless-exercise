# aws-serverless-exercise

Workshop Exercises for AWS Lambda using [Serverless framework](https://serverless.com/framework/docs/providers/aws/guide/intro/)

## Exercises setup:

### Node version

- Install Node directly: https://nodejs.org/en/download/
- (Recommended) or Install `nvm` to manage multiple versions of node in your local.

### (Optional) Setup your AWS CLI and credential

#### Install AWS CLI

- Instructions to follow: [AWS CLI install](http://docs.aws.amazon.com/cli/latest/userguide/installing.html)
- Or directly for MacOs user: [AWS CLI install MacOS](http://docs.aws.amazon.com/cli/latest/userguide/cli-install-macos.html)

#### Configure AWS CLI and credentials

- Instructions to follow: [AWS cli configuration](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html)

```
$ aws configure
AWS Access Key ID [None]: your_access_key
AWS Secret Access Key [None]: your_secret_key
Default region name [None]: ap-southeast-1
Default output format [None]:
```

This command line will create a credentials file at :
- `~/.aws/credentials` on `Mac/Linux` 
- `C:\Users\USERNAME\.aws\credentials` on `Windows`


### Setup AWS credential

If you have followed the `(Optional) Setup your AWS CLI and credential` steps, you should be set up.

Otherwise, for this workshop you dont need the `AWS CLI` but just a credentials file. You can create your own credential file directly:
- `~/.aws/credentials` on `Mac/Linux` 
- `C:\Users\USERNAME\.aws\credentials` on `Windows`

and write the config in this file:

```
[default]
aws_access_key_id = your_access_key
aws_secret_access_key = your_secret_key
```

This file will be used by the serverless framework when deploying to AWS.

### Setup Serverless Framework

- Install serverles globally
```
npm install -g serverless
```

- Create new folder project template
```
serverless create --template aws-nodejs --path aws-serverless
```

- Add a `stage` and `region` in `serverles.yml` for `provider` attribute. 

Personalize the `stage` value with your name. 

`Note`: !! Do not put any special character like `-` or `.` and do not use any `capital letters`  in the naming. As we are going to use this value as variable to generate AWS resources (dynamoDB and S3), it will cause some issue for cloudformation deployment.

```
stage: yourname
region: ap-southeast-1
```

- Add a `stackTags` in `serverles.yml` for `provider` attribute. (It will add a tag to all the ressources created by the serverless framework)
```yml
  stackTags:
    project: serverless-workshop
```

## Exercise 1: Hello World Lambda

- Modify the handler function generated from the `serverless create`
```javascript
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
```

- Deploy your lambda and look at the deployment log
```
serverless deploy -v
```

- Invoke the function
```
serverless invoke -f hello -l
```

- Deploy indivudal function 
```
serverless deploy function -f hello
```

- Open a new terminal. Fetch and watch (`-t`) the function `hello` Logs
```
serverless logs -f hello -t
```

- Invoke the function again. you will see the logs `Log inside the handler` appear the

- Check Cloudformation in AWS console
- Check Lambda and its configuration in AWS console
- Check IamRole
- Check Cloudwatch in AWS console
- Check S3 generated serverless folder

## Exercise 2: Hello World through AWS Http Gateway Event

- Add HTTP event config to serverless.yml
```yml
  hello:
    handler: handler.hello
    events: # All events associated with this function
      - http:
          path: hello
          method: get
```

- Deploy your Lambda

    `Note` Dont deploy jsut the function as in this case we need to generate new resources.


```
serverless deploy -v
```

- In the deployment log you should something like:

```
endpoints:
  GET - https://[some.generated.id].execute-api.ap-southeast-1.amazonaws.com/dev[yourname]/hello
```

- Copy the url and do a GET request on your browser.

- Check APIGateway in AWS console (Lambda setup, `LAMBDA_PROXY`...)

- Let's create a new GET API, with a `name` path parameters in the url

    Add a new `function` config in `serverless.yml`

```yml
  helloName:
    handler: handler.helloName
    events: # All events associated with this function
      - http:
          path: hello/{name}
          method: get
```

- Add a new `handler` function config in `handler.js`

```javascript
module.exports.hello = (event, context, callback) => {
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
```

- Do GET `/hello/[name]` request call on your browser with `[name]` as your name.


## Exercise 3: Create Rest API TODO App with DynamoDB (Add TODO task and fetch list of tasks)

### Setup a DynamoDB ressources in `serverless.yml`

- Create a serverless customer variable

```yml
custom:
  dynamoDBTableName: 'serverlessDemoAlex'
```

- Add a DynamoDB table Ressources:

```yml
resources:
  Resources:
    serverlessDemoAlex:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:custom.dynamoDBTableName}
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH
        ProvisionedThroughput:
          ReadCapacityUnits: 1
          WriteCapacityUnits: 1
```

- Add to Lambda IAM roles the access right for dynamoBD in `iamRoleStatements` under the `provider` attribute
```yml
  iamRoleStatements:
    - Effect: Allow
      Action:
        - dynamodb:Query
        - dynamodb:Scan
        - dynamodb:GetItem
        - dynamodb:PutItem
        - dynamodb:UpdateItem
        - dynamodb:DeleteItem
      Resource: "arn:aws:dynamodb:${opt:region, self:provider.region}:*:table/${self:custom.dynamoDBTableName}"
```

- Have the tablename available as Env variable
```
environment:
  DYNAMO_TABLE_NAME: ${self:custom.dynamoDBTableName}
```

- Deploy  
- Check the Lambda env variable
- Check Lambda IAM role
- Check DynamoDBTable setup

### Create an API HTTP endoint for saving a TODO task List

- Add new modules
```
npm install --save uuid
npm install --save aws-sdk
```

- Create a new handler in `todo/add.js` file
```javascript
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
```

- Add a new HTTP endpoint in your `severless.yml`
```yml
  addTodo:
    handler: todo/add.add
    events: # All events associated with this function
      - http:
          path: todo/add
          method: post
```

- Do POST request call in POSTMAN with `body` send as a `raw` `JSON(application/json)`
```json
{
	"task": "Finish the AWS workshop exercises !!",
	"name": "Alex",
	"dueDate": "01-11-2017"
}
```

Alternatively do a CURL cmd line call:
```bash
curl -XPOST -H "Content-type: application/json" -d '{
	"task": "Finish the AWS workshop exercises !!",
	"name": "Alex",
	"dueDate": "01-11-2017"
}' 'https://[some.generated.id].execute-api.ap-southeast-1.amazonaws.com/dev/todo/add
'
```

curl -XPOST -H "Content-type: application/json" -d '{
	"task": "Finish the AWS workshop exercises !!",
	"name": "Alex",
	"dueDate": "01-11-2017"
}' 'https://1nnegxshff.execute-api.ap-southeast-1.amazonaws.com/devalexdemo/todo/add'

- Check your DynamoDB table


### Create an API HTTP endoint for fetch all the TODO tasks List

- Create a new handler in `todo/add.js` file

```javascript
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
```

- Add a new HTTP endpoint in your `severless.yml`
```yml
  listTodo:
    handler: todo/list.list
    events: # All events associated with this function
      - http:
          path: todo/list
          method: get
```

- Do GET `/todo/list` request call your browser.

## Exercise 4: Add a list of tasks through a CSV file using S3 Event with lambda 

### Setup a S3 ressources in `serverless.yml`

- Create a serverless customer variable
```yml
custom:
  s3BucketName: 'aws.serverless.workshop.${opt:stage, self:provider.stage}'
```

- Add to Lambda IAM roles the access right for dynamoBD in `iamRoleStatements` under the `provider` attribute
```yml
provider:
  iamRoleStatements:
    - Effect: Allow
      Action:
        - "s3:*"
      Resource: "arn:aws:s3::*:${self:custom.s3BucketName}"
```

- Have the tablename available as Env variable
```yml
provider:
  environment:
    S3_BUCKET_NAME: ${self:custom.s3BucketName}
```

- Note: No need to add a S3 bucket `Ressources` as it will be created when we add it as event.

- Deploy
- Check the Lambda env variable
- Check Lambda IAM role
- Check S3 setup


### Create an API HTTP endoint for saving a TODO task List


- Create a new handler in `todo/csvAdd.js` file
```javascript
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

```

- Add a new HTTP endpoint in your `severless.yml`
```yml
functions:
  csvAdd:
    handler: src/todo/csvAdd.add
    events:
      - s3:
          bucket: ${self:custom.s3BucketName}
          event: s3:ObjectCreated:Put
          rules:
            - suffix: .csv
```

- Upload the csv file `utils/todoList.csv` in your bucket. Uploading the file will trigger the lambda. You can upload the file directly in the AWS console or using the provided `utils/s3_upload.js` file.

```
node utils/s3_upload.js [YOUR_BUCKET_NAME] utils/todoList.csv
```

- Do a GET `/todo/list` request call your browser. You should see the new task added to your list.

## Next ?

- Read more about `Serverless` in their documetnation: https://serverless.com/framework/docs/providers/aws/

- Check more `Examples` here: https://github.com/serverless/examples

- Learn about the different `Plugins` created for `Serverless.com`: https://github.com/serverless/plugins
  - check about `webpack`
  - check about `warmup`

