import os
import logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource

logger = logging.getLogger("dpdpa.observability")

# Global tracer reference
tracer = None

def setup_observability():
    global tracer
    try:
        # Create resource configuration
        resource = Resource(attributes={
            "service.name": "dpdpa-compliance-service",
            "service.namespace": "dpdpa"
        })
        
        provider = TracerProvider(resource=resource)
        
        # Configure OTLP Exporter if collector address is provided
        otlp_endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT")
        if otlp_endpoint:
            try:
                from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
                otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
                provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
                logger.info("OpenTelemetry OTLP gRPC Exporter configured.")
            except Exception as ex:
                logger.warning(f"Could not load OTLP gRPC Exporter, falling back: {str(ex)}")
                provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
        else:
            # Console exporter for local dev testing
            provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
            logger.info("OpenTelemetry Console Exporter configured.")
            
        trace.set_tracer_provider(provider)
        tracer = trace.get_tracer("dpdpa-tracer")
    except Exception as e:
        logger.warning(f"Failed to initialize OpenTelemetry. Operating without active tracing: {str(e)}")
        # Dummy mock fallback tracer
        tracer = trace.get_tracer("dpdpa-fallback-tracer")
    
    return tracer

def get_tracer():
    global tracer
    if tracer is None:
        return trace.get_tracer("dpdpa-default")
    return tracer
