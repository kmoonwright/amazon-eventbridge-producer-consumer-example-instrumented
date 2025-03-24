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

// Initialize OpenTelemetry - this needs to be done before importing AWS SDK
require('./tracing');

const { trace, context, SpanStatusCode } = require('@opentelemetry/api');
const tracer = trace.getTracer('atm-producer-tracer');

const AWS = require('aws-sdk')
AWS.config.region = process.env.AWS_REGION || 'us-east-1'
const eventbridge = new AWS.EventBridge()

exports.lambdaHandler = async (event, context) => {
  // Create a parent span for the entire handler
  return tracer.startActiveSpan('atmProducer.handler', async (span) => {
    try {
      // Add some attributes to the span for context
      span.setAttribute('lambda.name', context.functionName);
      span.setAttribute('lambda.request_id', context.awsRequestId);
      
      // Do some work and create the event...
      const { params } = require('./events.js')
      
      // Record the events we're processing in the trace
      span.setAttribute('events.count', params.Entries.length);
      params.Entries.forEach((entry, index) => {
        span.setAttribute(`event.${index}.source`, entry.Source);
        span.setAttribute(`event.${index}.type`, entry.DetailType);
        
        // Parse the JSON detail to add specific event data
        const detail = JSON.parse(entry.Detail);
        span.setAttribute(`event.${index}.action`, detail.action);
        span.setAttribute(`event.${index}.location`, detail.location);
        span.setAttribute(`event.${index}.amount`, detail.amount);
        span.setAttribute(`event.${index}.result`, detail.result);
        span.setAttribute(`event.${index}.transactionId`, detail.transactionId);
      });

      console.log('--- Params ---')
      console.log(params)
      
      // Create a child span for the EventBridge putEvents operation
      return tracer.startActiveSpan('eventbridge.putEvents', async (putEventsSpan) => {
        try {
          // Inject the current context into the AWS SDK operation
          const result = await eventbridge.putEvents(params).promise()
          
          // Record the result in the span
          putEventsSpan.setAttribute('eventbridge.entries_count', result.Entries.length);
          putEventsSpan.setAttribute('eventbridge.failed_entry_count', result.FailedEntryCount);
          
          console.log('--- Response ---')
          console.log(result)
          
          putEventsSpan.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          // Record the error in the span
          putEventsSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          });
          putEventsSpan.recordException(error);
          throw error;
        } finally {
          putEventsSpan.end();
        }
      });
    } catch (error) {
      // Record the error in the parent span
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
