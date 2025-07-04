#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { GoogleAuth } from "google-auth-library";
import { createStorageProvider, type StorageConfig, type StorageProvider } from "./storage/index.js";

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const location = "us-central1";

if (!projectId) {
  console.error("Error: GOOGLE_CLOUD_PROJECT environment variable is required");
  process.exit(1);
}

// Configure storage provider
const storageConfig: StorageConfig = {
  provider: process.env.STORAGE_PROVIDER as 'uploadthing' | 's3' | 'none' || 'none',
  uploadthing: process.env.UPLOADTHING_TOKEN ? {
    token: process.env.UPLOADTHING_TOKEN
  } : undefined,
  s3: process.env.S3_BUCKET_NAME ? {
    endpoint: process.env.S3_ENDPOINT || 'https://s3.amazonaws.com',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    bucket: process.env.S3_BUCKET_NAME,
    region: process.env.S3_REGION || 'us-east-1'
  } : undefined
};

const storageProvider = createStorageProvider(storageConfig);
if (storageProvider) {
  console.error(`Storage provider configured: ${storageConfig.provider}`);
}

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

interface GenerateImageArgs {
  prompt: string;
  model?: "imagen-3" | "imagen-4";
  aspectRatio?: string;
  negativePrompt?: string;
  numberOfImages?: number;
}

interface ImageGenerationRequest {
  instances: Array<{
    prompt: string;
  }>;
  parameters: {
    sampleCount?: number;
    aspectRatio?: string;
    negativePrompt?: string;
    language?: string;
    safetyFilterLevel?: string;
    personGeneration?: string;
  };
}

interface ImageGenerationResponse {
  predictions: Array<{
    bytesBase64Encoded: string;
    mimeType: string;
  }>;
}

class GeminiImageServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "gemini-image-generation",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "generate_image",
          description: "Generate images using Google's Imagen models via Vertex AI",
          inputSchema: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "Text description of the image to generate",
              },
              model: {
                type: "string",
                enum: ["imagen-3", "imagen-4"],
                description: "Which Imagen model to use (default: imagen-3)",
              },
              aspectRatio: {
                type: "string",
                description: "Aspect ratio (e.g., '1:1', '16:9', '9:16', '3:4', '4:3')",
              },
              negativePrompt: {
                type: "string",
                description: "What to avoid in the generated image",
              },
              numberOfImages: {
                type: "number",
                minimum: 1,
                maximum: 4,
                description: "Number of images to generate (1-4 for Imagen 4, 1-8 for Imagen 3)",
              },
            },
            required: ["prompt"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "generate_image") {
        const args = request.params.arguments as unknown as GenerateImageArgs;
        return await this.generateImage(args);
      }
      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  private async generateImage(args: GenerateImageArgs) {
    try {
      console.error("Starting image generation:", args.prompt);
      
      const modelName = args.model === "imagen-4" 
        ? "imagen-4.0-generate-preview-06-06"
        : "imagen-3.0-generate-001";

      const authClient = await auth.getClient();
      const accessToken = await authClient.getAccessToken();

      if (!accessToken.token) {
        throw new Error("Failed to obtain access token");
      }

      const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelName}:predict`;

      const requestData: ImageGenerationRequest = {
        instances: [
          {
            prompt: args.prompt,
          },
        ],
        parameters: {
          language: "en",
          safetyFilterLevel: "block_some",
          personGeneration: "allow_adult",
          sampleCount: args.numberOfImages || 1, // Default to 1 image to reduce response size
          ...(args.negativePrompt && { negativePrompt: args.negativePrompt }),
          ...(args.aspectRatio && { aspectRatio: args.aspectRatio }),
        },
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = (await response.json()) as ImageGenerationResponse;
      console.error("API response received, predictions count:", result.predictions?.length || 0);

      if (!result.predictions || result.predictions.length === 0) {
        console.error("No predictions in response:", JSON.stringify(result, null, 2));
        throw new Error("No images generated");
      }

      // Process images - either upload to storage or return base64
      const processedImages = await Promise.all(
        result.predictions.map(async (prediction, index) => {
          const mimeType = prediction.mimeType || "image/png";
          const extension = mimeType.split('/')[1] || 'png';
          const fileName = `imagen-${Date.now()}-${index}.${extension}`;
          
          if (storageProvider) {
            try {
              // Convert base64 to buffer for upload
              const buffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
              const uploadResult = await storageProvider.upload(buffer, fileName, mimeType);
              
              console.error(`Uploaded image ${index + 1} to storage: ${uploadResult.url}`);
              
              return {
                type: "image" as const,
                url: uploadResult.url,
                mimeType: mimeType,
              };
            } catch (uploadError) {
              console.error(`Failed to upload image ${index + 1}:`, uploadError);
              // Fallback to base64 on upload failure
              return {
                type: "image" as const,
                data: prediction.bytesBase64Encoded,
                mimeType: mimeType,
              };
            }
          } else {
            // No storage provider, return base64 as before
            return {
              type: "image" as const,
              data: prediction.bytesBase64Encoded,
              mimeType: mimeType,
            };
          }
        })
      );

      console.error(`Generated ${processedImages.length} image(s) successfully`);
      
      return {
        content: processedImages,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error generating image:", errorMessage);
      console.error("Full error:", error);
      
      return {
        content: [
          {
            type: "text",
            text: `Error generating image: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Gemini Image Generation MCP server running on stdio");
  }
}

const server = new GeminiImageServer();
server.run().catch(console.error);