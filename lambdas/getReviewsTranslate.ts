import { APIGatewayProxyHandler } from 'aws-lambda';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodbClient = createDynamoDBDocumentClient();
const translateClient = new TranslateClient({});

export const handler: APIGatewayProxyHandler = async (event, context) => {
    try {
        console.log("Event: ", event);

        const parameters = event?.pathParameters;
        const ReviewerName = parameters?.ReviewerName || undefined;
        const MovieId = parameters?.MovieId ? parseInt(parameters.MovieId) : undefined;
        const language = event.queryStringParameters?.language;


        const commandOutput = await dynamodbClient.send(
            new QueryCommand({
          TableName: process.env.TABLE_NAME, // Assuming you have set this environment variable
          IndexName: 'ReviewerIndex', // Assuming you have a GSI on 'ReviewerName'
          KeyConditionExpression: 'ReviewerName = :ReviewerName AND MovieId = :MovieId',
          ExpressionAttributeValues: {
            ':ReviewerName': ReviewerName,
            ':MovieId': MovieId

        },
    })
    );

        
         if (!commandOutput.Items || commandOutput.Items.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Review not found' })
            };
        }

        // Assuming only one item is expected for the given reviewer and movie
        const ReviewContent = commandOutput.Items[0].Content;

        const translateParams = {
            Text: ReviewContent,
            SourceLanguageCode: 'en', // Automatic language detection
            TargetLanguageCode: language
        };

        const translateCommand = new TranslateTextCommand(translateParams);
        const translatedResult = await translateClient.send(translateCommand);
        const translatedContent = translatedResult.TranslatedText;

        return {
            statusCode: 200,
            body: JSON.stringify({ translatedContent })
        };
    } catch (error) {
        console.log('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' })
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
