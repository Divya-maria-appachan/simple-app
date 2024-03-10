import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
const ddbDocClient = createDynamoDBDocumentClient();
export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
    try {
      console.log("Event: ", event);
      const parameters  = event?.pathParameters;
      const MovieId = parameters?.MovieId ? parseInt(parameters.MovieId) : undefined;
      const ReviewerName = parameters?.ReviewerName || undefined;
      const queryStringParameters = event?.queryStringParameters;
      const minRating = queryStringParameters?.minRating ? parseInt(queryStringParameters.minRating): undefined
      if (!MovieId) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movie Id" }),
      };
    }
    var commandOutput :any;
    if (ReviewerName) {
      // Retrieve specific review by reviewerName for the specified MovieId from DynamoDB
      commandOutput = await ddbDocClient.send(
        new QueryCommand({
          TableName: process.env.TABLE_NAME, // Assuming you have set this environment variable
          IndexName: 'ReviewerIndex', // Assuming you have a GSI on 'ReviewerName'
          KeyConditionExpression: "MovieId = :MovieId AND ReviewerName = :ReviewerName",
          ExpressionAttributeValues: {
            ":MovieId": MovieId,
            ":ReviewerName": ReviewerName,
          },
        })
      );
    } else if (minRating !== undefined) {
      // Retrieve movie reviews with the same MovieId and rating greater than or equal to minRating from DynamoDB
      commandOutput = await ddbDocClient.send(
        new QueryCommand({
          TableName: process.env.TABLE_NAME,
          KeyConditionExpression: "MovieId = :MovieId",
          FilterExpression: "Rating >= :minRating",
          ExpressionAttributeValues: {
            ":MovieId": MovieId,
            ":minRating": minRating,
          },
        })
      );
    } else {
      // Retrieve all movie reviews with the same MovieId from DynamoDB
      commandOutput = await ddbDocClient.send(
        new QueryCommand({
          TableName: process.env.TABLE_NAME,
          KeyConditionExpression: "MovieId = :MovieId",
          ExpressionAttributeValues: {
            ":MovieId": MovieId,
          },
        })
      );
    }
  if (!commandOutput.Items || commandOutput.Items.length === 0) {
    return {
      statusCode: 404,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ Message: "No movie reviews found for the given MovieId" }),
    };
  }
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ data: commandOutput.Items }),
  };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};
function createDynamoDBDocumentClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}