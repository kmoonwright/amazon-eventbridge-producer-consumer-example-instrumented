/*
  OpenTelemetry instrumentation for the ATM Consumer
*/

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const HONEYCOMB_API_KEY = process.env.HONEYCOMB_API_KEY;
const HONEYCOMB_DATASET = process.env.HONEYCOMB_DATASET || 'atm-events';

// Configure the OpenTelemetry SDK to export telemetry data to Honeycomb
const traceExporter = new OTLPTraceExporter({
  url: 'https://api.honeycomb.io/v1/traces',
  headers: {
    'x-honeycomb-team': HONEYCOMB_API_KEY,
    'x-honeycomb-dataset': HONEYCOMB_DATASET
  },
});

// Create a resource that identifies this service
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'atm-consumer',
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  'aws.lambda.function_name': process.env.AWS_LAMBDA_FUNCTION_NAME || 'atm-consumer-local',
});

// Configure the SDK to use the OTLP exporter and auto-instrumentation
const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations(),
  ],
});

// Start the SDK
sdk.start();

// Gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('SDK shut down successfully'))
    .catch((error) => console.log('Error shutting down SDK', error))
    .finally(() => process.exit(0));
});

module.exports = sdk; 