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

// Initialize OpenTelemetry - this needs to be done before any other imports
require('./tracing');

const { trace, context, SpanStatusCode } = require('@opentelemetry/api');
const tracer = trace.getTracer('atm-consumer-tracer');

// Extract EventBridge event context and create a parent span
const processEventWithTracing = async (event, spanName, handler) => {
  return tracer.startActiveSpan(spanName, async (span) => {
    try {
      // Extract context from the event
      if (event.detail) {
        // Add event attributes to the span
        span.setAttribute('eventbridge.source', event.source);
        span.setAttribute('eventbridge.detail_type', event.detail-type || event['detail-type']);
        span.setAttribute('eventbridge.id', event.id);
        span.setAttribute('eventbridge.time', event.time);
        
        // Add transaction details if available
        if (event.detail.transactionId) {
          span.setAttribute('transaction.id', event.detail.transactionId);
        }
        if (event.detail.action) {
          span.setAttribute('transaction.action', event.detail.action);
        }
        if (event.detail.location) {
          span.setAttribute('transaction.location', event.detail.location);
        }
        if (event.detail.amount) {
          span.setAttribute('transaction.amount', event.detail.amount);
        }
        if (event.detail.result) {
          span.setAttribute('transaction.result', event.detail.result);
        }
      }
      
      // Call the original handler
      const result = await handler(event);
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      // Record any errors
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
};

// The consuming service (target) Lambda functions
exports.case1Handler = async (event) => {
  return processEventWithTracing(event, 'atmConsumer.approvedTransactions', async (event) => {
    console.log('--- Approved transactions ---');
    console.log(JSON.stringify(event, null, 2));
    
    // Process approved transactions
    const transactions = Array.isArray(event.Records) 
      ? event.Records.map(record => record.body ? JSON.parse(record.body) : record)
      : [event];
      
    return { 
      processed: true, 
      transactionCount: transactions.length,
      type: 'approved'
    };
  });
};

exports.case2Handler = async (event) => {
  return processEventWithTracing(event, 'atmConsumer.NYTransactions', async (event) => {
    console.log('--- NY location transactions ---');
    console.log(JSON.stringify(event, null, 2));
    
    // Process NY location transactions
    const transactions = Array.isArray(event.Records) 
      ? event.Records.map(record => record.body ? JSON.parse(record.body) : record)
      : [event];
      
    return { 
      processed: true, 
      transactionCount: transactions.length,
      type: 'ny-location'
    };
  });
};

exports.case3Handler = async (event) => {
  return processEventWithTracing(event, 'atmConsumer.unapprovedTransactions', async (event) => {
    console.log('--- Unapproved transactions ---');
    console.log(JSON.stringify(event, null, 2));
    
    // Process unapproved transactions
    const transactions = Array.isArray(event.Records) 
      ? event.Records.map(record => record.body ? JSON.parse(record.body) : record)
      : [event];
      
    return { 
      processed: true, 
      transactionCount: transactions.length,
      type: 'unapproved'
    };
  });
};
