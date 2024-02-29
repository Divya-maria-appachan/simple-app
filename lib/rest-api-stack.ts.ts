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
      sortKey: { name: "ReviewDate", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Adjust as per your requirement
      tableName: "MovieReviews",
    });

        // Add other attributes: ReviewerName, Content, and Rating
    MovieReviewsTable.addGlobalSecondaryIndex({
      indexName: 'ReviewerIndex',
      partitionKey: { name: 'ReviewerName', type: dynamodb.AttributeType.STRING },
      sortKey: { name: "MovieId", type: dynamodb.AttributeType.NUMBER },
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



const getReviewsByYear = new lambdanode.NodejsFunction(
  this,
  'GetReviewsByYear',
  {
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_16_X,
    entry: `${__dirname}/../lambdas/getReviewsByYear.ts`,
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
      TABLE_NAME: MovieReviewsTable.tableName, // Change to movieReviewsTable
      REGION: 'us-east-1',
    },
  }
);

const getReviewsByYearURL = getReviewsByYear.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
  },
});
MovieReviewsTable.grantReadData(getReviewsByYear);


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
const getMovieReviewByReviewerLambda = new lambdanode.NodejsFunction(this, 'GetMovieReviewByReviewerLambda',
 {
   architecture: lambda.Architecture.ARM_64,
   runtime: lambda.Runtime.NODEJS_16_X,
   entry: `${__dirname}/../lambdas/getMovieReviewByReviewer.ts`,
   timeout: cdk.Duration.seconds(10),
   memorySize: 128,
   environment: {
      TABLE_NAME: MovieReviewsTable.tableName,
      REGION: 'us-east-1',
  },
}
);
const getMovieReviewByReviewerURL = getMovieReviewByReviewerLambda.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
  },
});



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

//REST API2
const api2 = new apig.RestApi(this, "RestAPI2", {
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
const reviewerNameResource = reviewsResource.addResource("{ReviewerName}");
const reviewsend = api.root.addResource("reviews");
const reviewerResource = reviewsend.addResource("{ReviewerName}");
const yearMovies = api2.root.addResource("movies");
const yearMovie = yearMovies.addResource("{MovieId}");
const yearReviews = yearMovie.addResource("reviews");
const reviewsByYear = yearReviews.addResource("{Year}");

movieEndpoint.addMethod(
  "GET",
  new apig.LambdaIntegration(getMovieByIdFn, { proxy: true })
);
reviewerResource.addMethod(
  "GET",
  new apig.LambdaIntegration(getReviewsByReviewer, { proxy: true })
);
// Inside your stack class
moviesEndpoint.addMethod(
  "POST",
  new apig.LambdaIntegration(newMovieFn, { proxy: true })
);
reviewerNameResource.addMethod(
  'GET', 
  new apig.LambdaIntegration(getMovieReviewByReviewerLambda, { proxy: true })
  );

  reviewsByYear.addMethod(
    'GET', 
    new apig.LambdaIntegration( getReviewsByYear, { proxy: true })
    );

MovieReviewsTable.grantReadData(getMovieByIdFn); // Grant read access to movieReviewsTable
MovieReviewsTable.grantReadData(getMovieReviewByReviewerLambda);


new cdk.CfnOutput(this, 'Get Movie Function Url', { value: getMovieByIdURL.url });

new cdk.CfnOutput(this, 'Get Review By Reviewer Function Url', { value: getMovieReviewByReviewerURL.url });
new cdk.CfnOutput(this, 'Get Reviews Function Url', { value: getReviewsByReviewerURL.url });

  }
  
}

