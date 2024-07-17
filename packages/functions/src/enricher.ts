import { DynamoDBRecord } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue } from "@aws-sdk/client-dynamodb";

export const handler = async (event: DynamoDBRecord[]): Promise<string> => {
  console.log(event);
  const record: DynamoDBRecord = event[0];

  if (record.dynamodb?.NewImage == null && record.dynamodb?.OldImage == null) {
    throw new Error("No NewImage or OldImage found");
  }

  const image = record.dynamodb.NewImage || record.dynamodb.OldImage;

  if (!image) {
    throw new Error("No image found");
  }

  const unmarshalled = unmarshall(image as Record<string, AttributeValue>);
  const { pk, sk, ...result } = unmarshalled;

  return JSON.stringify({ result });
};
