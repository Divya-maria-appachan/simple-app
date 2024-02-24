import * as cdk from 'aws-cdk-lib';
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/util";
import { movieReviews } from "../seed/movies"; 


import { Construct } from 'constructs';

export class SimpleAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const simpleFn = new lambdanode.NodejsFunction(this, "SimpleFn", {

      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/simple.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });
    

    const simpleFnURL = simpleFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,   // CHANGE
      cors: {
        allowedOrigins: ["*"],
      },
    });
    new cdk.CfnOutput(this, "Simple Function Url", { value: simpleFnURL.url });
  
    const MovieReviewsTable = new dynamodb.Table(this, "MovieReviewsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "MovieId", type: dynamodb.AttributeType.NUMBER }, // Partition Key: MovieId of type Number
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Adjust as per your requirement
      tableName: "MovieReviews",
    });
    
    // Add other attributes: ReviewerName, Content, and Rating
    MovieReviewsTable.addGlobalSecondaryIndex({
      indexName: 'ReviewerIndex',
      partitionKey: { name: 'ReviewerName', type: dynamodb.AttributeType.STRING }
    });
    new custom.AwsCustomResource(this, "movieReviewsDdbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [MovieReviewsTable.tableName]: generateBatch(movieReviews), // Corrected variable name
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("movieReviewsDdbInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [MovieReviewsTable.tableArn],
      }),
    });


const getMovieByIdFn = new lambdanode.NodejsFunction(
  this,
  'GetMovieByIdFn',
  {
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_16_X,
    entry: `${__dirname}/../lambdas/getMovieById.ts`,
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
      TABLE_NAME: MovieReviewsTable.tableName, // Change to movieReviewsTable
      REGION: 'us-east-1',
    },
  }
);

const getMovieByIdURL = getMovieByIdFn.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
  },
});

MovieReviewsTable.grantReadData(getMovieByIdFn); // Grant read access to movieReviewsTable

new cdk.CfnOutput(this, 'Get Movie Function Url', { value: getMovieByIdURL.url });


  }
  
}

