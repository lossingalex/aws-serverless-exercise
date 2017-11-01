# aws-serverless-exercise

Some example for AWS Lambda using serverless framework

Serverless Exercise for AWS Lambda:
https://serverless.com/framework/docs/providers/aws/guide/intro/

## Exercise setup:

### Node version

`TODO`

### Setup your AWS credential

`TODO`

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
Personalize the stage value with your name. Note: do not put an `-` in the naming, it will cause some issue for cloudformation deployment in some case.

```
stage: demoAlex
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

- Deploy your lambda
```
serverless deploy -v
```

- Invoke the function
```
serverless invoke -f hello -l
```

- Add a console.log in the handler

- Deploy indivudal function 
```
serverless deploy function -f hello
```

- Open a new console. Fetch the Function Logs
```
serverless logs -f hello -t
```

- deploy and invoke the function

- Check lambda in AWS console
- Check Cloudformation in AWS console
- Check S3 serverless folder
- Check Cloudwatch in AWS console
- Check IamRole ? (TBC Here or after IAM configuration)

## Exercise 2: Hello World through AWS Http Gateway Event

- Add HTTP event config to serverless.yml
```yml
  hello:
    handler: handler.hello
    events: # All events associated with this function
      - http:
          path: hello
          method: get
    tags:
      project: serverless-workshop
```

- Check APIGateway in AWS console(Lambda setup, `LAMBDA_PROXY`...)

- Create a new API, with a `name` parameters

    Add a new `function` config in `serverless.yml`

```yml
  helloName:
    handler: handler.helloName
    events: # All events associated with this function
      - http:
          path: hello/{name}
          method: get
    tags:
      project: serverless-workshop
```

- Add a new `handler` function config in `handler.js`

```javascript
module.exports.hello = (event, context, callback) => {
  console.log('Log inside the handler');
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello World (From Alex)',
      input: event,
    }),
  };

  callback(null, response);
};
```

- Do GET request call on POSTMAN or your browser or by curl:
```bash
`TODO` add cmd line
```


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
`TODO` add cmd line
```

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

- Do GET request call on POSTMAN or your browser or by curl:
```bash
`TODO` add cmd line
```

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




## Next ?

- https://github.com/serverless/examples
- Plugins
  - warmup
  - webpack
