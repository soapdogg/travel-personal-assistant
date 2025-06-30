import {
  BedrockRuntimeClient,
  ConverseCommandInput,
  ConverseCommand,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { Handler } from "aws-lambda";
import * as crypto from "crypto";

// Constants
const AWS_REGION = process.env.AWS_REGION;
const MODEL_ID = process.env.MODEL_ID;

// Configuration
const INFERENCE_CONFIG = {
  maxTokens: 1000,
  temperature: 0.5,
};

// Initialize clients
const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: AWS_REGION }));

export const handler: Handler = async (event, context) => {
  // Log everything for debugging
  console.log('=== LAMBDA HANDLER START ===');
  console.log('Event keys:', Object.keys(event));
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Context:', JSON.stringify(context, null, 2));
  
  // Get the operation type from the event (AppSync provides it as fieldName)
  const operationType = event.fieldName || event.info?.fieldName || event.operationName;
  console.log('Operation type from various sources:', {
    'event.fieldName': event.fieldName,
    'event.info?.fieldName': event.info?.fieldName,
    'event.operationName': event.operationName,
    'final operationType': operationType
  });
  
  try {
    switch (operationType) {
      case 'authenticateUser':
        console.log('Calling handleAuthentication');
        return await handleAuthentication(event);
      case 'getLegacyWorkouts':
        console.log('Calling handleGetLegacyWorkouts');
        return await handleGetLegacyWorkouts(event);
      case 'saveLegacyWorkout':
        console.log('Calling handleSaveLegacyWorkout');
        return await handleSaveLegacyWorkout(event);
      case 'getWorkoutRecommendations':
        console.log('Calling handleWorkoutRecommendations');
        return await handleWorkoutRecommendations(event);
      case 'getAIRecommendations':
        console.log('Calling handleAIRecommendations');
        return await handleAIRecommendations(event);
      case 'chat':
        console.log('Calling handleTravelChat');
        return await handleTravelChat(event);
      default:
        console.error('=== UNKNOWN OPERATION ===');
        console.error('Operation type:', operationType);
        console.error('Full event structure:', JSON.stringify(event, null, 2));
        throw new Error(`Unknown operation: ${operationType}`);
    }
  } catch (error) {
    console.error('=== ERROR IN HANDLER ===');
    console.error(`Error in ${operationType} handler:`, error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
};

async function handleAuthentication(event: any) {
  console.log('=== AUTHENTICATION HANDLER START ===');
  const { username, password } = event.arguments;
  console.log('Authentication attempt for username:', username);
  
  try {
    console.log('Creating DynamoDB GetCommand...');
    const command = new GetCommand({
      TableName: 'lifting-tracker-users',
      Key: { username }
    });
    
    console.log('Sending DynamoDB command...');
    const result = await dynamoClient.send(command);
    console.log('DynamoDB result:', JSON.stringify(result, null, 2));
    
    if (!result.Item) {
      console.log('User not found in database');
      return JSON.stringify({ success: false, error: 'User not found' });
    }
    
    console.log('User found, checking password...');
    // Create hash of provided password with salt (matching original implementation)
    const hashedPassword = crypto.createHash('sha256').update(password + 'salt123').digest('hex');
    console.log('Generated hash:', hashedPassword);
    console.log('Stored hash:', result.Item.password);
    
    if (result.Item.password === hashedPassword) {
      console.log('Password match! Authentication successful');
      const response = JSON.stringify({ 
        success: true, 
        user: { 
          username: result.Item.username,
          created_at: result.Item.created_at 
        }
      });
      console.log('Returning success response:', response);
      return response;
    } else {
      console.log('Password mismatch! Authentication failed');
      return JSON.stringify({ success: false, error: 'Invalid password' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return JSON.stringify({ success: false, error: 'Authentication failed' });
  }
}

async function handleGetLegacyWorkouts(event: any) {
  console.log('=== GET LEGACY WORKOUTS HANDLER START ===');
  const { userId } = event.arguments;
  console.log('Get workouts for userId:', userId);
  
  try {
    console.log('Creating DynamoDB QueryCommand...');
    const command = new QueryCommand({
      TableName: 'lifting-tracker-workouts',
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    });
    
    console.log('Sending DynamoDB query...');
    const result = await dynamoClient.send(command);
    console.log('DynamoDB query result:', JSON.stringify(result, null, 2));
    
    const workouts = result.Items?.map((item: any) => {
      console.log('Processing item sets:', typeof item.sets, item.sets);
      return {
        exercise: item.exercise,
        date: item.date,
        sets: Array.isArray(item.sets) ? item.sets : (typeof item.sets === 'string' ? JSON.parse(item.sets) : item.sets)
      };
    }) || [];
    
    console.log('Processed workouts:', workouts);
    const response = JSON.stringify({ success: true, workouts });
    console.log('Returning response:', response);
    return response;
  } catch (error) {
    console.error('Error fetching workouts:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return JSON.stringify({ success: false, error: 'Failed to fetch workouts' });
  }
}

async function handleSaveLegacyWorkout(event: any) {
  console.log('=== SAVE LEGACY WORKOUT HANDLER START ===');
  const { userId, workout } = event.arguments;
  console.log('Save workout arguments:', { userId, workout });
  
  try {
    console.log('Processing workout data...');
    const workoutData = typeof workout === 'string' ? JSON.parse(workout) : workout;
    console.log('Processed workout data:', workoutData);
    
    const workoutId = `${workoutData.exercise}#${workoutData.date}#${Date.now()}`;
    console.log('Generated workout ID:', workoutId);
    
    const command = new PutCommand({
      TableName: 'lifting-tracker-workouts',
      Item: {
        user_id: userId,
        workout_id: workoutId,
        exercise: workoutData.exercise,
        date: workoutData.date,
        sets: JSON.stringify(workoutData.sets),
        created_at: new Date().toISOString()
      }
    });
    
    console.log('Sending DynamoDB command...');
    await dynamoClient.send(command);
    console.log('DynamoDB command successful');
    
    const response = JSON.stringify({ success: true, workoutId });
    console.log('Returning success response:', response);
    return response;
  } catch (error) {
    console.error('Error saving workout:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return JSON.stringify({ success: false, error: 'Failed to save workout' });
  }
}

async function handleWorkoutRecommendations(event: any) {
  const { exerciseData, workoutHistory } = event.arguments;

  const WORKOUT_SYSTEM_PROMPT = `
  You are an expert personal trainer and strength coach. Analyze the user's workout history and current exercise data 
  to provide personalized workout recommendations. Consider progressive overload principles, exercise variations, 
  recovery needs, and proper form cues. Provide specific weight and rep recommendations based on their lifting history.
  
  Format your response as JSON with the following structure:
  {
    "recommendations": {
      "weight": number,
      "reps": number,
      "sets": number,
      "notes": "specific coaching notes and form cues",
      "progression": "guidance for next workout"
    }
  }
  `;

  // Create a conversation format for the workout recommendation
  const messages = [
    {
      role: "user",
      content: [
        {
          text: `Current Exercise: ${JSON.stringify(exerciseData)}
          
Workout History: ${JSON.stringify(workoutHistory)}

Please provide personalized recommendations for this exercise based on my history.`
        }
      ]
    }
  ];

  const input = {
    modelId: MODEL_ID,
    system: [{ text: WORKOUT_SYSTEM_PROMPT }],
    messages: messages,
    inferenceConfig: INFERENCE_CONFIG,
  } as ConverseCommandInput;

  const command = new ConverseCommand(input);
  const response = await bedrockClient.send(command);

  if (!response.output?.message) {
    throw new Error("No message in the response output");
  }

  return JSON.stringify(response.output.message);
}

async function handleAIRecommendations(event: any) {
  console.log('=== AI RECOMMENDATIONS HANDLER START ===');
  const { promptType, contextData } = event.arguments;
  console.log('Prompt type:', promptType);
  console.log('Context data:', contextData);
  console.log('Model: ', MODEL_ID)

  // Define different prompt templates based on type
  const prompts = {
    exerciseTips: `You are an expert personal trainer and strength coach. Provide specific tips and recommendations for the given exercise based on the user's workout history and current performance.
    
    Focus on:
    - Form and technique cues
    - Progressive overload suggestions
    - Weight and rep recommendations for next session
    - Common mistakes to avoid
    - Injury prevention tips
    
    Keep your response concise (2-3 short paragraphs) and actionable. Format as plain text.`,
    
    workoutPlanning: `You are a fitness expert helping plan workout routines. Analyze the provided workout data and give recommendations for optimizing the user's training program.
    
    Focus on:
    - Exercise selection and balance
    - Training frequency and volume
    - Rest and recovery recommendations
    - Progression strategies
    
    Keep your response practical and easy to follow.`,
    
    nutritionTips: `You are a sports nutritionist providing dietary advice to support strength training goals.
    
    Focus on:
    - Pre and post-workout nutrition
    - Protein and calorie recommendations
    - Hydration strategies
    - Recovery nutrition
    
    Keep advice evidence-based and practical.`
  };

  const systemPrompt = prompts[promptType as keyof typeof prompts] || prompts.exerciseTips;
  console.log('Using system prompt for type:', promptType);

  try {
    console.log('Preparing Bedrock request...');
    console.log('MODEL_ID:', MODEL_ID);
    console.log('AWS_REGION:', AWS_REGION);
    
    const textContent = typeof contextData === 'string' ? contextData : JSON.stringify(contextData);
    console.log('Text content to send:', textContent);
    
    const messages = [
      {
        role: "user",
        content: [
          {
            text: textContent
          }
        ]
      }
    ];

    const input = {
      modelId: MODEL_ID,
      system: [{ text: systemPrompt }],
      messages: messages,
      inferenceConfig: INFERENCE_CONFIG,
    } as ConverseCommandInput;

    console.log('Full Bedrock input:', JSON.stringify(input, null, 2));
    console.log('Sending request to Bedrock...');
    
    // Try InvokeModel API first as it's more widely supported
    try {
      const anthropicRequest = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        temperature: 0.5,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: textContent
          }
        ]
      };
      
      console.log('Trying InvokeModel API with request:', JSON.stringify(anthropicRequest, null, 2));
      
      const invokeCommand = new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(anthropicRequest)
      });
      
      const invokeResponse = await bedrockClient.send(invokeCommand);
      const responseBody = JSON.parse(new TextDecoder().decode(invokeResponse.body));
      console.log('InvokeModel response:', responseBody);
      
      return responseBody.content[0].text;
    } catch (invokeError) {
      console.log('InvokeModel failed, trying Converse API:', invokeError);
      
      // Fallback to Converse API
      const command = new ConverseCommand(input);
      const response = await bedrockClient.send(command);
      console.log('Received response from Bedrock');
      
      if (!response.output?.message?.content?.[0]?.text) {
        console.error('No text content in response:', JSON.stringify(response, null, 2));
        throw new Error("No text content in the response");
      }

      const result = response.output.message.content[0].text;
      console.log('AI recommendation result:', result);
      return result;
    }
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    console.error('Error details:', error instanceof Error ? error.stack : 'No stack trace');
    throw new Error('Failed to get AI recommendations');
  }
}

async function handleTravelChat(event: any) {
  const { conversation } = event.arguments;

  const TRAVEL_SYSTEM_PROMPT = `
  To create a personalized travel planning experience, greet users warmly and inquire about their travel preferences 
  such as destination, dates, budget, and interests. Based on their input, suggest tailored itineraries that include 
  popular attractions, local experiences, and hidden gems, along with accommodation options across various price 
  ranges and styles. Provide transportation recommendations, including flights and car rentals, along with estimated 
  costs and travel times. Recommend dining experiences that align with dietary needs, and share insights on local 
  customs, necessary travel documents, and packing essentials. Highlight the importance of travel insurance, offer 
  real-time updates on weather and events, and allow users to save and modify their itineraries. Additionally, 
  provide a budget tracking feature and the option to book flights and accommodations directly or through trusted 
  platforms, all while maintaining a warm and approachable tone to enhance the excitement of trip planning.
  `;

  const input = {
    modelId: MODEL_ID,
    system: [{ text: TRAVEL_SYSTEM_PROMPT }],
    messages: conversation,
    inferenceConfig: INFERENCE_CONFIG,
  } as ConverseCommandInput;

  const command = new ConverseCommand(input);
  const response = await bedrockClient.send(command);

  if (!response.output?.message) {
    throw new Error("No message in the response output");
  }

  return JSON.stringify(response.output.message);
}
