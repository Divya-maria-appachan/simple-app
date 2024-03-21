import * as cdk from 'aws-cdk-lib';
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/util";
import { movieReviews } from "../seed/movies"; 
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";


import { Construct } from 'constructs';
type AppApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};
export class AppApi extends Construct {
  constructor(scope: Construct, id: string, props: AppApiProps) {
    super(scope, id);

    const appApi = new apig.RestApi(this, "AppApi", {
      description: "App RestApi",
      endpointTypes: [apig.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apig.Cors.ALL_ORIGINS,
      },
    });

    

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








const appCommonFnProps = {
  architecture: lambda.Architecture.ARM_64,
  timeout: cdk.Duration.seconds(10),
  memorySize: 128,
  runtime: lambda.Runtime.NODEJS_16_X,
  handler: "handler",
  environment: {
    USER_POOL_ID: props.userPoolId,
    CLIENT_ID: props.userPoolClientId,
    REGION: 'us-east-1',
  },
};




//Define the Movie end point
const moviesEndpoint = appApi.root.addResource("movies");
const movieEndpoint = moviesEndpoint.addResource("{MovieId}");
const reviewsResource = movieEndpoint.addResource("reviews");
const reviewerNameResource = reviewsResource.addResource("{ReviewerFilter}");
const reviewsend = appApi.root.addResource("reviews");
const reviewerResource = reviewsend.addResource("{ReviewerName}");
const reviewrTranslate = reviewerResource.addResource("{MovieId}");
const reviewrTranslates =  reviewrTranslate.addResource("translation");

//Adding new moviw lambda
const newMovieFn = new lambdanode.NodejsFunction(this, "AddMovieFn", {
  architecture: lambda.Architecture.ARM_64,
  runtime: lambda.Runtime.NODEJS_16_X,
  entry: `${__dirname}/../lambdas/addMovie.ts`,
  timeout: cdk.Duration.seconds(10),
  memorySize: 128,
  environment: {
    TABLE_NAME: MovieReviewsTable.tableName,
    USER_POOL_ID: props.userPoolId,
    CLIENT_ID: props.userPoolClientId,
    REGION: "us-east-1",
  },
});

MovieReviewsTable.grantReadWriteData(newMovieFn);// Grant read access to movieReviewsTable

//Get by id and minrating lambda
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
      TABLE_NAME: MovieReviewsTable.tableName,
      USER_POOL_ID: props.userPoolId,
      CLIENT_ID: props.userPoolClientId, // Change to movieReviewsTable
      REGION: 'us-east-1',
    },
  }
);
MovieReviewsTable.grantReadData(getMovieReview); // Grant read access to movieReviewsTable


// Get by year and the year along with movie id
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
      USER_POOL_ID: props.userPoolId,
      CLIENT_ID: props.userPoolClientId,
      REGION: 'us-east-1',
    },
  }
);


MovieReviewsTable.grantReadData(getReviewsByFilter);// Grant read access to movieReviewsTable



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
      USER_POOL_ID: props.userPoolId,
      CLIENT_ID: props.userPoolClientId, 
      REGION: 'us-east-1',
  },
}
);
MovieReviewsTable.grantReadWriteData(updateMovie);// Grant read access to movieReviewsTable



//Get the review written by the named reviewer.

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
      USER_POOL_ID: props.userPoolId,
      CLIENT_ID: props.userPoolClientId, 
      REGION: 'us-east-1',
    },
  }
);
MovieReviewsTable.grantReadData(getReviewsByReviewer);// Grant read access to movieReviewsTable



const getReviewsTranslate = new lambdanode.NodejsFunction(
  this,
  'GetReviewsTranslate',
  {
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_16_X,
    entry: `${__dirname}/../lambdas/getReviewsTranslate.ts`,
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
      TABLE_NAME: MovieReviewsTable.tableName, // Change to movieReviewsTable
      USER_POOL_ID: props.userPoolId,
      CLIENT_ID: props.userPoolClientId, 
      REGION: 'us-east-1',
    },
  }
);
MovieReviewsTable.grantReadData(getReviewsTranslate);// Grant read access to movieReviewsTable






const authorizerFn = new lambdanode.NodejsFunction(this, "AuthorizerFn", {
  ...appCommonFnProps,
  entry: "./lambdas/auth/authorizer.ts",
});

const requestAuthorizer = new apig.RequestAuthorizer(
  this,
  "RequestAuthorizer",
  {
    identitySources: [apig.IdentitySource.header("cookie")],
    handler: authorizerFn,
    resultsCacheTtl: cdk.Duration.minutes(0),
  }
);




 moviesEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(newMovieFn, { proxy: true }),{
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
      });


reviewsResource.addMethod(
  "GET",
  new apig.LambdaIntegration(getMovieReview, { proxy: true })
);
    

reviewerNameResource.addMethod(
  'PUT', 
  new apig.LambdaIntegration(updateMovie, { proxy: true }),{
    authorizer: requestAuthorizer,
    authorizationType: apig.AuthorizationType.CUSTOM,
    }
  );
  reviewerNameResource.addMethod(
    "GET",
    new apig.LambdaIntegration(getReviewsByFilter, { proxy: true })
  );
  
  
    reviewerResource.addMethod(
      'GET', 
      new apig.LambdaIntegration( getReviewsByReviewer, { proxy: true })
      );

    reviewrTranslates.addMethod(
        'GET', 
        new apig.LambdaIntegration( getReviewsTranslate, { proxy: true })
        );
      
  }
  
}

