// import { APIGatewayProxyHandlerV2 } from "aws-lambda";
// import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
// import Ajv from "ajv";
// import schema from "../shared/types.schema.json";

// const ajv = new Ajv();
// const isValidBodyParams = ajv.compile(schema.definitions["MovieReview"] || {});

// const ddbDocClient = createDDbDocClient();

// export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
//   try {
//     console.log("Event: ", event);

//     const { MovieId, ReviewerName, ReviewDate, Content, Rating } = JSON.parse(event.body || "{}");

//     if (!MovieId || !ReviewerName || !ReviewDate || !Content || !Rating) {
//       return response(400, { message: "Invalid request body: MovieId, ReviewerName, ReviewDate, Content, and Rating are required fields" });
//     }

//     await updateReviewText(MovieId, ReviewerName, Content);

//     return response(200, { message: "Review text updated successfully" });
//   } catch (error: any) {
//     console.error("Error:", error.message);
//     return response(500, { error: error.message });
//   }
// };

// async function updateReviewText(MovieId, ReviewerName, ReviewText) {
//   await ddbDocClient.send(
//     new UpdateCommand({
//       TableName: process.env.TABLE_NAME,
//       IndexName: 'ReviewerIndex', // Assuming you have a GSI on 'ReviewerName'
      
//       Key: {
//         "MovieId": MovieId,
//         "ReviewerName": ReviewerName
//       },
//       UpdateExpression: "SET ReviewText = :reviewText",
//       ExpressionAttributeValues: {
//         ":ReviewText": ReviewText
//       }
//     })
//   );
// }

// function createDDbDocClient() {
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

// function response(statusCode, body) {
//   return {
//     statusCode,
//     headers: {
//       "content-type": "application/json",
//     },
//     body: JSON.stringify(body),
//   };
// }

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["MovieReview"] || {});

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    // Print Event
    console.log("Event: ", event);
    
    const { MovieId, ReviewerName } = event.pathParameters || {};
    if (!MovieId || !ReviewerName) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing movieId or reviewerName in path parameters" }),
      };
    }

    const body = event.body ? JSON.parse(event.body) : undefined;
    if (!body) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing request body" }),
      };
    }
    if (!isValidBodyParams(body)) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: `Incorrect type. Must match Movie schema`,
          schema: schema.definitions["MovieReview"],
        }),
      };
    }
    
    // Construct the item to be updated in DynamoDB
    const updatedReview = {
      MovieId,
      ReviewerName,
      ...body, // Update the review text here
    };

    const commandOutput = await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: updatedReview,
      })
    );

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: "Review updated successfully" }),
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

function createDDbDocClient() {
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
