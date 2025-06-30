import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { personalAssistantFunction } from "../functions/personal-assistant/resource";

const schema = a.schema({
  // Lifting Tracker Models
  Workout: a
    .model({
      userId: a.string().required(),
      workoutId: a.string().required(),
      exercise: a.string().required(),
      date: a.string().required(),
      sets: a.json().required(), // Array of {weight: number, reps: number}
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(["read"]),
    ])
    .secondaryIndexes((index) => [
      index("userId").sortKeys(["date", "exercise"]),
      index("exercise").sortKeys(["date"]),
    ]),

  // Legacy Authentication with existing DynamoDB tables
  authenticateUser: a
    .query()
    .arguments({
      username: a.string().required(),
      password: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(personalAssistantFunction)),

  // Legacy workout operations with existing DynamoDB tables
  getLegacyWorkouts: a
    .query()
    .arguments({
      userId: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(personalAssistantFunction)),

  saveLegacyWorkout: a
    .mutation()
    .arguments({
      userId: a.string().required(),
      workout: a.json().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(personalAssistantFunction)),

  // AI Recommendations Query (legacy - specific to workouts)
  getWorkoutRecommendations: a
    .query()
    .arguments({
      exerciseData: a.json().required(),
      workoutHistory: a.json().required(),
    })
    .returns(a.string())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(personalAssistantFunction)),

  // Generic AI Recommendations Query
  getAIRecommendations: a
    .query()
    .arguments({
      promptType: a.string().required(),
      contextData: a.json().required(),
    })
    .returns(a.string())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(personalAssistantFunction)),

  // Travel Chat (keeping existing functionality)
  chat: a
    .query()
    .arguments({
      conversation: a.json().required(),
    })
    .returns(a.string())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(personalAssistantFunction)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
