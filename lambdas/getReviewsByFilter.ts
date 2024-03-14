// import { APIGatewayProxyHandlerV2 } from "aws-lambda";
// import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

// const ddbDocClient = createDynamoDBDocumentClient();

// export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
//     try {
//       console.log("Event: ", event);
//       const parameters  = event?.pathParameters;
//       const MovieId = parameters?.MovieId ? parseInt(parameters.MovieId) : undefined;
//       const Year= parameters?.Year ? parseInt(parameters.Year) : undefined;
  
//       if (!MovieId || !Year) {
  
//       return {
//         statusCode: 404,
//         headers: {
//           "content-type": "application/json",
//         },
//         body: JSON.stringify({ Message: "Missing movie Id" }),
//       };
//     }

// // Retrieve movie reviews with the same MovieId from DynamoDB
//     const commandOutput = await ddbDocClient.send(
//     new QueryCommand({
//       TableName: process.env.TABLE_NAME,
//       KeyConditionExpression: "MovieId = :MovieId and begins_with(ReviewDate, :Year)",
//       ExpressionAttributeValues: {
//         ":MovieId": MovieId,
//         ":Year": `${Year}-`
//       },
//     })
//   );

//   if (!commandOutput.Items || commandOutput.Items.length === 0) {
//     return {
//       statusCode: 404,
//       headers: {
//         "content-type": "application/json",
//       },
//       body: JSON.stringify({ Message: "No movie reviews found for the given MovieId" }),
//     };
//   }
//   return {
//     statusCode: 200,
//     headers: {
//       "content-type": "application/json",
//     },
//     body: JSON.stringify({ data: commandOutput.Items }),
//   };
//   } catch (error: any) {
//     console.log(JSON.stringify(error));
//     return {
//       statusCode: 500,
//       headers: {
//         "content-type": "application/json",
//       },
//       body: JSON.stringify({ error }),
//     };
//   }
// };

// function createDynamoDBDocumentClient() {
//     const ddbClient = new DynamoDBClient({ region: process.env.REGION });
//     const marshallOptions = {
//       convertEmptyValues: true,
//       removeUndefinedValues: true,
//       convertClassInstanceToMap: true,
//     };
//     const unmarshallOptions = {
//       wrapNumbers: false,
//     };
//     const translateConfig = { marshallOptions, unmarshallOptions };
//     return DynamoDBDocumentClient.from(ddbClient, translateConfig);
//   }

// import { APIGatewayProxyHandlerV2 } from "aws-lambda";
// import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
// const ddbDocClient = createDynamoDBDocumentClient();
// export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
//     try {
//       console.log("Event: ", event);
//       const parameters  = event?.pathParameters;
//       const movieId = parameters?.MovieId ? parseInt(parameters.MovieId) : undefined;
//       const ReviewerName = parameters?.ReviewerName || undefined;
//       if (!movieId) {
//       return {
//         statusCode: 404,
//         headers: {
//           "content-type": "application/json",
//         },
//         body: JSON.stringify({ Message: "Missing movie Id" }),
//       };
//     }
//     let commandOutput;
//     const params : QueryCommandInput= {
//         TableName: process.env.TABLE_NAME,
//         KeyConditionExpression: "MovieId = :MovieId",
//         ExpressionAttributeValues: {
//           ":MovieId": movieId
//         }
//     };
//     params.ExpressionAttributeValues ??= {};
//     if (ReviewerName ) {
//       if (isNumber(ReviewerName )) {
//           params.KeyConditionExpression = "begins_with(ReviewDate, :year)";
//           params.ExpressionAttributeValues[":year"] = ReviewerName  ;
//       } else {
//           params.FilterExpression += " AND ReviewerName = :reviewerName";
//           params.ExpressionAttributeValues[":reviewerName"] =  ReviewerName  ;
//       }
//   }
//   commandOutput = await ddbDocClient.send(new QueryCommand(params));
//   if (!commandOutput.Items || commandOutput.Items.length === 0) {
//     return {
//       statusCode: 404,
//       headers: {
//         "content-type": "application/json",
//       },
//       body: JSON.stringify({ Message: "No movie reviews found for the filter." }),
//     };
//   }
//   return {
//     statusCode: 200,
//     headers: {
//       "content-type": "application/json",
//     },
//     body: JSON.stringify({ data: commandOutput.Items }),
//   };
//   } catch (error: any) {
//     console.log(JSON.stringify(error));
//     return {
//       statusCode: 500,
//       headers: {
//         "content-type": "application/json",
//       },
//       body: JSON.stringify({ error }),
//     };
//   }
// };
// function createDynamoDBDocumentClient() {
//   const ddbClient = new DynamoDBClient({ region: process.env.REGION });
//   const marshallOptions = {
//     convertEmptyValues: true,
//     removeUndefinedValues: true,
//     convertClassInstanceToMap: true,
//   };
//   const unmarshallOptions = {
//     wrapNumbers: false,
//   };
//   const translateConfig = { marshallOptions, unmarshallOptions };
//   return DynamoDBDocumentClient.from(ddbClient, translateConfig);
// }
// function isNumber(str: string): boolean {
//   return /^\d+$/.test(str);
// }

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
const ddbDocClient = createDynamoDBDocumentClient();
export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
    try {
      console.log("Event: ", event);
      const parameters  = event?.pathParameters;
      const movieId = parameters?.MovieId ? parseInt(parameters.MovieId) : undefined;
      const parameter = parameters?.parameter ? parameters.parameter : undefined;
      if (!movieId) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movie Id" }),
      };
    }
    let commandOutput;
    const params : QueryCommandInput= {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "MovieId = :MovieId",
        ExpressionAttributeValues: {
          ":MovieId": movieId
        }
    };
    params.ExpressionAttributeValues ??= {};
    if (parameter) {
      if (isNumber(parameter)) {
          params.FilterExpression = "begins_with(ReviewDate, :year)";
          params.ExpressionAttributeValues[":year"] = parameter ;
      } else {
          params.KeyConditionExpression += " AND ReviewerName = :reviewerName";
          params.ExpressionAttributeValues[":reviewerName"] =  parameter ;
      }
  }
  commandOutput = await ddbDocClient.send(new QueryCommand(params));
  if (!commandOutput.Items || commandOutput.Items.length === 0) {
    return {
      statusCode: 404,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ Message: "No movie reviews found for the filter." }),
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
function isNumber(str: string): boolean {
  return /^\d+$/.test(str);
}