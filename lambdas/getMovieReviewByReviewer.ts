import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDynamoDBDocumentClient();


    export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
        try {
            console.log("Event: ", event);
            const parameters = event?.pathParameters;
            const ReviewerName = parameters?.ReviewerName || undefined; 
            const MovieId = parameters?.MovieId ? parseInt(parameters.MovieId) : undefined;

    
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
      KeyConditionExpression: 'ReviewerName = :ReviewerName and MovieId = :MovieId',
      ExpressionAttributeValues: {
        ':ReviewerName': ReviewerName,
        ":MovieId": MovieId ,
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




















// import { APIGatewayProxyHandlerV2 } from "aws-lambda";
// import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// import { DynamoDBDocumentClient, ScanCommand, ScanCommandInput } from "@aws-sdk/lib-dynamodb";

// // Create DynamoDB Document Client
// const ddbDocClient = createDocumentClient();

// // Lambda function handler
// export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
//   try {
//     console.log("Event: ", event);
//     const parameters = event?.pathParameters;
//     const MovieId = parameters?.MovieId ? parseInt(parameters.MovieId) : undefined;
//     const ReviewerName = parameters?.ReviewerName || undefined;
    
//     if (!MovieId || !ReviewerName) {
//       return {
//         statusCode: 400,
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ message: "Missing movieId or reviewerName" }),
//       };
//     }
//     const commandInput: ScanCommandInput = {
//       TableName: process.env.TABLE_NAME,
//       FilterExpression: "#MovieId = :MovieId and #ReviewerName = :ReviewerName", // Using placeholders with ExpressionAttributeNames
//       ExpressionAttributeValues: {
//         ":MovieId": { N: MovieId.toString() }, 
//         ":ReviewerName": { S: ReviewerName }  
//       },
//       ExpressionAttributeNames: {
//         "#MovieId": "MovieId", // Actual attribute names in DynamoDB
//         "#ReviewerName": "ReviewerName"
//       }
//     };

//     // Execute the scan command
//     const commandOutput = await ddbDocClient.send(new ScanCommand(commandInput));
//     // Check if review exists
//     if (!commandOutput.Items || commandOutput.Items.length === 0) {
//       return {
//         statusCode: 404,
//         headers: {
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify({ message: "Review not found" })
//       };
//     }

//     // Return the review
//     return {
//       statusCode: 200,
//       headers: {
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify({ review: commandOutput.Items[0] })
//     };
//   } catch (error) {
//     console.error("Error:", error);
//     return {
//       statusCode: 500,
//       headers: {
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify({ message: "Internal server error" })
//     };
//   }
// };

// // Function to create DynamoDB Document Client
// function createDocumentClient() {
//   const ddbClient = new DynamoDBClient({ region: process.env.REGION });
//   const marshallOptions = {
//     convertEmptyValues: true,
//     removeUndefinedValues: true,
//     convertClassInstanceToMap: true
//   };
//   const unmarshallOptions = {
//     wrapNumbers: false
//   };
//   const translateConfig = { marshallOptions, unmarshallOptions };
//   return DynamoDBDocumentClient.from(ddbClient, translateConfig);
// }
