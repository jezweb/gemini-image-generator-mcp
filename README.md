# Gemini Image Generator MCP Server

A Model Context Protocol (MCP) server that enables image generation using Google's Imagen models (Imagen 3 and Imagen 4) through Vertex AI.

## Features

- 🎨 Generate images using Imagen 3 (stable) or Imagen 4 (preview)
- 🔧 Customizable aspect ratios, negative prompts, and batch generation
- 🚀 Fast single-image generation optimized for MCP clients
- 🔐 Secure authentication via Google Cloud credentials
- 📱 Compatible with Claude Desktop, Roo Code, and other MCP clients
- ☁️ Optional cloud storage integration (UploadThing, S3-compatible) for URL-based responses

## Prerequisites

1. **Google Cloud Project** with Vertex AI API enabled
2. **Authentication credentials** (one of):
   - Application Default Credentials (ADC)
   - Service account JSON key file
3. **Node.js** (v18 or higher)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/jezweb/gemini-image-generator-mcp.git
cd gemini-image-generator-mcp
npm install
npm run build
```

### 2. Set Up Google Cloud Authentication

#### Option A: Application Default Credentials (Recommended)
```bash
gcloud auth application-default login
```

#### Option B: Service Account Key
1. Create a service account in Google Cloud Console
2. Download the JSON key file
3. Set the environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
```

### 3. Configure Environment

Create a `.env` file:
```bash
cp .env.example .env
```

Edit `.env` with your project details:
```env
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json  # Optional if using ADC

# Optional: Cloud Storage Configuration
STORAGE_PROVIDER=none  # Options: uploadthing, s3, none (default)
# UPLOADTHING_TOKEN=your-uploadthing-token  # If using UploadThing
```

### 4. Test the Server

```bash
npm test
```

You should see:
```
✅ MCP server is working - generate_image tool found!
```

## MCP Client Configuration

### Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "gemini-image": {
      "command": "node",
      "args": ["/absolute/path/to/gemini-image-generator-mcp/dist/index.js"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-project-id",
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account-key.json"
      }
    }
  }
}
```

### Roo Code

Add to your Roo Code MCP configuration:

```json
{
  "gemini-image": {
    "command": "node",
    "args": ["/absolute/path/to/gemini-image-generator-mcp/dist/index.js"],
    "env": {
      "GOOGLE_CLOUD_PROJECT": "your-project-id",
      "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account-key.json"
    },
    "alwaysAllow": ["generate_image"],
    "timeout": 300
  }
}
```

### Other MCP Clients

The server runs on stdio and follows the MCP specification. Configure your client to:
- Command: `node`
- Args: `["/path/to/dist/index.js"]`
- Environment: Set `GOOGLE_CLOUD_PROJECT` and optionally `GOOGLE_APPLICATION_CREDENTIALS`

## Usage

The server provides a single tool: `generate_image`

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Text description of the image to generate |
| `model` | string | No | "imagen-3" (default) or "imagen-4" |
| `aspectRatio` | string | No | "1:1", "16:9", "9:16", "3:4", "4:3" |
| `negativePrompt` | string | No | What to avoid in the generated image |
| `numberOfImages` | number | No | 1-8 for Imagen 3, 1-4 for Imagen 4 (default: 1) |

### Example Usage

```typescript
// Simple image generation
{
  "prompt": "A serene mountain landscape at sunset"
}

// Advanced options
{
  "prompt": "Modern minimalist logo for a tech startup",
  "model": "imagen-4",
  "aspectRatio": "1:1",
  "negativePrompt": "text, words, letters",
  "numberOfImages": 2
}
```

## Development

### Project Structure

```
gemini-image-generator-mcp/
├── src/
│   └── index.ts          # Main MCP server implementation
├── dist/                 # Compiled JavaScript (generated)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Environment variable template
└── README.md            # This file
```

### Available Scripts

```bash
npm run build      # Compile TypeScript to JavaScript
npm run dev        # Run in development mode with tsx
npm test           # Test MCP server connectivity
npm run test-image # Test single image generation (recommended)
npm run test-single # Test single image generation (same as test-image)
npm run test-multi  # Test multiple image generation (larger response)
npm start          # Start the compiled server directly
```

### Test Files

The repository includes several test utilities:

- `test.js` - Basic MCP server connectivity test
- `test-single.js` - Single image generation test (fast, recommended)
- `test-image.js` - Multiple image generation test (stress test)
- `verify-image.js` - Utility to save and verify generated images

### Making Changes

1. Edit `src/index.ts`
2. Run `npm run build` to compile
3. Test your changes with `npm test`
4. Test image generation with `npm run test-image`
5. Restart your MCP client to pick up changes

## Troubleshooting

### Common Issues

#### 1. "GOOGLE_CLOUD_PROJECT environment variable is required"
- Ensure you've set the environment variable in your `.env` file or MCP client config
- Double-check the project ID is correct

#### 2. Authentication errors
- Verify your Google Cloud credentials are set up correctly
- Ensure the Vertex AI API is enabled in your project
- Check that your service account has the necessary permissions

#### 3. "Tool not responding" / Timeouts
- Increase the timeout in your MCP client configuration
- Try generating a single image first (default behavior)
- Check the server logs for error messages

#### 4. Large response issues
- The server defaults to 1 image to optimize response size
- Multiple images create very large responses that some clients may struggle with
- Consider generating images one at a time for better performance
- Alternatively, configure cloud storage to receive URLs instead of base64 data

### Debug Mode

To see detailed server logs, check your MCP client's console output. The server logs:
- Image generation start/completion
- Error messages
- Response statistics

### Getting Help

1. Check the [Issues](https://github.com/jezweb/gemini-image-generator-mcp/issues) page
2. Ensure you're using the latest version
3. Include error logs and your configuration when reporting issues

## Requirements

- **Node.js**: v18.0.0 or higher
- **Google Cloud Project**: With Vertex AI API enabled
- **Memory**: At least 512MB available (for processing large image responses)
- **Network**: Stable internet connection for API calls

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Cloud Storage Integration (Optional)

### Overview

By default, the server returns images as base64-encoded data. For better performance and smaller responses, you can configure cloud storage to upload images and return URLs instead.

### UploadThing Configuration

1. Create an account at [UploadThing](https://uploadthing.com)
2. Get your API token from the dashboard
3. Update your `.env` file:
```env
STORAGE_PROVIDER=uploadthing
UPLOADTHING_TOKEN=your-uploadthing-token
```

### S3-Compatible Storage (Coming Soon)

Support for S3 and S3-compatible storage (DigitalOcean Spaces, Vultr Object Storage, etc.) is planned for a future release.

### Response Format

With storage enabled, responses will include URLs:
```json
{
  "type": "image",
  "url": "https://utfs.io/f/your-image-id",
  "mimeType": "image/png"
}
```

Without storage, responses include base64 data:
```json
{
  "type": "image",
  "data": "base64...",
  "mimeType": "image/png"
}
```

## Credits

Built with:
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Google Cloud Vertex AI](https://cloud.google.com/vertex-ai)
- [Google Auth Library](https://github.com/googleapis/google-auth-library-nodejs)
- [UploadThing](https://uploadthing.com) (optional)