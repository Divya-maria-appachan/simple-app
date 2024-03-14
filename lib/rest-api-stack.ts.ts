import * as cdk from 'aws-cdk-lib';
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/util";
import { movieReviews } from "../seed/movies"; 
import * as apig from "aws-cdk-lib/aws-apigateway";


import { Construct } from 'constructs';

export class SimpleAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    

    //The dynamodb table for the Movie Review
  
    const MovieReviewsTable = new dynamodb.Table(this, "MovieReviewsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "MovieId", type: dynamodb.AttributeType.NUMBER }, // Partition Key: MovieId of type Number
      // sortKey: { name: "ReviewDate", type: dynamodb.AttributeType.STRING   },
      sortKey: { name: 'ReviewerName', type: dynamodb.AttributeType.STRING },
      
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Adjust as per your requirement
      tableName: "MovieReviews",
    });

    MovieReviewsTable.addGlobalSecondaryIndex({
      indexName: 'ReviewerIndex',
      partitionKey: { name: 'ReviewerName', type: dynamodb.AttributeType.STRING },
      sortKey: { name: "MovieId", type: dynamodb.AttributeType.NUMBER },
    });

        // Add other attributes: ReviewerName, Content, and Rating
    // 
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


const getMovieReview = new lambdanode.NodejsFunction(
  this,
  'GetMovieReview',
  {
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_16_X,
    entry: `${__dirname}/../lambdas/getMovieReview.ts`,
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
      TABLE_NAME: MovieReviewsTable.tableName, // Change to movieReviewsTable
      REGION: 'us-east-1',
    },
  }
);

const getMovieReviewURL = getMovieReview.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
  },
});




const getReviewsByReviewer = new lambdanode.NodejsFunction(
  this,
  'GetReviewsByReviewer',
  {
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_16_X,
    entry: `${__dirname}/../lambdas/getReviewsByReviewer.ts`,
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
      TABLE_NAME: MovieReviewsTable.tableName, // Change to movieReviewsTable
      REGION: 'us-east-1',
    },
  }
);

const getReviewsByReviewerURL = getReviewsByReviewer.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
  },
});
MovieReviewsTable.grantReadData(getReviewsByReviewer);





const getReviewsByFilter = new lambdanode.NodejsFunction(
  this,
  'GetReviewsByFilter',
  {
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_16_X,
    entry: `${__dirname}/../lambdas/getReviewsByFilter.ts`,
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
      TABLE_NAME: MovieReviewsTable.tableName, 
      REGION: 'us-east-1',
    },
  }
);

const getReviewsByFilterURL = getReviewsByFilter.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
  },
});



const newMovieFn = new lambdanode.NodejsFunction(this, "AddMovieFn", {
  architecture: lambda.Architecture.ARM_64,
  runtime: lambda.Runtime.NODEJS_16_X,
  entry: `${__dirname}/../lambdas/addMovie.ts`,
  timeout: cdk.Duration.seconds(10),
  memorySize: 128,
  environment: {
    TABLE_NAME: MovieReviewsTable.tableName,
    REGION: "us-east-1",
  },
});

MovieReviewsTable.grantReadWriteData(newMovieFn);

//Get the review written by the named reviewer for the specified movie.
const updateMovie = new lambdanode.NodejsFunction(this, 'UpdateMovie',
 {
   architecture: lambda.Architecture.ARM_64,
   runtime: lambda.Runtime.NODEJS_16_X,
   entry: `${__dirname}/../lambdas/updateMovie.ts`,
   timeout: cdk.Duration.seconds(10),
   memorySize: 128,
   environment: {
      TABLE_NAME: MovieReviewsTable.tableName,
      REGION: 'us-east-1',
  },
}
);



// REST API 
const api = new apig.RestApi(this, "RestAPI", {
  description: "demo api",
  deployOptions: {
    stageName: "dev",
  },
  defaultCorsPreflightOptions: {
    allowHeaders: ["Content-Type", "X-Amz-Date"],
    allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
    allowCredentials: true,
    allowOrigins: ["*"],
  },
});



const moviesEndpoint = api.root.addResource("movies");
const movieEndpoint = moviesEndpoint.addResource("{MovieId}");
const reviewsResource = movieEndpoint.addResource("reviews");

const reviewerNameResource = reviewsResource.addResource("{ReviewerFilter}");
const reviewsend = api.root.addResource("reviews");
const reviewerResource = reviewsend.addResource("{ReviewerName}");


reviewsResource.addMethod(
  "GET",
  new apig.LambdaIntegration(getMovieReview, { proxy: true })
);


reviewerNameResource.addMethod(
  "GET",
  new apig.LambdaIntegration(getReviewsByFilter, { proxy: true }),
);


moviesEndpoint.addMethod(
  "POST",
  new apig.LambdaIntegration(newMovieFn, { proxy: true })
);

reviewerNameResource.addMethod(
  'PUT', 
  new apig.LambdaIntegration(updateMovie, { proxy: true })
  );

  
    reviewerResource.addMethod(
      'GET', 
      new apig.LambdaIntegration( getReviewsByReviewer, { proxy: true })
      );
// Grant read access to movieReviewsTable
MovieReviewsTable.grantReadData(getMovieReview); 
MovieReviewsTable.grantReadWriteData(updateMovie);
MovieReviewsTable.grantReadData(getReviewsByFilter);


new cdk.CfnOutput(this, 'Get Movie Function Url', { value: getMovieReviewURL.url });

// new cdk.CfnOutput(this, 'Get Review By Reviewer Function Url', { value: getMovieReviewByReviewerURL.url });
new cdk.CfnOutput(this, 'Get Reviews Function Url', { value: getReviewsByReviewerURL.url });

  }
  
}

