import { UTApi } from 'uploadthing/server';

const token = 'eyJhcGlLZXkiOiJza19saXZlX2IwY2NiOWQ5ZGUwMWEyYTM1NGVlYjZhNzBjNTdmNjUyNjQ0OTRjOWE1ZDc1ZmUxNmNiZjgyN2IxNWVmNjE1NzQiLCJhcHBJZCI6Ind4eGUxMHM4bXUiLCJyZWdpb25zIjpbInNlYTEiXX0=';

async function testDirect() {
  try {
    console.log('Testing UploadThing with token:', token);
    
    const utapi = new UTApi({ token });
    
    // Create a simple test file
    const content = 'Hello, UploadThing!';
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'test.txt', { type: 'text/plain' });
    
    console.log('Uploading file...');
    const response = await utapi.uploadFiles(file);
    
    console.log('Response:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

testDirect();