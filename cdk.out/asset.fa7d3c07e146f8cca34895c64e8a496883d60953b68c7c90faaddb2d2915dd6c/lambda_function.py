"""
Lambda function handler for StandupDrafter
Handles status update generation and history retrieval
"""

import json
import boto3
import os
from typing import Dict, Any
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize boto3 clients
dynamodb = boto3.resource('dynamodb')
bedrock_runtime = boto3.client('bedrock-runtime')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main entry point for Lambda function
    Routes requests based on HTTP method
    
    Args:
        event: API Gateway event with httpMethod, body, queryStringParameters
        context: Lambda context object
        
    Returns:
        API Gateway response with statusCode, headers, and body
    """
    try:
        # Log incoming request
        logger.info(f"Received {event.get('httpMethod')} request")
        
        # Route based on HTTP method
        http_method = event.get('httpMethod', '')
        
        if http_method == 'POST':
            return handle_generate(event)
        elif http_method == 'GET':
            return handle_history(event)
        else:
            logger.warning(f"Method not allowed: {http_method}")
            return error_response(405, "Method not allowed")
            
    except Exception as e:
        # Top-level exception handling
        logger.error(f"Unexpected error in lambda_handler: {str(e)}", exc_info=True)
        return error_response(500, "Internal server error")


def handle_generate(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle POST /generate requests
    Generates formatted status update from user notes
    
    Args:
        event: API Gateway event containing request body with userId and notes
        
    Returns:
        Success response with statusUpdate and timestamp, or error response
    """
    # Placeholder for task 4.2
    logger.info("handle_generate called - implementation pending")
    return error_response(501, "Generate endpoint not yet implemented")


def handle_history(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle GET /history requests
    Retrieves user's update history from DynamoDB
    
    Args:
        event: API Gateway event containing query parameters with userId
        
    Returns:
        Success response with updates array, or error response
    """
    # Placeholder for task 5.3
    logger.info("handle_history called - implementation pending")
    return error_response(501, "History endpoint not yet implemented")


def error_response(status_code: int, message: str) -> Dict[str, Any]:
    """
    Generate standardized error response with CORS headers
    
    Args:
        status_code: HTTP status code
        message: Error message to return to client
        
    Returns:
        API Gateway response dict with error structure
    """
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Requested-With',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': json.dumps({
            'success': False,
            'error': message
        })
    }


def success_response(status_code: int, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate standardized success response with CORS headers
    
    Args:
        status_code: HTTP status code (typically 200)
        data: Dictionary of data to include in response
        
    Returns:
        API Gateway response dict with success structure
    """
    response_data = {'success': True}
    response_data.update(data)
    
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Requested-With',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': json.dumps(response_data)
    }
