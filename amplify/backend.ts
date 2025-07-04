import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { personalAssistantFunction, MODEL_ID } from "./functions/personal-assistant/resource";

export const backend = defineBackend({
  auth,
  data,
  personalAssistantFunction,
});

backend.personalAssistantFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      "bedrock:*"
    ],
    resources: [
      `*`
    ],
  })
);

// Add permissions to access existing DynamoDB tables
backend.personalAssistantFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem"
    ],
    resources: [
      "arn:aws:dynamodb:*:*:table/lifting-tracker-users",
      "arn:aws:dynamodb:*:*:table/lifting-tracker-workouts",
      "arn:aws:dynamodb:*:*:table/lifting-tracker-workouts/index/*"
    ],
  })
);