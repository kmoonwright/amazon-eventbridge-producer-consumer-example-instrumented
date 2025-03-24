# Amazon EventBridge - Producer/Consumer example with OpenTelemetry Instrumentation

This example application creates two AWS Lambda functions - a producer and a consumer. The SAM template deploys these functions, together with an EventBridge rule that determines which events are routed to the consumer.

This fork demonstrates the usage of AWS Eventbridge producers and consumers with OpenTelemetry instrumentation to send telemetry data to Honeycomb.io for observability.

The example shows how an ATM application at a bank could generate events, and the rule only passes 'approved' transactions to an event consuming application.

## Architecture

The application architecture uses:

1. AWS Lambda functions (Producer and Consumers)
2. Amazon EventBridge for event routing
3. OpenTelemetry for instrumentation
4. Honeycomb.io for telemetry analysis

```
┌────────────┐     ┌───────────────┐     ┌────────────────────┐
│            │     │               │     │                    │
│  Producer  │────▶│  EventBridge  │────▶│  Consumer (Case 1) │
│  Lambda    │     │               │     │  Approved Trans    │
│            │     │               │     │                    │
└────────────┘     │               │     └────────────────────┘
                   │               │     
                   │               │     ┌────────────────────┐
                   │               │     │                    │
                   │               │────▶│  Consumer (Case 2) │
                   │               │     │  NY Locations      │
                   │               │     │                    │
                   │               │     └────────────────────┘
                   │               │     
                   │               │     ┌────────────────────┐
                   │               │     │                    │
                   │               │────▶│  Consumer (Case 3) │
                   │               │     │  Unapproved Trans  │
                   │               │     │                    │
                   └───────────────┘     └────────────────────┘
                          │                        │
                          │                        │
                          ▼                        ▼
                   ┌──────────────────────────────────────┐
                   │                                      │
                   │    OpenTelemetry Instrumentation     │
                   │                                      │
                   └──────────────────────────────────────┘
                                      │
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │                     │
                           │    Honeycomb.io     │
                           │                     │
                           └─────────────────────┘
```

Important: this application uses various AWS services and there are costs associated with these services after the Free Tier usage - please see the [AWS Pricing page](https://aws.amazon.com/pricing/) for details. You are responsible for any AWS costs incurred. No warranty is implied in this example.

For more blogs and examples, visit [Serverless Land](https://serverlessland.com/).

```bash
.
├── README.MD                   <-- This instructions file
├── atmProducer                 <-- Source code for the producer lambda function
│   ├── handler.js              <-- Main Lambda handler
│   ├── events.js               <-- Events
│   ├── localTest.js            <-- Wrapper for local testing
│   ├── tracing.js              <-- OpenTelemetry instrumentation
│   └── package.json            <-- NodeJS dependencies and scripts
├── atmConsumer                 <-- Source code for the consumer lambda functions
│   ├── handler.js              <-- Main Lambda handlers
│   ├── localTest.js            <-- Wrapper for local testing
│   ├── tracing.js              <-- OpenTelemetry instrumentation
│   └── package.json            <-- NodeJS dependencies and scripts
└── template.yaml               <-- SAM template
```

## Requirements

* AWS CLI already configured with Administrator permission
* AWS SAM CLI [latest version](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
* [NodeJS 18.x installed](https://nodejs.org/en/download/)
* [Honeycomb.io account](https://honeycomb.io/) with an API key

## Installation Instructions

1. [Create an AWS account](https://portal.aws.amazon.com/gp/aws/developer/registration/index.html) if you do not already have one and login.

2. [Install Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) and [install the AWS Serverless Application Model CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) on your local machine.

3. Clone this repository and navigate to that directory in a terminal.

4. Install dependencies for both producer and consumer:
```
cd ./atmProducer && npm install
cd ../atmConsumer && npm install
cd ..
```

5. Create a Honeycomb.io account and get your API key from the Honeycomb dashboard.

6. Deploy the SAM template with your Honeycomb API key:
```
sam deploy --guided
```

7. During the guided deployment, you'll be prompted for:
   - Stack Name (e.g., atm-app)
   - AWS Region
   - Parameters:
     - HoneycombApiKey (your Honeycomb API key)
     - HoneycombDataset (default: atm-events)
   - Confirm other prompts

## Running the application

Once deployed, you can invoke the producer function using the AWS CLI:

```
aws lambda invoke --function-name <stack-name>-atmProducerFn-XXXXXXXXXXXX --payload '{}' response.json
```

Replace `<stack-name>` and the function identifier with the actual values from your deployment.

## Local testing

You can test the instrumented functions locally using the provided test scripts. Make sure you have a `.env` file in both the `atmProducer` and `atmConsumer` directories with your Honeycomb API key:

```
# .env file content
HONEYCOMB_API_KEY=your_api_key_here
HONEYCOMB_DATASET=atm-events
```

Then run the producer:
```
cd atmProducer
npm start
```

And to test different consumer scenarios:
```
cd atmConsumer
npm run start:approved    # Test approved transactions handler
npm run start:ny          # Test NY location transactions handler
npm run start:unapproved  # Test unapproved transactions handler
```

## Analyzing traces in Honeycomb

After running the application, you can view and analyze the traces in your Honeycomb dashboard:

1. Log in to your Honeycomb account
2. Navigate to the dataset you specified during deployment (default: atm-events)
3. Explore your traces to see the flow of events through the EventBridge system

Sample queries to try in Honeycomb:
- Filter by `service.name` to see traces from specific services
- Use `HEATMAP(duration_ms)` to visualize the latency distribution
- Group by `transaction.result` to compare approved vs. denied transactions
- Trace a specific transaction using `transaction.id`

==============================================

Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.

SPDX-License-Identifier: MIT-0
