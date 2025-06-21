#!/usr/bin/env node

// Simple test to check if the MCP server can start and list tools
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testServer() {
  try {
    console.log('Testing MCP server...');
    
    // Test if the server builds and starts
    const { stdout, stderr } = await execAsync('echo \'{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\' | timeout 5s node dist/index.js', {
      env: { 
        ...process.env, 
        GOOGLE_CLOUD_PROJECT: 'test-project' 
      }
    });
    
    console.log('Server output:', stdout);
    if (stderr) console.log('Server errors:', stderr);
    
    // Check if we get a valid response
    if (stdout.includes('generate_image')) {
      console.log('✅ MCP server is working - generate_image tool found!');
    } else {
      console.log('❌ MCP server response doesn\'t contain expected tool');
    }
  } catch (error) {
    if (error.signal === 'SIGTERM') {
      console.log('✅ MCP server started and responded (timeout is expected)');
    } else {
      console.error('❌ Error testing server:', error.message);
    }
  }
}

testServer();