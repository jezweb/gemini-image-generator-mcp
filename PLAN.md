# Gemini Image Generation MCP Server Implementation Plan

## Core Functionality
Create an MCP server that generates images using Google's Vertex AI (Imagen 3 and Imagen 4) and returns them as base64 for easy integration into web projects.

## Implementation Steps

### 1. Project Setup
- Create package.json with dependencies:
  - @modelcontextprotocol/sdk
  - @google-cloud/vertexai
  - TypeScript and build tools
- Configure TypeScript for ES modules
- Set up authentication guide

### 2. MCP Server Implementation
- Single tool: `generate_image`
- Parameters:
  ```typescript
  {
    prompt: string;              // Required: Image description
    model?: "imagen-3" | "imagen-4";  // Default: "imagen-3"
    aspectRatio?: string;        // Optional: "1:1", "16:9", "9:16", etc.
    negativePrompt?: string;     // Optional: What to avoid
    numberOfImages?: number;     // Optional: 1-8, default 1
  }
  ```

### 3. Vertex AI Integration
- Use Google Cloud authentication (ADC or service account)
- Call appropriate Imagen model endpoint
- Return full quality images without resizing
- Handle API errors gracefully

### 4. Response Format
```json
{
  "content": [{
    "type": "image",
    "data": "base64_encoded_string",
    "mimeType": "image/png"
  }]
}
```

### 5. Authentication Setup
- Support GOOGLE_APPLICATION_CREDENTIALS env var
- Support Application Default Credentials
- Require GOOGLE_CLOUD_PROJECT env var

### 6. Build & Test
- TypeScript build configuration
- Test script to verify image generation
- Example usage in README

## Key Design Decisions
- No automatic resizing - return images at full Gemini quality (~2MB)
- Simple, focused API - just image generation
- Let the IDE/client handle file saving
- Support both stable (Imagen 3) and preview (Imagen 4) models

This keeps the server simple and focused on its core purpose: generating high-quality images via Gemini.