import { SQSEvent } from "aws-lambda";

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    console.log("Successfully processed message:", record.messageId);
  }
};
