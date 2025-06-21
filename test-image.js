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

async function testImageGeneration() {
  console.log('Testing image generation with Imagen...');
  
  const server = spawn('node', ['dist/index.js'], {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Send MCP request to generate an image
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "generate_image",
      arguments: {
        prompt: "A simple red circle on white background",
        model: "imagen-3",
        aspectRatio: "1:1"
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
    console.log('Server stderr:', data.toString());
  });

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      server.kill();
      reject(new Error('Test timed out after 30 seconds'));
    }, 30000);

    server.on('close', (code) => {
      try {
        console.log('Raw output:', output);
        const response = JSON.parse(output.trim());
        
        if (response.result && response.result.content) {
          const images = response.result.content.filter(item => item.type === 'image');
          if (images.length > 0) {
            console.log('✅ Image generation successful!');
            console.log(`Generated ${images.length} image(s)`);
            console.log(`First image MIME type: ${images[0].mimeType}`);
            console.log(`First image data length: ${images[0].data.length} characters`);
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
          resolve(false);
        }
      } catch (error) {
        console.log('❌ Failed to parse response:', error.message);
        resolve(false);
      }
    });
  });
}

testImageGeneration().catch(console.error);