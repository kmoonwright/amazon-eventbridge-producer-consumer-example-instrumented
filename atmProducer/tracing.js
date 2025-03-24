/*
  OpenTelemetry instrumentation for the ATM Producer
*/

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { AwsInstrumentation } = require('@opentelemetry/instrumentation-aws-sdk');

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

// Configure the SDK to use the OTLP exporter and specific instrumentation plugins
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'atm-producer',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    'aws.lambda.function_name': process.env.AWS_LAMBDA_FUNCTION_NAME || 'atm-producer-local',
  }),
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-aws-sdk': {
        enabled: true,
        suppressInternalInstrumentation: false,
      },
    }),
    new AwsInstrumentation({
      suppressInternalInstrumentation: false,
    }),
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