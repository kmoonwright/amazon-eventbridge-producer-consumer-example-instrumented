/*
  Local test script for ATM Consumer handlers with OpenTelemetry instrumentation
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

// Import the handlers from the handler.js file
const { case1Handler, case2Handler, case3Handler } = require('./handler');

// Check for the Honeycomb API key
if (!process.env.HONEYCOMB_API_KEY) {
  console.error('Error: HONEYCOMB_API_KEY environment variable is required');
  console.error('Please set it in your environment or create a .env file with this variable');
  process.exit(1);
}

// Emulate an EventBridge event for testing
const sampleEvent = {
  version: '0',
  id: '12345678-1234-1234-1234-123456789012',
  'detail-type': 'transaction',
  source: 'custom.myATMapp',
  account: '123456789012',
  time: new Date().toISOString(),
  region: 'us-east-1',
  resources: [],
  detail: {
    action: 'withdrawal',
    location: 'NY-NYC-001',
    amount: 300,
    result: 'approved',
    transactionId: '123456',
    cardPresent: true,
    partnerBank: 'Example Bank',
    remainingFunds: 722.34
  }
};

// Emulate the Lambda context
const context = {
  awsRequestId: '67890-request',
  functionName: 'atmConsumer-local',
  functionVersion: 'local',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:atmConsumer-local',
  getRemainingTimeInMillis: () => 30000,
  // These three are deprecated in Node 18
  callbackWaitsForEmptyEventLoop: true,
  logGroupName: '/aws/lambda/atmConsumer-local',
  logStreamName: '2021/01/01/[$LATEST]67890'
};

// Get command line arguments to determine which handler to test
const args = process.argv.slice(2);
const handlerToTest = args[0] || 'case1'; // Default to case1Handler if not specified

console.log('Starting local test with OpenTelemetry instrumentation...');
console.log(`Testing ${handlerToTest} handler`);
console.log(`Sending traces to Honeycomb dataset: ${process.env.HONEYCOMB_DATASET || 'atm-events'}`);

// Select the appropriate handler based on command line argument
let handlerFn;
if (handlerToTest === 'case1' || handlerToTest === 'approved') {
  handlerFn = case1Handler;
  console.log('Testing approved transactions handler');
} else if (handlerToTest === 'case2' || handlerToTest === 'ny') {
  handlerFn = case2Handler;
  console.log('Testing NY location transactions handler');
} else if (handlerToTest === 'case3' || handlerToTest === 'unapproved') {
  handlerFn = case3Handler;
  console.log('Testing unapproved transactions handler');
  // Change the event for unapproved test
  sampleEvent.detail.result = 'denied';
} else {
  console.error(`Unknown handler: ${handlerToTest}`);
  console.error('Valid options: case1/approved, case2/ny, case3/unapproved');
  process.exit(1);
}

// Call the handler and handle the promise
handlerFn(sampleEvent, context)
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