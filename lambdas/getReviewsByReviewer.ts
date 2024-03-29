import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDynamoDBDocumentClient();


    export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
        try {
            console.log("Event: ", event);
            const parameters = event?.pathParameters;
            const ReviewerName = parameters?.ReviewerName || undefined; 

    
    // Check if reviewerName is provided
    if (!ReviewerName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Reviewer name is required' }),
      };
    }
    
    // Query DynamoDB to get all reviews by the specified reviewer
    const commandOutput = await ddbDocClient.send(
        new QueryCommand({
      TableName: process.env.TABLE_NAME, // Assuming you have set this environment variable
      IndexName: 'ReviewerIndex', // Assuming you have a GSI on 'ReviewerName'
      KeyConditionExpression: 'ReviewerName = :ReviewerName',
      ExpressionAttributeValues: {
        ':ReviewerName': ReviewerName,
    },
})
);

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
