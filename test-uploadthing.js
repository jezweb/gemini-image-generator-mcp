#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

// Load environment variables
const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('='))
);

async function testUploadThingGeneration() {
  console.log('Testing image generation with UploadThing storage...');
  console.log('Storage provider:', env.STORAGE_PROVIDER);
  
  const server = spawn('node', ['dist/index.js'], {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Send MCP request to generate a single image
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "generate_image",
      arguments: {
        prompt: "A beautiful sunset over mountains with vibrant colors",
        aspectRatio: "16:9",
        model: "imagen-3"
      }
    }
  };

  server.stdin.write(JSON.stringify(request) + '\n');
  server.stdin.end();

  let output = '';
  server.stdout.on('data', (data) => {
    output += data.toString();
  });

  server.stderr.on('data', (data) => {
    console.log('Server:', data.toString().trim());
  });

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      server.kill();
      reject(new Error('Test timed out after 30 seconds'));
    }, 30000);

    server.on('close', (code) => {
      try {
        console.log('\n=== Response ===');
        const response = JSON.parse(output.trim());
        
        if (response.result && response.result.content) {
          const images = response.result.content.filter(item => item.type === 'image');
          if (images.length > 0) {
            console.log('✅ Image generation with UploadThing successful!');
            console.log(`Generated ${images.length} image(s)`);
            
            // Check if we got URLs instead of base64
            images.forEach((img, index) => {
              if (img.url) {
                console.log(`Image ${index + 1} URL: ${img.url}`);
                console.log(`MIME type: ${img.mimeType}`);
              } else if (img.data) {
                console.log(`Image ${index + 1} returned as base64 (length: ${img.data.length})`);
              }
            });
            
            resolve(true);
          } else {
            console.log('❌ No images found in response');
            resolve(false);
          }
        } else if (response.result && response.result.isError) {
          console.log('❌ Error from server:', response.result.content[0].text);
          resolve(false);
        } else {
          console.log('❌ Unexpected response format');
          console.log(JSON.stringify(response, null, 2));
          resolve(false);
        }
      } catch (error) {
        console.log('❌ Failed to parse response:', error.message);
        console.log('Raw output:', output);
        resolve(false);
      }
    });
  });
}

testUploadThingGeneration().catch(console.error);