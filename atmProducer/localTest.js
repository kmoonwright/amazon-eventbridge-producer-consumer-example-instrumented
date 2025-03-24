/*
  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
  Permission is hereby granted, free of charge, to any person obtaining a copy of this
  software and associated documentation files (the "Software"), to deal in the Software
  without restriction, including without limitation the rights to use, copy, modify,
  merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
  INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
  PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// Initialize OpenTelemetry before importing handler
require('./tracing');

// Load environment variables from .env file if exists
try {
  require('dotenv').config();
} catch (e) {
  // .env file doesn't exist or dotenv not installed - using environment variables directly
  console.log('dotenv not loaded, make sure HONEYCOMB_API_KEY is set in the environment');
}

// This is a local wrapper - for local testing only
// It emulates the Lambda environment by creating a context object and calling the handler
// with the event

const { lambdaHandler } = require('./handler');

// Check for the Honeycomb API key
if (!process.env.HONEYCOMB_API_KEY) {
  console.error('Error: HONEYCOMB_API_KEY environment variable is required');
  console.error('Please set it in your environment or create a .env file with this variable');
  process.exit(1);
}

const context = {
  awsRequestId: '12345-request',
  functionName: 'atmProducer-local',
  functionVersion: 'local',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:atmProducer-local',
  getRemainingTimeInMillis: () => 30000,
  // These three are deprecated in Node 18
  callbackWaitsForEmptyEventLoop: true,
  logGroupName: '/aws/lambda/atmProducer-local',
  logStreamName: '2021/01/01/[$LATEST]12345'
};

// Call the handler and handle the promise
console.log('Starting local test with OpenTelemetry instrumentation...');
console.log(`Sending traces to Honeycomb dataset: ${process.env.HONEYCOMB_DATASET || 'atm-events'}`);

lambdaHandler({}, context)
  .then(result => {
    console.log('Lambda executed successfully');
    console.log(result);
    // Allow time for traces to be exported
    setTimeout(() => {
      console.log('Exiting after waiting for trace export');
      process.exit(0);
    }, 2000);
  })
  .catch(err => {
    console.error('Lambda execution failed');
    console.error(err);
    process.exit(1);
  });
