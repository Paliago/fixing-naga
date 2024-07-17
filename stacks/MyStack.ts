import { StackContext, Table, Function, Queue } from "sst/constructs";
import { CfnPipe } from "aws-cdk-lib/aws-pipes";
import {
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";

export function API({ stack }: StackContext) {
  const table = new Table(stack, "table", {
    fields: {
      pk: "string",
      sk: "string",
    },
    primaryIndex: {
      partitionKey: "pk",
      sortKey: "sk",
    },
    stream: true,
  });

  const queue = new Queue(stack, "queue", {
    consumer: "packages/functions/src/consumer.handler",
  });

  const enricher = new Function(stack, "enricher", {
    handler: "packages/functions/src/enricher.handler",
  });

  const pipesRole = new Role(this, "PipesRole", {
    roleName: "PipesRole",
    assumedBy: new ServicePrincipal("pipes.amazonaws.com"),
    inlinePolicies: {
      PipesDynamoDBStream: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: [
              "dynamodb:DescribeStream",
              "dynamodb:GetRecords",
              "dynamodb:GetShardIterator",
              "dynamodb:ListStreams",
            ],
            resources: [table.cdk.table.tableStreamArn],
            effect: Effect.ALLOW,
          }),
        ],
      }),
      PipesLambdaExecution: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ["lambda:InvokeFunction"],
            resources: [enricher.functionArn],
            effect: Effect.ALLOW,
          }),
        ],
      }),
      PipesSQSSendMessage: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ["sqs:SendMessage", "sqs:GetQueueAttributes"],
            resources: [queue.queueArn],
            effect: Effect.ALLOW,
          }),
        ],
      }),
    },
  });

  new CfnPipe(this, "MessagingPipe", {
    name: "MessagingPipe",
    roleArn: pipesRole.roleArn,
    source: table.cdk.table.tableStreamArn,
    sourceParameters: {
      dynamoDbStreamParameters: {
        startingPosition: "LATEST",
        batchSize: 1,
      },
    },
    enrichment: enricher.functionArn,
    target: queue.queueArn,
  });
}
